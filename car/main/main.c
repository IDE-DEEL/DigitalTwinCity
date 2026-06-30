/*
 * main.c  —  Application entry point and FreeRTOS task definitions
 *
 * This file owns:
 *   • app_main()         — one-time hardware init and calibration, then
 *                          launches FreeRTOS tasks and returns.
 *   • task_line_tracker  — reads magnet sensors, runs PID, steers servo.
 *   • task_rfid_scanner  — polls RFIDreader, prints card UIDs on detect.
 *
 * All tunable parameters (pins, gains, task priorities, stack sizes,
 * loop intervals) are centralised in include/config.h.
 *
 * Subsystem APIs:
 *   Magnets    → include/magnets.h      (MLX90393 dual magnetometer)
 *   PID        → include/pid_steering.h (discrete PID controller)
 *   Motor      → include/motor_driver.h (TB6612 + servo)
 *   RFID       → include/rfid.h         (PN532 reader)
 */

#include <stdio.h>
#include <string.h>
#include <math.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_log.h"
#include "esp_timer.h"

#include "config.h"
#include "magnets.h"
#include "pid_steering.h"
#include "motor_driver.h"
#include "rfid.h"
#include "wifi.h"
#include "mqtt.h"
#include "Sense.h"
#include "oled.h"
#include "turning.h"
static const char *TAG = "Main";
char debug_counter = 0;

/**
 * @brief  Task for tracking a magnetic line using dual MLX90393 magnetometers.
 *
 * Runs at ~50 Hz (LINE_TRACKER_LOOP_MS from config.h).
 * Reads magnetic position, computes PID output, and sets servo angle.
 * Prints diagnostics to the terminal every DIAG_PRINT_INTERVAL_US.
 *
 * @note Priority: TASK_LINE_TRACKER_PRIORITY  (config.h)
 * @note Stack:    TASK_LINE_TRACKER_STACK     (config.h)
 * 
 * @param[in] arg  User-provided task argument pointer (unused).
 */
static void task_line_tracker(void *arg)
{
    (void)arg;

    /* Initialise PID state — zero integral and derivative history */
    pid_state_t pid;
    pid_reset(&pid);

    int64_t last_print_us = 0;
    uint32_t last_seen_ms = esp_timer_get_time() / 1000;
    bool actuators_enabled = true;

    ESP_LOGI(TAG, "[line_tracker] started  PID(kp=%.2f ki=%.3f kd=%.2f)",
             PID_KP, PID_KI, PID_KD);

    /* sensor_present tracks whether a magnet strip is currently detected */
    bool sensor_present = true;

    while (1) {
        float pos_mm = 0.0f;
        float mx[2] = {0}, my[2] = {0}, mz[2] = {0}, mag[2] = {0}, mag_sum = 0.0f;
        float error = 0.0f;
        float pid_out = 0.0f;
        float servo_f = (float)SERVO_ANGLE_FORWARD;
        uint32_t now_ms = esp_timer_get_time() / 1000;
        const receive_msg_t *rx = mqtt_get_rx();
        /* Read diagnostics which includes per-sensor magnitudes and position */
        esp_err_t err = magnets_read_diagnostics(mx, my, mz, mag, &mag_sum, &pos_mm);
        if (err != ESP_OK) {
            ESP_LOGW(TAG, "[line_tracker] sensor read error: %s",
                     esp_err_to_name(err));
            vTaskDelay(pdMS_TO_TICKS(500));
            continue;
        }

        /* If both sensor magnitudes are below threshold, consider strip lost */
        const float LOST_THRESHOLD = 250.0f;
        bool lost = (mag[0] < LOST_THRESHOLD) && (mag[1] < LOST_THRESHOLD);


        if (!lost || pid_override) {
            // Keep updating the "last seen" timer as long as we have a strip OR we're intentionally ignoring it
            last_seen_ms = now_ms;
        }

        if (lost && sensor_present) {
            /* Transition: strip lost -> checking if we should disable outputs */
            sensor_present = false;
            mqtt_set_lost(true);
            
            if (!pid_override) {
                // We don't disable yet, because we wait for LINE_LOST_TIMEOUT_MS
                ESP_LOGI(TAG, "Magnet strip lost — starting %d ms recovery timer", LINE_LOST_TIMEOUT_MS);
            } else {
                ESP_LOGI(TAG, "Magnet strip lost — ignoring due to turning override");
            }
        } else if (!lost && !sensor_present) {
            /* Transition: strip found again -> re-enable actuators */
            sensor_present = true;
            mqtt_set_lost(false);
            
            if (!actuators_enabled && !pid_override) {
                motor_enable(true&&!rx->stop);
                motor_set_speed(MOTOR_DEFAULT_SPEED_PCT);
                servo_enable(true&&!rx->stop);
                actuators_enabled = true;
                ESP_LOGI(TAG, "Magnet strip detected — resuming motor and steering");
            } else if (pid_override) {
                ESP_LOGI(TAG, "Magnet strip detected — turning override still active");
            }
        }
        
        // Stop completely if the line hasn't been found within the timeout
        if (!sensor_present && !pid_override && actuators_enabled) {
            if (now_ms - last_seen_ms > LINE_LOST_TIMEOUT_MS) {
                motor_set_speed(0);
                motor_enable(false);
                servo_enable(false);
                actuators_enabled = false;
                ESP_LOGW(TAG, "Magnet strip lost for > %d ms — disabled motor and steering", LINE_LOST_TIMEOUT_MS);
            }
        }

        if (sensor_present && !pid_override) {
            /* Run PID only when strip present AND NOT overridden by turning logic */
            error = -pos_mm;
            
            /* Apply turn bias if active */
            if (now_ms < turn_bias_end_ms) {
                error += active_turn_bias_error;
            }
            
            /* Apply deadzone to prevent micro-oscillations on straights */
            if (fabsf(error) < POS_DEAD_ZONE_MM) {
                error = 0.0f;
            }
            
            pid_out = pid_update(&pid, error,
                                 PID_KP, PID_KI, PID_KD, PID_IMAX);

            /* Map PID output to servo angle (centred on FORWARD) */
            servo_f = (float)SERVO_ANGLE_FORWARD + pid_out;
            if (servo_f < (float)SERVO_ANGLE_RIGHT_MAX) servo_f = (float)SERVO_ANGLE_RIGHT_MAX;
            if (servo_f > (float)SERVO_ANGLE_LEFT_MAX)  servo_f = (float)SERVO_ANGLE_LEFT_MAX;
            servo_set_angle((int)(servo_f + 0.5f));
        } else if (pid_override) {
            // During a turn, reset the PID state so it doesn't wind up or carry stale error
            pid_reset(&pid);
        }

        /* ── Periodic diagnostics ── */
        int64_t now_us = esp_timer_get_time();
        if (now_us - last_print_us >= DIAG_PRINT_INTERVAL_US) {
            last_print_us = now_us;

                 const char *dir;
                 if (fabsf(pos_mm) < POS_DEAD_ZONE_MM) dir = "CENTRE  ";
                 else if (pos_mm > 0)                   dir = ">RIGHT  ";
                 else                                   dir = "LEFT<   ";

                 printf("[tracker]  pos=%+5.1fmm  err=%+5.1f  pid=%+5.1f  servo=%ddeg  %s  "
                        "magR=%6.1f  magL=%6.1f  sum=%6.1f  active=%d\n",
                        pos_mm, error, pid_out, (int)(servo_f + 0.5f), dir,
                        mag[0], mag[1], mag_sum, sensor_present ? 1 : 0);
        }

        vTaskDelay(pdMS_TO_TICKS(LINE_TRACKER_LOOP_MS));
    }
}

/**
 * @brief  Task for polling the PN532 RFID reader.
 *
 * Polls the PN532 reader every RFID_SCANNER_POLL_MS (config.h).
 * When a card is detected, prints its UID and card type.
 * Ignores repeated scans of the same card until it is removed.
 *
 * @note Priority: TASK_RFID_SCANNER_PRIORITY  (config.h)
 * @note Stack:    TASK_RFID_SCANNER_STACK     (config.h)
 *
 * @param[in] arg  User-provided task argument pointer (unused).
 */
static void task_rfid_scanner(void *arg)
{
    (void)arg;

    uint8_t prev_uid[10] = { 0 };
    uint8_t prev_uid_len = 0;
    

    ESP_LOGI(TAG, "[rfid_scanner] started — waiting for cards ...");

    while (1) {
        /* Suspend NFC scanning while a turn maneuver is active */
        if (pid_override) {
            vTaskDelay(pdMS_TO_TICKS(RFID_SCANNER_POLL_MS));
            continue;
        }

        uint8_t uid[10] = { 0 };
        uint8_t uid_len = 0;
        uint8_t sak     = 0;

        if (rfid_poll_card(uid, &uid_len, &sak)) {
            /* Only report if this is a different card than last time */
            if (uid_len != prev_uid_len ||
                memcmp(uid, prev_uid, uid_len) != 0)
            {
                /* Build a colon-separated UID string, e.g. "A1:B2:C3:D4" */
                char uid_str[32] = { 0 };
                for (uint8_t i = 0; i < uid_len; i++) {
                    char byte_str[4];
                    snprintf(byte_str, sizeof(byte_str),
                             i < uid_len - 1 ? "%02X:" : "%02X", uid[i]);
                    strncat(uid_str, byte_str, sizeof(uid_str) - strlen(uid_str) - 1);
                }

                /* Determine card type from UID length */
                const char *card_type;
                switch (uid_len) {
                    case 4:  card_type = "MIFARE Classic / single-size UID"; break;
                    case 7:  card_type = "MIFARE Ultralight / double-size UID"; break;
                    case 10: card_type = "Triple-size UID"; break;
                    default: card_type = "Unknown";
                }

                printf("[rfid]  Card detected  UID: %s  SAK: 0x%02X  Type: %s\n",
                       uid_str, sak, card_type);

                memcpy(prev_uid, uid, uid_len);
                prev_uid_len = uid_len;

                
                const receive_msg_t *mqtt_rx = mqtt_get_rx();
                ESP_LOGI(TAG, "Current MQTT command: direction=%d  speed=%d  stop=%d  special_tag=%d  screen_status=%d  package_inout=%d  transfer_duration_ms=%d",
                         mqtt_rx->direction, mqtt_rx->speed, mqtt_rx->stop, mqtt_rx->special_tag,
                         mqtt_rx->screen_status, mqtt_rx->package_inout, mqtt_rx->transfer_duration_ms);
                if (mqtt_rx != NULL)
                { 
                    turn_parser(mqtt_rx->direction);
                }
                
                // Publish RFID via MQTT
                mqtt_set_rfid(uid_str);                               

            }
            
        } else {
            /*
             * No card in field — reset the "previous" card so the same
             * card will be reported again on the next tap.
             */
            prev_uid_len = 0;
        }

        vTaskDelay(pdMS_TO_TICKS(RFID_SCANNER_POLL_MS));
    }
}

/*
 * @brief  Task for polling battery status and updating UI.
 *
 * Polls the battery level every BATTERY_MONITOR_POLL_MS (config.h).
 * When the battery level changes, updates the OLED display.
 *
 * @note Priority: TASK_BATTERY_MONITOR_PRIORITY  (config.h)
 * @note Stack:    TASK_BATTERY_MONITOR_STACK     (config.h)
 *
 * @param[in] arg  User-provided task argument pointer (unused).

 * Stack:    TASK_BATTERY_MONITOR_STACK     (config.h)
 **/
void task_battery_monitor(void *arg)
{
    (void)arg;

    uint8_t last_battery_pct = 0;
    bool last_is_charging = false;

    ESP_LOGI(TAG, "[battery_monitor] started — monitoring battery level ...");

    while (1) {
        const receive_msg_t *rx = mqtt_get_rx();
        uint8_t battery_pct = Sense_GetBatteryPercentage();
        bool is_charging = Sense_IsCharging();

        if (battery_pct != last_battery_pct || is_charging != last_is_charging) {
            ESP_LOGI(TAG, "[battery_monitor] Battery: %d%% | Charging: %s",
                     battery_pct, is_charging ? "YES" : "NO");
            mqtt_set_battery(battery_pct);
            mqtt_set_charging(is_charging);
            if(is_charging)
            {
                motor_enable(false);
                motor_set_speed(0);
                servo_enable(false);
            }
            else
            {
                motor_enable(true&&!rx->stop);
                motor_set_speed(MOTOR_DEFAULT_SPEED_PCT);
                servo_enable(true&&!rx->stop);
            }
            screen_update_battery(battery_pct);
            last_battery_pct = battery_pct;
            last_is_charging = is_charging;
        }

        vTaskDelay(pdMS_TO_TICKS(BATTERY_MONITOR_POLL_MS));

    }
}
 /**
 * @brief  Application entry point setting up hardware, interfaces, and tasks.
 *
 * Execution order:
 *   1. I2C bus init
 *   2. MLX90393 sensor init
 *   3. Servo init  (park at FORWARD angle)
 *   4. Motor driver init  (motor disabled until after calibration)
 *   5. RFID reader init
 *   6. Magnetometer calibration  (blocking — keep magnets away!)
 *   7. Start motor at default speed
 *   8. Create FreeRTOS tasks and return

 *   6. Magnetometer calibration  (blocking — keep magnets away!)
 *   7. Start motor at default speed
 *   8. Create FreeRTOS tasks and return
 */

void app_main(void)
{

     /* ── WiFi setup ──────────────────────────────────────────────── */
    ESP_LOGI(TAG, "╔════════════╗");
    ESP_LOGI(TAG, "║ WiFi Setup ║");
    ESP_LOGI(TAG, "╚════════════╝");
    init_wifi();
    connect_wifi();
    mqtt_app_start();
        xTaskCreate(
        mqtt_task,
        "mqtt_task",
        4096,
        NULL,
        5,
        NULL
    );

    ESP_LOGI(TAG, "╔══════════════════════════════════════════╗");
    ESP_LOGI(TAG, "║  Magnet Line Tracker  +  RFID Scanner   ║");
    ESP_LOGI(TAG, "╚══════════════════════════════════════════╝");

    esp_err_t err;

    /* ── 1. I2C bus ────────────────────────────────────────────────── */
    err = magnets_i2c_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "I2C init failed: %s — halting", esp_err_to_name(err));
        return;
    }

    /* ── 2. MLX90393 sensors ──────────────────────────────────────── */
    err = magnets_sensor_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Magnet sensor init failed — halting");
        return;
    }

    /* ── 3. Servo ─────────────────────────────────────────────────── */
    err = servo_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Servo init failed: %s — halting", esp_err_to_name(err));
        return;
    }
    servo_set_angle(SERVO_ANGLE_FORWARD);

    /* ── 4. Motor driver ──────────────────────────────────────────── */
    err = motor_driver_init();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Motor init failed: %s — halting", esp_err_to_name(err));
        return;
    }
    motor_set_speed(0);
    motor_enable(false);    /* Keep motor off during calibration */

    /* ── 5. RFID reader ───────────────────────────────────────────── */
    err = rfid_init();
    if (err != ESP_OK) {
        /*
         * RFID failure is non-fatal — the line tracker still works
         * without RFID.  Log a warning and continue.
         */
        ESP_LOGW(TAG, "RFID init failed (%s) — RFID scanner task will not start",
                 esp_err_to_name(err));
    }

    /* ── 6. Calibration ───────────────────────────────────────────── */
    err = magnets_calibrate();
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Calibration failed — halting");
        return;
    }

    /* ── 7. Start motor ───────────────────────────────────────────── */
    // motor_set_speed(MOTOR_DEFAULT_SPEED_PCT);
    // motor_enable(true);
    ESP_LOGI(TAG, "Motor running at %d %%", MOTOR_DEFAULT_SPEED_PCT);

    /* Initialise sensing (ADC + charge detect) */
    Sense_Init();

    /* ── 8. Launch FreeRTOS tasks ─────────────────────────────────── */
    oled_init();

     xTaskCreatePinnedToCore(
                task_line_tracker,
                TASK_LINE_TRACKER_NAME,
                TASK_LINE_TRACKER_STACK,
                NULL,
                TASK_LINE_TRACKER_PRIORITY,
                NULL,
                1); // <--- Core 1
    ESP_LOGI(TAG, "Task '%s' created  (prio=%d  stack=%d)",
             TASK_LINE_TRACKER_NAME,
             TASK_LINE_TRACKER_PRIORITY,
             TASK_LINE_TRACKER_STACK);
             
    xTaskCreatePinnedToCore(
                task_lvgl_port,
                TASK_OLED_NAME,
                TASK_OLED_STACK,
                NULL,
                TASK_OLED_PRIORITY,
                NULL,
                1); // <--- Core 1
    ESP_LOGI(TAG, "Task '%s' created  (prio=%d  stack=%d)",
             TASK_OLED_NAME,
             TASK_OLED_PRIORITY,
             TASK_OLED_STACK);
        
    if (err == ESP_OK) {   /* Only start RFID task if init succeeded */
        xTaskCreatePinnedToCore(
                    task_rfid_scanner,
                    TASK_RFID_SCANNER_NAME,
                    TASK_RFID_SCANNER_STACK,
                    NULL,
                    TASK_RFID_SCANNER_PRIORITY,
                    NULL,
                    1); // <--- Core 1
        ESP_LOGI(TAG, "Task '%s' created  (prio=%d  stack=%d)",
                 TASK_RFID_SCANNER_NAME,
                 TASK_RFID_SCANNER_PRIORITY,
                 TASK_RFID_SCANNER_STACK);
        
        xTaskCreatePinnedToCore(
                    task_battery_monitor,
                    TASK_BATTERY_MONITOR_NAME,
                    TASK_BATTERY_MONITOR_STACK,
                    NULL,
                    TASK_BATTERY_MONITOR_PRIORITY,
                    NULL,
                    1); // <--- Core 1
    }

    ESP_LOGI(TAG, "Initialisation complete — tasks running.");
    
}