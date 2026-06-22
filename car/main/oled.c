#include "oled.h"
#include "config.h"
#include "lvgl_ui.h"

#include <stdio.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/lock.h>
#include <sys/param.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_timer.h"
#include "esp_lcd_panel_io.h"
#include "esp_lcd_panel_ops.h"
#include "esp_err.h"
#include "esp_log.h"
#include "driver/i2c_master.h"
#include "lvgl.h"
#include "esp_lcd_panel_vendor.h"
#include "mqtt.h"
#include "Sense.h"

extern i2c_master_bus_handle_t g_i2c_bus_handle;

static const char *TAG = "oled";

static uint8_t oled_buffer[OLED_LCD_H_RES * OLED_LCD_V_RES / 8];
static _lock_t lvgl_api_lock;
static esp_lcd_panel_io_handle_t s_io_handle;

/* -------------------------------------------------------------------------
 * Display callbacks and driver definitions
 * ------------------------------------------------------------------------- */
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
static bool example_notify_lvgl_flush_ready(esp_lcd_panel_io_handle_t io_panel, esp_lcd_panel_io_event_data_t *edata, void *user_ctx)
{
    lv_display_t *disp = (lv_display_t *)user_ctx;
    lv_display_flush_ready(disp);
    return false;
}
#endif

#if OLED_CONTROLLER == OLED_CONTROLLER_SH1106
#define SH1106_RETURN_ON_ERROR(expr, msg) do {                \
    esp_err_t __err_rc = (expr);                              \
    if (__err_rc != ESP_OK) {                                 \
        ESP_LOGE(TAG, "%s: %s", (msg), esp_err_to_name(__err_rc)); \
        return __err_rc;                                      \
    }                                                         \
} while (0)

static esp_err_t sh1106_send_cmd(uint8_t cmd)
{
    return esp_lcd_panel_io_tx_param(s_io_handle, cmd, NULL, 0);
}

static esp_err_t sh1106_send_cmd_with_param(uint8_t cmd, uint8_t param)
{
    return esp_lcd_panel_io_tx_param(s_io_handle, cmd, &param, 1);
}

static esp_err_t sh1106_init(void)
{
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xAE), "display off failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xD5, 0x80), "set clock failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xA8, OLED_LCD_V_RES - 1), "set multiplex failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xD3, 0x00), "set display offset failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0x40), "set start line failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xAD, 0x8B), "enable charge pump failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xA1), "set segment remap failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xC8), "set COM scan direction failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xDA, 0x12), "set COM pins failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0x81, 0x7F), "set contrast failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xD9, 0x22), "set precharge failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd_with_param(0xDB, 0x20), "set VCOMH failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xA4), "resume RAM display failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xA6), "set normal display failed");
    SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xAF), "display on failed");
    return ESP_OK;
}

static esp_err_t sh1106_flush_full_screen(const uint8_t *buffer)
{
    const uint8_t page_count = OLED_LCD_V_RES / 8;
    const uint8_t col_start = OLED_SH1106_COLUMN_OFFSET;
    const uint8_t col_low = col_start & 0x0F;
    const uint8_t col_high = (col_start >> 4) & 0x0F;

    for (uint8_t page = 0; page < page_count; page++) {
        SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0xB0 | page), "set page failed");
        SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0x00 | col_low), "set low column failed");
        SH1106_RETURN_ON_ERROR(sh1106_send_cmd(0x10 | col_high), "set high column failed");
        SH1106_RETURN_ON_ERROR(esp_lcd_panel_io_tx_color(s_io_handle, -1,
                              buffer + page * OLED_LCD_H_RES,
                              OLED_LCD_H_RES), "write page data failed");
    }

    return ESP_OK;
}
#undef SH1106_RETURN_ON_ERROR
#endif

static void lvgl_flush_cb(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map)
{
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
    esp_lcd_panel_handle_t panel_handle = lv_display_get_user_data(disp);
#endif

    px_map += LVGL_PALETTE_SIZE;

    uint16_t hor_res = lv_display_get_physical_horizontal_resolution(disp);
    int x1 = area->x1;
    int x2 = area->x2;
    int y1 = area->y1;
    int y2 = area->y2;

    for (int y = y1; y <= y2; y++) {
        for (int x = x1; x <= x2; x++) {
            bool chroma_color = (px_map[(hor_res >> 3) * y  + (x >> 3)] & 1 << (7 - x % 8));
            uint8_t *buf = oled_buffer + hor_res * (y >> 3) + (x);
            if (chroma_color) {
                (*buf) &= ~(1 << (y % 8));
            } else {
                (*buf) |= (1 << (y % 8));
            }
        }
    }

#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
    esp_lcd_panel_draw_bitmap(panel_handle, x1, y1, x2 + 1, y2 + 1, oled_buffer);
#elif OLED_CONTROLLER == OLED_CONTROLLER_SH1106
    ESP_ERROR_CHECK(sh1106_flush_full_screen(oled_buffer));
    lv_display_flush_ready(disp);
#endif
}

static void increase_lvgl_tick(void *arg)
{
    lv_tick_inc(TASK_LVGL_TICK_PERIOD_MS);
}

/**
 * @brief Thread invoking LVGL timing handler to redraw/manage animations.
 * 
 * @param arg Pointer to task arguments (unused).
 */
void task_lvgl_port(void *arg)
{
    ESP_LOGI(TAG, "Starting LVGL task");
    uint32_t time_till_next_ms = 0;
    while (1) {
        _lock_acquire(&lvgl_api_lock);
        time_till_next_ms = lv_timer_handler();
        _lock_release(&lvgl_api_lock);
        time_till_next_ms = MAX(time_till_next_ms, TASK_LVGL_MIN_DELAY_MS);
        time_till_next_ms = MIN(time_till_next_ms, TASK_LVGL_MAX_DELAY_MS);
        usleep(1000 * time_till_next_ms);
    }
}

/**
 * @brief Master initialization driver for the internal OLED mapping.
 */
void oled_init(void)
{
    ESP_LOGI(TAG, "Install panel IO");
    esp_lcd_panel_io_handle_t io_handle = NULL;
    esp_lcd_panel_io_i2c_config_t io_config = {
        .dev_addr = OLED_I2C_HW_ADDR,
        .scl_speed_hz = OLED_LCD_PIXEL_CLOCK_HZ,
        .control_phase_bytes = 1,               
        .lcd_cmd_bits = OLED_LCD_CMD_BITS,   
        .lcd_param_bits = OLED_LCD_CMD_BITS, 
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
        .dc_bit_offset = 6,                     
#elif OLED_CONTROLLER == OLED_CONTROLLER_SH1106
        .dc_bit_offset = 6,                     
#endif
    };
    ESP_ERROR_CHECK(esp_lcd_new_panel_io_i2c(g_i2c_bus_handle, &io_config, &io_handle));
    s_io_handle = io_handle;

    ESP_LOGI(TAG, "Install OLED panel driver");
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
    esp_lcd_panel_handle_t panel_handle = NULL;
    esp_lcd_panel_dev_config_t panel_config = {
        .bits_per_pixel = 1,
        .reset_gpio_num = OLED_PIN_NUM_RST,
    };
    esp_lcd_panel_ssd1306_config_t ssd1306_config = {
        .height = OLED_LCD_V_RES,
    };
    panel_config.vendor_config = &ssd1306_config;
    ESP_ERROR_CHECK(esp_lcd_new_panel_ssd1306(io_handle, &panel_config, &panel_handle));

    ESP_ERROR_CHECK(esp_lcd_panel_reset(panel_handle));
    ESP_ERROR_CHECK(esp_lcd_panel_init(panel_handle));
    ESP_ERROR_CHECK(esp_lcd_panel_disp_on_off(panel_handle, true));
#elif OLED_CONTROLLER == OLED_CONTROLLER_SH1106
    ESP_ERROR_CHECK(sh1106_init());
#endif

    ESP_LOGI(TAG, "Initialize LVGL");
    lv_init();
    lv_display_t *display = lv_display_create(OLED_LCD_H_RES, OLED_LCD_V_RES);
    
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
    lv_display_set_user_data(display, panel_handle);
#endif

    ESP_LOGI(TAG, "Allocate separate LVGL draw buffers");
    size_t draw_buffer_sz = OLED_LCD_H_RES * OLED_LCD_V_RES / 8 + LVGL_PALETTE_SIZE;
    void *buf = heap_caps_calloc(1, draw_buffer_sz, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
    assert(buf);

    lv_display_set_color_format(display, LV_COLOR_FORMAT_I1);
    lv_display_set_buffers(display, buf, NULL, draw_buffer_sz, LV_DISPLAY_RENDER_MODE_FULL);
    lv_display_set_flush_cb(display, lvgl_flush_cb);

    ESP_LOGI(TAG, "Register io panel event callback for LVGL flush ready notification");
#if OLED_CONTROLLER == OLED_CONTROLLER_SSD1306
    const esp_lcd_panel_io_callbacks_t cbs = {
        .on_color_trans_done = example_notify_lvgl_flush_ready,
    };
    esp_lcd_panel_io_register_event_callbacks(io_handle, &cbs, display);
#endif

    ESP_LOGI(TAG, "Use esp_timer as LVGL tick timer");
    const esp_timer_create_args_t lvgl_tick_timer_args = {
        .callback = &increase_lvgl_tick,
        .name = "lvgl_tick"
    };
    esp_timer_handle_t lvgl_tick_timer = NULL;
    ESP_ERROR_CHECK(esp_timer_create(&lvgl_tick_timer_args, &lvgl_tick_timer));
    ESP_ERROR_CHECK(esp_timer_start_periodic(lvgl_tick_timer, TASK_LVGL_TICK_PERIOD_MS * 1000));

    ESP_LOGI(TAG, "Display LVGL Scroll Text");
    _lock_acquire(&lvgl_api_lock);
    lvgl_demo_ui(display);
    _lock_release(&lvgl_api_lock);
}


void screen_update(enum ScreenStatus status, uint8_t package_inout, uint32_t transfer_duration_ms)
{
    _lock_acquire(&lvgl_api_lock);
    delivery_ui_set_status(status, package_inout, transfer_duration_ms, Sense_GetBatteryPercentage());
    _lock_release(&lvgl_api_lock);
}

void screen_update_battery(uint8_t battery_percent)
{
    _lock_acquire(&lvgl_api_lock);
    delivery_ui_update_battery(battery_percent);
    _lock_release(&lvgl_api_lock);
}