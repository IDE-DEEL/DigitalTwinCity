/*
 * motor_driver.h  —  Motor (TB6612) and steering servo public API
 *
 * Initialise the motor driver and servo with motor_driver_init() and
 * servo_init(), then use the control functions at runtime.
 *
 * Pin assignments and PWM settings are taken from config.h.
 */

#pragma once

#include <stdbool.h>
#include "esp_err.h"

/**
 * @brief Configures AIN1, AIN2, STBY GPIO outputs and the LEDC PWM
 *        channel used for PWMA. Motor starts disabled (STBY=0).
 * 
 * @return esp_err_t ESP_OK on success.
 */
esp_err_t motor_driver_init(void);

/**
 * @brief Set forward speed 0–100 %. 0 short-brakes the motor (AIN1/AIN2
 *        both low) without disabling STBY.
 * 
 * @param speed_pct Desired speed percentage (0-100).
 */
void      motor_set_speed(uint8_t speed_pct);

/**
 * @brief Drive STBY high to enable or low to coast/disable the H-bridge.
 * 
 * @param enable True to enable, false to disable.
 */
void      motor_enable(bool enable);


/**
 * @brief Configures the LEDC timer and channel that drives the servo PWM
 *        signal on SERVO_GPIO (see config.h).
 * 
 * @return esp_err_t ESP_OK on success.
 */
esp_err_t servo_init(void);

/**
 * @brief Set the servo to a position in the range SERVO_ANGLE_MIN ..
 *        SERVO_ANGLE_MAX (0–180 °). Values outside this range are clamped.
 *        SERVO_ANGLE_FORWARD (config.h) is the straight-ahead position.
 * 
 * @param angle Desired angle in degrees (0-180).
 */
void      servo_set_angle(int angle);

/**
 * @brief Enables or disables the PWM output for the servo.
 * 
 * @param enable True to enable pulse generation, false to pause it.
 */
void      servo_enable(bool enable);
