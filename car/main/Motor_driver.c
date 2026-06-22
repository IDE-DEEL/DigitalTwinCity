/*
 * Motor_driver.c  —  TB6612 motor driver + steering servo implementation
 *
 * Both peripherals use the ESP32 LEDC hardware PWM peripheral.
 *   Servo  → LEDC timer 0 / channel 0  (50 Hz, 16-bit)
 *   Motor  → LEDC timer 1 / channel 1  (20 kHz, 10-bit)
 *
 * All pin and PWM constants are defined in include/config.h.
 */

#include "motor_driver.h"
#include "config.h"
#include "mqtt.h"

#include "driver/gpio.h"
#if defined(__has_include)
#  if __has_include("driver/ledc.h")
#    include "driver/ledc.h"
#  elif __has_include("esp_ledc.h")
#    include "esp_ledc.h"
#  else
#    include "driver/ledc.h" /* fallback - let the compiler emit the original error */
#  endif
#else
#  include "driver/ledc.h"
#endif
#include "esp_log.h"

static const char *TAG = "Motor";

/* ═══════════════════════════════════════════════════════════════════════
 * Motor (TB6612)
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @brief Initialize TB6612 driver configuration, hooking to ESP32 LEDC output.
 * 
 * @return esp_err_t Success state of the pin/LEDC allocation.
 */
esp_err_t motor_driver_init(void)
{
    /* ── Configure direction + standby GPIO outputs ── */
    gpio_config_t io = {
        .pin_bit_mask = (1ULL << MOTOR_GPIO_AIN1)
                      | (1ULL << MOTOR_GPIO_AIN2)
                      | (1ULL << MOTOR_GPIO_STBY),
        .mode         = GPIO_MODE_OUTPUT,
        .pull_up_en   = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type    = GPIO_INTR_DISABLE,
    };
    esp_err_t err = gpio_config(&io);
    if (err != ESP_OK) return err;

    /* Start disabled and not moving */
    gpio_set_level(MOTOR_GPIO_STBY, 0);
    gpio_set_level(MOTOR_GPIO_AIN1, 0);
    gpio_set_level(MOTOR_GPIO_AIN2, 0);

    /* ── Configure LEDC PWM timer for the motor ── */
    ledc_timer_config_t timer = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = MOTOR_PWM_RESOLUTION,
        .timer_num       = MOTOR_PWM_LEDC_TIMER,
        .freq_hz         = MOTOR_PWM_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    err = ledc_timer_config(&timer);
    if (err != ESP_OK) return err;

    /* ── Configure LEDC channel for PWMA ── */
    ledc_channel_config_t ch = {
        .gpio_num   = MOTOR_GPIO_PWMA,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = MOTOR_PWM_LEDC_CHANNEL,
        .timer_sel  = MOTOR_PWM_LEDC_TIMER,
        .duty       = 0,
        .hpoint     = 0,
    };
    err = ledc_channel_config(&ch);
    if (err != ESP_OK) return err;

    ESP_LOGI(TAG, "Motor driver ready  (STBY=%d  PWMA=%d  %d Hz)",
             MOTOR_GPIO_STBY, MOTOR_GPIO_PWMA, MOTOR_PWM_FREQ_HZ);
    return ESP_OK;
}

/**
 * @brief Dispatch a speed percentage vector down to the TB6612 bridge array.
 * 
 * @param speed_pct Normalized 0..100 driving speed.
 */
void motor_set_speed(uint8_t speed_pct)
{
    /* Clamp to valid percentage range */
    if (speed_pct <= 0)   speed_pct = 0;
    if (speed_pct > 100) speed_pct = 100;

    mqtt_set_speed(speed_pct);

    if (speed_pct == 0) {
        /* Short-brake: both inputs low, zero PWM */
        gpio_set_level(MOTOR_GPIO_AIN1, 0);
        gpio_set_level(MOTOR_GPIO_AIN2, 0);
        ledc_set_duty(LEDC_LOW_SPEED_MODE, MOTOR_PWM_LEDC_CHANNEL, 0);
    } else {
    /* Forward direction can be flipped from config.h. */
#if MOTOR_REVERSE_DIRECTION
    gpio_set_level(MOTOR_GPIO_AIN1, 0);
    gpio_set_level(MOTOR_GPIO_AIN2, 1);
#else
    gpio_set_level(MOTOR_GPIO_AIN1, 1);
    gpio_set_level(MOTOR_GPIO_AIN2, 0);
#endif
        /*Map speed percentage to usable duty cycle (40-60%)*/
        uint8_t mapped_speed_pct = ((speed_pct - 1) * (MOTOR_MAX_MAP_PCT - MOTOR_MIN_MAP_PCT) + 49) / 99 + MOTOR_MIN_MAP_PCT;

        uint32_t max_duty = (1U << MOTOR_PWM_RESOLUTION) - 1;
        uint32_t duty     = (uint32_t)(max_duty * mapped_speed_pct / 100);
        ledc_set_duty(LEDC_LOW_SPEED_MODE, MOTOR_PWM_LEDC_CHANNEL, duty);
    }

    ledc_update_duty(LEDC_LOW_SPEED_MODE, MOTOR_PWM_LEDC_CHANNEL);
}

/**
 * @brief Toggle H-Bridge STBY line state on the TB6612.
 * 
 * @param enable High-Z coast or active driving.
 */
void motor_enable(bool enable)
{
    gpio_set_level(MOTOR_GPIO_STBY, enable ? 1 : 0);
    ESP_LOGI(TAG, "Motor %s", enable ? "ENABLED" : "DISABLED");
}

/* ═══════════════════════════════════════════════════════════════════════
 * Steering servo
 * ═══════════════════════════════════════════════════════════════════════ */

/**
 * @brief Stand up the independent 50Hz LEDC timing structure for Servo signals.
 * 
 * @return esp_err_t Success status mapping.
 */
esp_err_t servo_init(void)
{
    /* ── Configure LEDC PWM timer for the servo  (50 Hz, 16-bit) ── */
    ledc_timer_config_t timer = {
        .speed_mode      = LEDC_LOW_SPEED_MODE,
        .duty_resolution = SERVO_PWM_RESOLUTION,
        .timer_num       = SERVO_PWM_LEDC_TIMER,
        .freq_hz         = SERVO_PWM_FREQ_HZ,
        .clk_cfg         = LEDC_AUTO_CLK,
    };
    esp_err_t err = ledc_timer_config(&timer);
    if (err != ESP_OK) return err;

    gpio_reset_pin(SERVO_GPIO);
    /* ── Configure LEDC channel for the servo signal pin ── */
    ledc_channel_config_t ch = {
        .gpio_num   = SERVO_GPIO,
        .speed_mode = LEDC_LOW_SPEED_MODE,
        .channel    = SERVO_PWM_LEDC_CHANNEL,
        .timer_sel  = SERVO_PWM_LEDC_TIMER,
        .duty       = 0,
        .hpoint     = 0,
    };
    err = ledc_channel_config(&ch);
    if (err != ESP_OK) return err;

    ESP_LOGI(TAG, "Servo ready  (GPIO=%d  fwd=%d°)", SERVO_GPIO, SERVO_ANGLE_FORWARD);
    return ESP_OK;
}

/**
 * @brief Converts a target turn-angle into interpolation over PWM Duty bounds.
 * 
 * @param angle Setpoint 0..180 limit.
 */
void servo_set_angle(int angle)
{
    /* Clamp to mechanical limits */
    if (angle < SERVO_ANGLE_MIN) angle = SERVO_ANGLE_MIN;
    if (angle > SERVO_ANGLE_MAX) angle = SERVO_ANGLE_MAX;

    /*
     * Linear interpolation between the two duty-cycle endpoints:
     *   0°   → SERVO_DUTY_AT_0_DEG   (≈1 ms pulse)
     *   180° → SERVO_DUTY_AT_180_DEG (≈2 ms pulse)
     */
    uint32_t duty = SERVO_DUTY_AT_0_DEG
                  + (uint32_t)((float)(angle - SERVO_ANGLE_MIN)
                               / (float)(SERVO_ANGLE_MAX - SERVO_ANGLE_MIN)
                               * (float)(SERVO_DUTY_AT_180_DEG - SERVO_DUTY_AT_0_DEG));

    ledc_set_duty(LEDC_LOW_SPEED_MODE, SERVO_PWM_LEDC_CHANNEL, duty);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, SERVO_PWM_LEDC_CHANNEL);
}

/**
 * @brief Stops sending a pulsing signal to the servo. Used to relax structural tension manually.
 * 
 * @param enable Target activity constraint.
 */
void servo_enable(bool enable)
{
    if (enable) {
        /* Re-configure the LEDC channel for the servo (safe to call multiple times) */
        ledc_channel_config_t ch = {
            .gpio_num   = SERVO_GPIO,
            .speed_mode = LEDC_LOW_SPEED_MODE,
            .channel    = SERVO_PWM_LEDC_CHANNEL,
            .timer_sel  = SERVO_PWM_LEDC_TIMER,
            .duty       = 0,
            .hpoint     = 0,
        };
        (void)ledc_channel_config(&ch);
    } else {
        /* Stop LEDC output for the servo (idle level = 0) */
        (void)ledc_stop(LEDC_LOW_SPEED_MODE, SERVO_PWM_LEDC_CHANNEL, 0);
    }
}
