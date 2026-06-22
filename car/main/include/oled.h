#pragma once

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include "mqtt.h"

/**
 * @brief Initialize the OLED display, I2C bus (if necessary), and start LVGL tasks.
 * 
 * Note: If the I2C bus is already initialized by another component, you will need to
 * pass the i2c_master_bus_handle_t to this function or fetch it globally. This example
 * creates a new I2C bus instance following the provided code.
 */
void oled_init(void);

/**
 * @brief FreeRTOS task responsible for running the LVGL tick and handler loop.
 * 
 * @param arg Pointer to task arguments.
 */
void task_lvgl_port(void *arg);

/**
 * @brief Updates the OLED screen to display a specific UI status state, like loading or delivering.
 * 
 * @param status The target ScreenStatus enum to show.
 * @param package_inout Quantity of packages.
 * @param transfer_duration_ms Delay time mapping (used for progress bar).
 */
void screen_update(enum ScreenStatus status, uint8_t package_inout, uint32_t transfer_duration_ms);

/**
 * @brief Updates the battery percentage icon on the OLED screen.
 * 
 * @param battery_percent Current battery range (0-100%).
 */
void screen_update_battery(uint8_t battery_percent);

#ifdef __cplusplus
}
#endif