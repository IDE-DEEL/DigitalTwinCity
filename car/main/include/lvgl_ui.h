#ifndef LVGL_UI_H
#define LVGL_UI_H

#include "lvgl.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize the LVGL UI demonstration/base layout.
 * 
 * @param disp Pointer to the LVGL display object.
 */
void lvgl_demo_ui(lv_display_t *disp);

/**
 * @brief Updates the delivery status parameters on the UI.
 * 
 * @param status The current screen status to display.
 * @param package_inout Number of packages to load/unload.
 * @param transfer_duration_ms Expected duration of the transfer in milliseconds.
 * @param battery_percent Current battery percentage (0-100).
 */
void delivery_ui_set_status(uint8_t status, uint8_t package_inout, uint32_t transfer_duration_ms, uint8_t battery_percent);

/**
 * @brief Updates just the battery indicator on the UI.
 * 
 * @param battery_percent Current battery percentage (0-100).
 */
void delivery_ui_update_battery(uint8_t battery_percent);

#ifdef __cplusplus
}
#endif

#endif /* LVGL_UI_H */
