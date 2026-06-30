/*
 * rfid.h  —  PN532 RFID reader public API
 *
 * Supports ISO 14443A cards (MIFARE Classic, Ultralight, etc.) using
 * the PN532 module over SPI.
 *
 * Usage:
 *   rfid_init();                              // once at startup
 *   uint8_t uid[10]; uint8_t uid_len, sak;
 *   if (rfid_poll_card(uid, &uid_len, &sak))  // call periodically
 *       // a new card was found; uid/uid_len/sak are populated
 *
 * Pin assignments come from config.h  (RFID_GPIO_* and RFID_SPI_HOST).
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

/**
 * @brief Initialise the SPI bus, add the PN532 device, and bring the chip
 *        out of reset. Must be called before rfid_poll_card().
 * 
 * @return esp_err_t ESP_OK if PN532 startup succeeds via esp-idf-pn532 component.
 */
esp_err_t rfid_init(void);

/**
 * @brief Check for a card in the RF field, run anti-collision and select it.
 *        Polling is done through InListPassiveTarget. Repeated calls return
 *        true while the same card remains present in the RF field.
 * 
 * @param uid Buffer to receive the card UID (must be at least 10 bytes).
 * @param uid_len Output: actual UID length in bytes (4, 7, or 10).
 * @param sak Output: not provided by this wrapper (typically set to 0x00).
 * @return true When a card was successfully read.
 * @return false When no card is in the field (or a communication error occurs).
 */
bool rfid_poll_card(uint8_t *uid, uint8_t *uid_len, uint8_t *sak);
