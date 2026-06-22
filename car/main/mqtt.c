#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "esp_log.h"
#include "mqtt_client.h"
#include "esp_crt_bundle.h"
#include "oled.h"    
#include "motor_driver.h"

#include "mqtt.h"

static const char *TAG = "mqtt";

/* -------------------------------------------------------------------------- */
/* MQTT client                                                               */
/* -------------------------------------------------------------------------- */

static esp_mqtt_client_handle_t mqtt_client;

/* -------------------------------------------------------------------------- */
/* State                                                                   */
/* -------------------------------------------------------------------------- */

static receive_msg_t rx = {0};

typedef struct {
    char RFID_UID[32];
    uint8_t battery_percentage;
    bool is_charging;
    uint8_t set_speed;
    uint32_t timestamp;
    bool lost;
    uint8_t PID_error;
} transmit_msg_t;

static transmit_msg_t tx = {0};

/* -------------------------------------------------------------------------- */
/* Dirty flags                                                             */
/* -------------------------------------------------------------------------- */

typedef struct {
    bool rfid;
    bool battery;
    bool charging;
    bool speed;
    bool timestamp;
    bool lost;
    bool pid;
} tx_dirty_t;

static tx_dirty_t dirty = {0};

/* -------------------------------------------------------------------------- */
/* Topic base                                                             */
/* -------------------------------------------------------------------------- */

static char topic_base[64];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                */
/* -------------------------------------------------------------------------- */

static void set_u8(uint8_t *field, uint8_t v, bool *flag)
{
    if (*field != v)
    {
        *field = v;
        *flag = true;
    }
}

static void set_bool(bool *field, bool v, bool *flag)
{
    if (*field != v)
    {
        *field = v;
        *flag = true;
    }
}

static void set_str(char *field, const char *v, size_t len, bool *flag)
{
    if (strncmp(field, v, len) != 0)
    {
        strncpy(field, v, len - 1);
        field[len - 1] = 0;
        *flag = true;
    }
}

/* -------------------------------------------------------------------------- */
/* AUTO-GENERATED SETTERS                                                   */
/* -------------------------------------------------------------------------- */

void mqtt_set_rfid(const char *uid)
{
    set_str(tx.RFID_UID, uid, sizeof(tx.RFID_UID), &dirty.rfid);
}

#define GEN_U8(name, field, flag) \
    void mqtt_set_##name(uint8_t v) { set_u8(&tx.field, v, &dirty.flag); }

#define GEN_BOOL(name, field, flag) \
    void mqtt_set_##name(bool v) { set_bool(&tx.field, v, &dirty.flag); }

GEN_U8(battery, battery_percentage, battery)
GEN_U8(speed, set_speed, speed)
GEN_U8(pid, PID_error, pid)

GEN_BOOL(charging, is_charging, charging)
GEN_BOOL(lost, lost, lost)

/* -------------------------------------------------------------------------- */
/* MQTT publish                                                             */
/* -------------------------------------------------------------------------- */

static void mqtt_pub(const char *topic, const char *payload)
{
    if (!mqtt_client) return;

    esp_mqtt_client_publish(mqtt_client, topic, payload, 0, 1, 0);
}

/* -------------------------------------------------------------------------- */
/* RX handler                                                              */
/* -------------------------------------------------------------------------- */

static void handle_rx(const char *topic, const char *data)
{
    const char *suffix = topic + strlen(topic_base);

    if (strcmp(suffix, "cmd/Direction") == 0)
    {
        rx.direction = (Direction)atoi(data);
    }
    else if (strcmp(suffix, "cmd/Speed") == 0)
    {
        rx.speed = (uint8_t)atoi(data);
        motor_set_speed(rx.speed);
    }
    else if (strcmp(suffix, "cmd/Start") == 0)
    {
        rx.stop = !(strcasecmp(data, "true") == 0 || strcmp(data, "1") == 0 || strcasecmp(data, "True") == 0);
        if (rx.stop) {
            motor_enable(false);
            motor_set_speed(0);
            servo_enable(false);
        } else {
            motor_enable(true);
            motor_set_speed(rx.speed);
            servo_enable(true);
        }
    }
    else if (strcmp(suffix, "cmd/Screen") == 0)
    {
        rx.screen_status = (ScreenStatus)atoi(data);
        screen_update(rx.screen_status, rx.package_inout, rx.transfer_duration_ms);

    }
    else if (strcmp(suffix, "cmd/SpecialTag") == 0)
    {
        rx.special_tag = (uint8_t)atoi(data);
    }
    else if (strcmp(suffix, "cmd/Package") == 0)
    {
        rx.package_inout = (uint8_t)atoi(data);
    }
    else if (strcmp(suffix, "cmd/TransferTime") == 0)
    {
        rx.transfer_duration_ms = (uint32_t)atoi(data);
    }
}

/* -------------------------------------------------------------------------- */
/* TX publish per field                                                     */
/* -------------------------------------------------------------------------- */

static void publish_dirty(void)
{
    char topic[128];
    char payload[64];

    if (dirty.rfid)
    {
        snprintf(topic, sizeof(topic), "%sdata/LastRFID", topic_base);
        mqtt_pub(topic, tx.RFID_UID);
        dirty.rfid = false;
    }

    if (dirty.battery)
    {
        snprintf(topic, sizeof(topic), "%sdata/battery", topic_base);
        snprintf(payload, sizeof(payload), "%u", tx.battery_percentage);
        mqtt_pub(topic, payload);
        dirty.battery = false;
    }

    if (dirty.charging)
    {
        snprintf(topic, sizeof(topic), "%sdata/charging", topic_base);
        mqtt_pub(topic, tx.is_charging ? "true" : "false");
        dirty.charging = false;
    }

    if (dirty.speed)
    {
        snprintf(topic, sizeof(topic), "%sdata/speed", topic_base);
        snprintf(payload, sizeof(payload), "%u", tx.set_speed);
        mqtt_pub(topic, payload);
        dirty.speed = false;
    }

    if (dirty.lost)
    {
        snprintf(topic, sizeof(topic), "%sdata/lost", topic_base);
        mqtt_pub(topic, tx.lost ? "true" : "false");
        dirty.lost = false;
    }

    if (dirty.pid)
    {
        snprintf(topic, sizeof(topic), "%sdata/pid", topic_base);
        snprintf(payload, sizeof(payload), "%u", tx.PID_error);
        mqtt_pub(topic, payload);
        dirty.pid = false;
    }
}

/* -------------------------------------------------------------------------- */
/* MQTT event handler                                                      */
/* -------------------------------------------------------------------------- */

static void mqtt_event_handler(void *arg,
                               esp_event_base_t base,
                               int32_t event_id,
                               void *event_data)
{
    esp_mqtt_event_handle_t event = event_data;

    switch ((esp_mqtt_event_id_t)event_id)
    {
    case MQTT_EVENT_CONNECTED:
    {
        ESP_LOGI(TAG, "connected");

        snprintf(topic_base, sizeof(topic_base),
                 "car/%s/",
                 CONFIG_CAR_NAME);

        char topic[128];
        snprintf(topic, sizeof(topic), "%scmd/#", topic_base);

        esp_mqtt_client_subscribe(mqtt_client, topic, 1);
        break;
    }

    case MQTT_EVENT_DATA:
    {
        char topic[256];
        char data[256];

        snprintf(topic, sizeof(topic), "%.*s", event->topic_len, event->topic);
        snprintf(data, sizeof(data), "%.*s", event->data_len, event->data);

        if (strncmp(topic, topic_base, strlen(topic_base)) == 0)
        {
            handle_rx(topic, data);
        }
        break;
    }

    default:
        break;
    }
}

/* -------------------------------------------------------------------------- */
/* Start MQTT                                                              */
/* -------------------------------------------------------------------------- */

void mqtt_app_start(void)
{
    esp_mqtt_client_config_t cfg = {
        .broker.address.uri = CONFIG_MQTT_ADDRESS,
        .credentials = {
            .username = CONFIG_CAR_NAME,
            .authentication.password = CONFIG_MQTT_PASSWORD,
        },
        .broker.verification.crt_bundle_attach = esp_crt_bundle_attach,
    };

    mqtt_client = esp_mqtt_client_init(&cfg);

    esp_mqtt_client_register_event(
        mqtt_client,
        ESP_EVENT_ANY_ID,
        mqtt_event_handler,
        NULL);

    esp_mqtt_client_start(mqtt_client);
    rx.direction = 2;
    rx.stop = true;
    rx.speed = 1;
    
    ESP_LOGI(TAG, "MQTT started");
}

/* -------------------------------------------------------------------------- */
/* TX task                                                                 */
/* -------------------------------------------------------------------------- */

void mqtt_task(void *arg)
{
    while (1)
    {
        publish_dirty();
        vTaskDelay(pdMS_TO_TICKS(20));
    }
}

const receive_msg_t* mqtt_get_rx(void)
{
    return &rx;
}