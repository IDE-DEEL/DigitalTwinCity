#include "lvgl.h"
#include "lvgl_ui.h"
#include "Sense.h"
#include <stdio.h>

/**
 * @brief Represents the logical distinct screens available.
 */
typedef enum {
    DELIVERY_SCREEN_MAIN = 0,
    DELIVERY_SCREEN_LOADING,
    DELIVERY_SCREEN_DELIVERING,
    DELIVERY_SCREEN_CHARGING,
} delivery_screen_t;

/**
 * @brief Context state carrying display object pointers and properties.
 */
typedef struct {
    lv_obj_t *screen_main;
    lv_obj_t *screen_loading;
    lv_obj_t *screen_delivering;
    lv_obj_t *screen_charging;
    lv_obj_t *main_count_value;
    lv_obj_t *loading_text;
    lv_obj_t *loading_bar;
    lv_obj_t *delivering_text;
    lv_obj_t *delivering_bar;
    lv_obj_t *charging_text;
    lv_obj_t *battery_label;
    uint16_t packages_in_car;
    uint32_t transfer_duration_ms;
    uint32_t current_transfer_ms;
    delivery_screen_t active_screen;
} delivery_ui_state_t;

static delivery_ui_state_t s_ui_state;
static bool s_ui_ready;

#define UI_BG_COLOR 0xFFFFFF
#define UI_FG_COLOR 0x000000
#define UI_SUB_FG_COLOR 0x303030

static const lv_point_precise_t cube_front_top[] = {{8, 8}, {22, 8}};
static const lv_point_precise_t cube_front_right[] = {{22, 8}, {22, 22}};
static const lv_point_precise_t cube_front_bottom[] = {{22, 22}, {8, 22}};
static const lv_point_precise_t cube_front_left[] = {{8, 22}, {8, 8}};

static const lv_point_precise_t cube_back_top[] = {{14, 3}, {28, 3}};
static const lv_point_precise_t cube_back_right[] = {{28, 3}, {28, 17}};
static const lv_point_precise_t cube_back_bottom[] = {{28, 17}, {14, 17}};
static const lv_point_precise_t cube_back_left[] = {{14, 17}, {14, 3}};

static const lv_point_precise_t cube_link_top_left[] = {{8, 8}, {14, 3}};
static const lv_point_precise_t cube_link_top_right[] = {{22, 8}, {28, 3}};
static const lv_point_precise_t cube_link_bottom_right[] = {{22, 22}, {28, 17}};
static const lv_point_precise_t cube_link_bottom_left[] = {{8, 22}, {14, 17}};

/**
 * @brief Small helper for drawing a line segment wire edge on parent.
 */
static lv_obj_t *create_wire_edge(lv_obj_t *parent, const lv_point_precise_t *pts, uint32_t count)
{
    lv_obj_t *line = lv_line_create(parent);
    lv_line_set_points(line, pts, count);
    lv_obj_set_style_line_width(line, 1, 0);
    lv_obj_set_style_line_color(line, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_line_rounded(line, false, 0);
    return line;
}

/**
 * @brief Group helper wrapper calling create_wire_edge for the entire box array.
 */
static void create_wireframe_cube(lv_obj_t *parent)
{
    create_wire_edge(parent, cube_front_top, 2);
    create_wire_edge(parent, cube_front_right, 2);
    create_wire_edge(parent, cube_front_bottom, 2);
    create_wire_edge(parent, cube_front_left, 2);

    create_wire_edge(parent, cube_back_top, 2);
    create_wire_edge(parent, cube_back_right, 2);
    create_wire_edge(parent, cube_back_bottom, 2);
    create_wire_edge(parent, cube_back_left, 2);

    create_wire_edge(parent, cube_link_top_left, 2);
    create_wire_edge(parent, cube_link_top_right, 2);
    create_wire_edge(parent, cube_link_bottom_right, 2);
    create_wire_edge(parent, cube_link_bottom_left, 2);
}

/**
 * @brief Manage toggling of LVGL objects visibility based on desired state.
 */
static void set_active_screen(delivery_ui_state_t *state, delivery_screen_t screen)
{
    state->active_screen = screen;
    lv_obj_add_flag(state->screen_main, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(state->screen_loading, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(state->screen_delivering, LV_OBJ_FLAG_HIDDEN);
    lv_obj_add_flag(state->screen_charging, LV_OBJ_FLAG_HIDDEN);

    if (screen == DELIVERY_SCREEN_MAIN) {
        lv_obj_clear_flag(state->screen_main, LV_OBJ_FLAG_HIDDEN);
    } else if (screen == DELIVERY_SCREEN_LOADING) {
        lv_obj_clear_flag(state->screen_loading, LV_OBJ_FLAG_HIDDEN);
    } else if (screen == DELIVERY_SCREEN_DELIVERING) {
        lv_obj_clear_flag(state->screen_delivering, LV_OBJ_FLAG_HIDDEN);
    } else if (screen == DELIVERY_SCREEN_CHARGING) {
        lv_obj_clear_flag(state->screen_charging, LV_OBJ_FLAG_HIDDEN);
    }
}

/**
 * @brief Rerender labels mapping numeric quantities to LVGL DOM. 
 */
static void update_main_screen(delivery_ui_state_t *state)
{
    char buf[32];
    lv_snprintf(buf, sizeof(buf), "%u", state->packages_in_car);
    lv_label_set_text(state->main_count_value, buf);
}

/**
 * @brief Set the dynamic text of the loading animation view.
 */
static void update_loading_screen(delivery_ui_state_t *state, uint16_t count)
{
    if (!state->loading_text) return;
    char buf[64];
    lv_snprintf(buf, sizeof(buf), "Loading\n%u package(s)", count);
    lv_label_set_text(state->loading_text, buf);
}

/**
 * @brief Set the dynamic text of the unloading animation view.
 */
static void update_delivering_screen(delivery_ui_state_t *state, uint16_t count)
{
    if (!state->delivering_text) return;
    char buf[64];
    lv_snprintf(buf, sizeof(buf), "Delivering\n%u package(s)", count);
    lv_label_set_text(state->delivering_text, buf);
}

/**
 * @brief Initial logic state variable purger
 */
static void delivery_ui_reset(delivery_ui_state_t *state)
{
    state->packages_in_car = 0;
    state->transfer_duration_ms = 0;
    state->current_transfer_ms = 0;

    update_main_screen(state);
    update_loading_screen(state, 0);
    update_delivering_screen(state, 0);
    set_active_screen(state, DELIVERY_SCREEN_MAIN);
}

/**
 * @brief Timer callback routine handling local animation states natively in LVGL thread. 
 */
static void ui_tick_cb(lv_timer_t *timer)
{
    delivery_ui_state_t *state = lv_timer_get_user_data(timer);
    if (!state || !s_ui_ready) return;

    if (state->active_screen == DELIVERY_SCREEN_LOADING || state->active_screen == DELIVERY_SCREEN_DELIVERING) {
        state->current_transfer_ms += 50; // increment by timer period

        int32_t val = 0;
        if (state->transfer_duration_ms > 0) {
            val = (state->current_transfer_ms * 100) / state->transfer_duration_ms;
        }

        if (val >= 100) {
            val = 100;
            // Back to main screen when done
            set_active_screen(state, DELIVERY_SCREEN_MAIN);
        }

        if (state->active_screen == DELIVERY_SCREEN_LOADING) {
            lv_bar_set_value(state->loading_bar, val, LV_ANIM_OFF);
        } else if (state->active_screen == DELIVERY_SCREEN_DELIVERING) {
            lv_bar_set_value(state->delivering_bar, val, LV_ANIM_OFF);
        }
    }
}

/**
 * @brief External API mapping a system payload event into LVGL display commands. 
 */
void delivery_ui_set_status(uint8_t status, uint8_t package_inout, uint32_t transfer_duration_ms, uint8_t battery_percent)
{
    delivery_ui_state_t *state = &s_ui_state;

    if (!s_ui_ready) {
        return;
    }

    if (state->battery_label) {
        char bat_buf[16];
        lv_snprintf(bat_buf, sizeof(bat_buf), "%d%%", battery_percent);
        lv_label_set_text(state->battery_label, bat_buf);
    }

    if (status == 3) { /* SC_CHARGING */
        if (state->charging_text) {
            char bat_buf[32];
            lv_snprintf(bat_buf, sizeof(bat_buf), "Charging...\n%d%%", battery_percent);
            lv_label_set_text(state->charging_text, bat_buf);
        }
        set_active_screen(state, DELIVERY_SCREEN_CHARGING);
    } else if (status == 1) { /* SC_LOADING */
        state->packages_in_car += package_inout;
        state->transfer_duration_ms = transfer_duration_ms;
        state->current_transfer_ms = 0;
        
        lv_bar_set_value(state->loading_bar, 0, LV_ANIM_OFF);
        update_loading_screen(state, package_inout);
        set_active_screen(state, DELIVERY_SCREEN_LOADING);
    } else if (status == 2) { /* SC_DELIVERING */
        if (state->packages_in_car >= package_inout) {
            state->packages_in_car -= package_inout;
        } else {
            state->packages_in_car = 0;
        }
        state->transfer_duration_ms = transfer_duration_ms;
        state->current_transfer_ms = 0;

        lv_bar_set_value(state->delivering_bar, 0, LV_ANIM_OFF);
        update_delivering_screen(state, package_inout);
        set_active_screen(state, DELIVERY_SCREEN_DELIVERING);
    } else { /* SC_NORMAL or others */
        set_active_screen(state, DELIVERY_SCREEN_MAIN);
    }

    /* Always sync the main package count to however many are loaded */
    update_main_screen(state);
}

void delivery_ui_update_battery(uint8_t battery_percent)
{
    delivery_ui_state_t *state = &s_ui_state;

    if (!s_ui_ready) {
        return;
    }

    if (state->battery_label) {
        char bat_buf[16];
        lv_snprintf(bat_buf, sizeof(bat_buf), "%d%%", battery_percent);
        lv_label_set_text(state->battery_label, bat_buf);
    }

    if (state->active_screen == DELIVERY_SCREEN_CHARGING) {
        if (state->charging_text) {
            char bat_buf[32];
            lv_snprintf(bat_buf, sizeof(bat_buf), "Charging...\n%d%%", battery_percent);
            lv_label_set_text(state->charging_text, bat_buf);
        }
    }
}

void lvgl_demo_ui(lv_display_t *disp)
{
    lv_obj_t *scr = lv_display_get_screen_active(disp);
    lv_obj_set_style_bg_color(scr, lv_color_hex(UI_BG_COLOR), 0);
    lv_obj_set_style_bg_opa(scr, LV_OPA_COVER, 0);

    lv_obj_t *bg = lv_obj_create(scr);
    lv_obj_remove_style_all(bg);
    lv_obj_set_size(bg, lv_pct(100), lv_pct(100));
    lv_obj_set_style_bg_color(bg, lv_color_hex(UI_BG_COLOR), 0);
    lv_obj_set_style_bg_opa(bg, LV_OPA_COVER, 0);
    lv_obj_center(bg);
    lv_obj_move_background(bg);

    lv_obj_t *main_screen = lv_obj_create(scr);
    lv_obj_remove_style_all(main_screen);
    lv_obj_set_size(main_screen, lv_pct(100), lv_pct(100));
    lv_obj_align(main_screen, LV_ALIGN_CENTER, 0, 0);

    lv_obj_t *main_title = lv_label_create(main_screen);
    lv_label_set_text(main_title, "Packages");
    lv_obj_set_style_text_color(main_title, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(main_title, LV_FONT_DEFAULT, 0);
    lv_obj_align(main_title, LV_ALIGN_TOP_MID, 0, 15);

    lv_obj_t *cube = lv_obj_create(main_screen);
    lv_obj_remove_style_all(cube);
    lv_obj_set_size(cube, 32, 24);
    lv_obj_align(cube, LV_ALIGN_BOTTOM_LEFT, 6, -4);
    create_wireframe_cube(cube);

    lv_obj_t *count_value = lv_label_create(main_screen);
    lv_obj_set_style_text_color(count_value, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(count_value, LV_FONT_DEFAULT, 0);
    lv_obj_set_style_transform_zoom(count_value, 500, 0);
    lv_obj_align(count_value, LV_ALIGN_CENTER, 0, 4);

    lv_obj_t *loading_screen = lv_obj_create(scr);
    lv_obj_remove_style_all(loading_screen);
    lv_obj_set_size(loading_screen, lv_pct(100), lv_pct(100));
    lv_obj_center(loading_screen);

    lv_obj_t *loading_text = lv_label_create(loading_screen);
    lv_obj_set_style_text_color(loading_text, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(loading_text, LV_FONT_DEFAULT, 0);
    lv_obj_set_width(loading_text, 122);
    lv_label_set_long_mode(loading_text, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_align(loading_text, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(loading_text, LV_ALIGN_CENTER, 0, -10);

    lv_obj_t *loading_bar = lv_bar_create(loading_screen);
    lv_obj_set_size(loading_bar, 100, 10);
    lv_obj_align(loading_bar, LV_ALIGN_CENTER, 0, 15);
    lv_obj_set_style_bg_color(loading_bar, lv_color_hex(UI_BG_COLOR), LV_PART_MAIN);
    lv_obj_set_style_border_color(loading_bar, lv_color_hex(UI_FG_COLOR), LV_PART_MAIN);
    lv_obj_set_style_border_width(loading_bar, 1, LV_PART_MAIN);
    lv_obj_set_style_bg_color(loading_bar, lv_color_hex(UI_FG_COLOR), LV_PART_INDICATOR);

    lv_obj_t *delivering_screen = lv_obj_create(scr);
    lv_obj_remove_style_all(delivering_screen);
    lv_obj_set_size(delivering_screen, lv_pct(100), lv_pct(100));
    lv_obj_center(delivering_screen);

    lv_obj_t *delivering_text = lv_label_create(delivering_screen);
    lv_obj_set_style_text_color(delivering_text, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(delivering_text, LV_FONT_DEFAULT, 0);
    lv_obj_set_width(delivering_text, 122);
    lv_label_set_long_mode(delivering_text, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_align(delivering_text, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(delivering_text, LV_ALIGN_CENTER, 0, -10);

    lv_obj_t *delivering_bar = lv_bar_create(delivering_screen);
    lv_obj_set_size(delivering_bar, 100, 10);
    lv_obj_align(delivering_bar, LV_ALIGN_CENTER, 0, 15);
    lv_obj_set_style_bg_color(delivering_bar, lv_color_hex(UI_BG_COLOR), LV_PART_MAIN);
    lv_obj_set_style_border_color(delivering_bar, lv_color_hex(UI_FG_COLOR), LV_PART_MAIN);
    lv_obj_set_style_border_width(delivering_bar, 1, LV_PART_MAIN);
    lv_obj_set_style_bg_color(delivering_bar, lv_color_hex(UI_FG_COLOR), LV_PART_INDICATOR);

    lv_obj_t *charging_screen = lv_obj_create(scr);
    lv_obj_remove_style_all(charging_screen);
    lv_obj_set_size(charging_screen, lv_pct(100), lv_pct(100));
    lv_obj_center(charging_screen);

    lv_obj_t *charging_text = lv_label_create(charging_screen);
    lv_obj_set_style_text_color(charging_text, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(charging_text, LV_FONT_DEFAULT, 0);
    lv_obj_set_width(charging_text, 122);
    lv_label_set_long_mode(charging_text, LV_LABEL_LONG_WRAP);
    lv_obj_set_style_text_align(charging_text, LV_TEXT_ALIGN_CENTER, 0);
    lv_obj_align(charging_text, LV_ALIGN_CENTER, 0, 0);

    lv_obj_t *battery_label = lv_label_create(scr);
    lv_label_set_text(battery_label, "100%");
    lv_obj_set_style_text_color(battery_label, lv_color_hex(UI_FG_COLOR), 0);
    lv_obj_set_style_text_font(battery_label, LV_FONT_DEFAULT, 0);
    
    /* Adjust battery percentage size and move to the right */
    lv_obj_set_style_transform_zoom(battery_label, 220, 0);
    
    lv_obj_align(battery_label, LV_ALIGN_TOP_RIGHT, -1, 1);

    s_ui_state.screen_main = main_screen;
    s_ui_state.screen_loading = loading_screen;
    s_ui_state.screen_delivering = delivering_screen;
    s_ui_state.screen_charging = charging_screen;
    s_ui_state.main_count_value = count_value;
    s_ui_state.loading_text = loading_text;
    s_ui_state.loading_bar = loading_bar;
    s_ui_state.delivering_text = delivering_text;
    s_ui_state.delivering_bar = delivering_bar;
    s_ui_state.charging_text = charging_text;
    s_ui_state.battery_label = battery_label;

    delivery_ui_reset(&s_ui_state);
    s_ui_ready = true;

    /* Initialize with the actual battery percentage */
    delivery_ui_update_battery(Sense_GetBatteryPercentage());

    /* Create a timer to animate the progress bars */
    lv_timer_create(ui_tick_cb, 50, &s_ui_state);
}