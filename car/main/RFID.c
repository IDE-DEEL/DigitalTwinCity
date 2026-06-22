/*
 * RFID.c  —  PN532 wrapper using garag/esp-idf-pn532 component
 */

#include "rfid.h"
#include "config.h"

#include <string.h>

#include "esp_log.h"
#include "driver/gpio.h"
#include "pn532.h"
#include "pn532_driver.h"
#include "pn532_driver_spi.h"

static const char *TAG = "RFID";

static pn532_io_t s_pn532;
static bool s_driver_created = false;
static bool s_ready = false;

/**
 * @brief Initialize the SPI bus and the connected PN532 scanner IC.
 * 
 * @return esp_err_t ESP_OK to indicate the PN532 initialization was successful.
 */
esp_err_t rfid_init(void)
{
    if (s_ready) {
        return ESP_OK;
    }

    if (s_driver_created) {
        pn532_release(&s_pn532);
        pn532_delete_driver(&s_pn532);
        s_driver_created = false;
    }

    esp_err_t err = pn532_new_driver_spi(
        RFID_GPIO_MISO,
        RFID_GPIO_MOSI,
        RFID_GPIO_SCK,
        RFID_GPIO_CS,   /* SS pin */
        RFID_GPIO_RST,
        GPIO_NUM_NC,
        RFID_SPI_HOST,
        RFID_SPI_CLOCK_HZ,
        &s_pn532);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "pn532_new_driver_spi failed: %s", esp_err_to_name(err));
        return err;
    }
    s_driver_created = true;

    err = pn532_init(&s_pn532);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "pn532_init failed: %s", esp_err_to_name(err));
        pn532_release(&s_pn532);
        pn532_delete_driver(&s_pn532);
        s_driver_created = false;
        return err;
    }

    uint32_t fw = 0;
    err = pn532_get_firmware_version(&s_pn532, &fw);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "pn532_get_firmware_version failed: %s", esp_err_to_name(err));
        pn532_release(&s_pn532);
        pn532_delete_driver(&s_pn532);
        s_driver_created = false;
        return err;
    }

    err = pn532_set_passive_activation_retries(&s_pn532, 0xFF);
    if (err != ESP_OK) {
        ESP_LOGW(TAG, "pn532_set_passive_activation_retries failed: %s", esp_err_to_name(err));
    }

    ESP_LOGI(TAG, "PN532 ready (chip=PN5%X fw=%u.%u SS=%d RST=%d SCK=%d)",
             (unsigned)((fw >> 24) & 0xFF),
             (unsigned)((fw >> 16) & 0xFF),
             (unsigned)((fw >> 8) & 0xFF),
             RFID_GPIO_CS, RFID_GPIO_RST, RFID_GPIO_SCK);

    s_ready = true;
    return ESP_OK;
}

/**
 * @brief Continually probe the scanner's RF field waiting for an ISO14443A tag to fall into threshold range.
 * 
 * @param uid Extracted UID bytes stream response.
 * @param uid_len Literal integer detailing length of the UID block sequence.
 * @param sak Tag Type resolution identifier. 
 * @return true Tag found and processed successfully.
 * @return false No tag present or failed reading.
 */
bool rfid_poll_card(uint8_t *uid, uint8_t *uid_len, uint8_t *sak)
{
    if (!s_ready || uid == NULL || uid_len == NULL || sak == NULL) {
        return false;
    }

    uint8_t local_uid_len = 0;
    esp_err_t err = pn532_read_passive_target_id(
        &s_pn532,
        PN532_BRTY_ISO14443A_106KBPS,
        uid,
        &local_uid_len,
        0);

    if (err != ESP_OK) {
        return false;
    }

    *uid_len = local_uid_len;
    *sak = 0x00; /* Not exposed by this high-level component API. */
    return true;
}
