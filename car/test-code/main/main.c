#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include <stdlib.h>
#include <time.h>

#include "freertos/FreeRTOS.h"
#include "freertos/event_groups.h"
#include "freertos/task.h"

#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "nvs_flash.h"

#include "esp_wifi.h"

#include "mqtt_client.h"
#include "esp_crt_bundle.h"
#include "driver/gpio.h"

static const char *TAG = "wifi_mqtt_counter";

/* Wi-Fi credentials */
#define WIFI_SSID      "iotroam"
#define WIFI_PASSWORD  "vRYf084TPh"
#define WIFI_MAXIMUM_RETRY  10

/* MQTT settings (from your screenshot: ws:// digitaltwin.duckdns.org /mqtt) */
#define MQTT_URI   "wss://digitaltwin.duckdns.org/mqtt"
#define MQTT_TOPIC "car/auto_A/a"
#define MQTT_USERNAME "auto_A"
#define MQTT_PASSWORD "jZCnjpSK@F8b&pPSbdoW"

/* Event bits */
static EventGroupHandle_t s_event_group;
#define BUTTON_GPIO 0
#define WIFI_CONNECTED_BIT BIT0
#define WIFI_FAIL_BIT      BIT1
#define MQTT_CONNECTED_BIT BIT2

static int s_retry_num = 0;
static esp_mqtt_client_handle_t s_mqtt = NULL;

/* ---------- Wi-Fi event handler ---------- */
static void wifi_event_handler(void *arg,
                               esp_event_base_t event_base,
                               int32_t event_id,
                               void *event_data)
{
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();

    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        if (s_retry_num < WIFI_MAXIMUM_RETRY) {
            s_retry_num++;
            ESP_LOGW(TAG, "Wi-Fi disconnected. Retrying (%d/%d)...", s_retry_num, WIFI_MAXIMUM_RETRY);
            esp_wifi_connect();
        } else {
            xEventGroupSetBits(s_event_group, WIFI_FAIL_BIT);
        }

    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Got IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_retry_num = 0;
        xEventGroupSetBits(s_event_group, WIFI_CONNECTED_BIT);
    }
}

/* ---------- MQTT event handler ---------- */
static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data)
{
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;

    switch ((esp_mqtt_event_id_t)event_id) {
    case MQTT_EVENT_CONNECTED:
        ESP_LOGI(TAG, "MQTT connected");
        xEventGroupSetBits(s_event_group, MQTT_CONNECTED_BIT);
        break;

    case MQTT_EVENT_DISCONNECTED:
        ESP_LOGW(TAG, "MQTT disconnected");
        xEventGroupClearBits(s_event_group, MQTT_CONNECTED_BIT);
        break;

    case MQTT_EVENT_ERROR:
        ESP_LOGE(TAG, "MQTT error");
        break;

    default:
        break;
    }
}

static void wifi_init_sta(void)
{
    s_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL));
    ESP_ERROR_CHECK(esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL));

    wifi_config_t wifi_config = {
        .sta = {
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
        },
    };

    strncpy((char *)wifi_config.sta.ssid, WIFI_SSID, sizeof(wifi_config.sta.ssid));
    strncpy((char *)wifi_config.sta.password, WIFI_PASSWORD, sizeof(wifi_config.sta.password));

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    ESP_ERROR_CHECK(esp_wifi_start());

    ESP_LOGI(TAG, "Wi-Fi started. Connecting to SSID: %s", WIFI_SSID);

    EventBits_t bits = xEventGroupWaitBits(
        s_event_group,
        WIFI_CONNECTED_BIT | WIFI_FAIL_BIT,
        pdFALSE,
        pdFALSE,
        portMAX_DELAY
    );

    if (bits & WIFI_CONNECTED_BIT) {
        ESP_LOGI(TAG, "Wi-Fi connected");
    } else {
        ESP_LOGE(TAG, "Wi-Fi failed");
    }
}

static void mqtt_start(void)
{
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_URI,
        .credentials = {
            .username = MQTT_USERNAME,
            .authentication.password = MQTT_PASSWORD,
        },
        // Use ESP-IDF certificate bundle (verifies server cert against known CAs)
        .broker.verification.crt_bundle_attach = esp_crt_bundle_attach,
    };

    s_mqtt = esp_mqtt_client_init(&mqtt_cfg);
    ESP_ERROR_CHECK(esp_mqtt_client_register_event(s_mqtt, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL));
    ESP_ERROR_CHECK(esp_mqtt_client_start(s_mqtt));
}

/* Task that publishes an increasing counter */
static void publisher_task(void *arg)
{
    srand((unsigned) time(NULL)); // Seed the random number generator
    char payload[64];

    /* Configure the button GPIO */
    gpio_config_t io_conf = {
        .pin_bit_mask = 1ULL << BUTTON_GPIO,
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE
    };
    gpio_config(&io_conf);

    /* Wait for MQTT connection */
    xEventGroupWaitBits(s_event_group, MQTT_CONNECTED_BIT, pdFALSE, pdTRUE, portMAX_DELAY);

    while (1) {
        if (gpio_get_level(BUTTON_GPIO) == 0) { // Check if button is pressed
            vTaskDelay(pdMS_TO_TICKS(50)); // Small debounce delay
            if (gpio_get_level(BUTTON_GPIO) == 0) { // Confirm button press
                float random_x = ((float)rand() / RAND_MAX) * 5.0f; // Random float between 0.00 and 5.00
                float random_y = ((float)rand() / RAND_MAX) * 5.0f; // Random float between 0.00 and 5.00
                float random_rotation = ((float)rand() / RAND_MAX) * 5.0f; // Random float between 0.00 and 5.00

                snprintf(payload, sizeof(payload), "{\"x\":%.2f,\"y\":%.2f,\"rotation\":%.2f}", random_x, random_y, random_rotation);

                int msg_id = esp_mqtt_client_publish(s_mqtt, MQTT_TOPIC, payload, 0, 1, 0);
                ESP_LOGI(TAG, "Published to %s: %s (msg_id=%d)", MQTT_TOPIC, payload, msg_id);
            }
        }

        vTaskDelay(pdMS_TO_TICKS(100)); // Debounce delay
    }
}

void app_main(void)
{
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    }

    wifi_init_sta();
    mqtt_start();

    xTaskCreate(publisher_task, "publisher_task", 4096, NULL, 5, NULL);
}

