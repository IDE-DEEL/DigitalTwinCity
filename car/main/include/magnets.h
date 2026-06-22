/*
 * magnets.h  —  MLX90393 dual-magnetometer sensor public API
 *
 * Two CJMCU-90393 (MLX90393) sensors are mounted either side of the
 * car's centre-line.  Their field-magnitude difference is used to
 * estimate the lateral position of a magnet strip on the track.
 *
 * Initialisation order:
 *   1. magnets_i2c_init()   — once, sets up the shared I2C master bus
 *   2. magnets_sensor_init()— configures both MLX90393 chips
 *   3. magnets_calibrate()  — samples the ambient field (no magnets nearby!)
 *   4. magnets_read_position() in the control loop
 *
 * Pin and sensor addresses come from config.h.
 */

#pragma once

#include "esp_err.h"

/**
 * @brief  Initialise the ESP32 I2C master bus.
 *         Must be called before any other magnets_* function.
 * @return esp_err_t ESP_OK on success, or an error code otherwise.
 */
esp_err_t magnets_i2c_init(void);

/**
 * @brief  Reset and configure both MLX90393 sensors (gain, filtering, etc.).
 * @return esp_err_t ESP_OK only when both sensors are ready.
 */
esp_err_t magnets_sensor_init(void);

/**
 * @brief  Sample the ambient magnetic field from both sensors over
 *         CALIB_SAMPLES readings (see config.h) and store the average as the
 *         zero-field offset.
 *
 *         Call this once at startup with NO permanent magnets nearby.
 *         A countdown and progress messages are printed to stdout.
 *
 * @return esp_err_t ESP_OK when at least CALIB_MIN_GOOD_SAMPLES were obtained.
 */
esp_err_t magnets_calibrate(void);

/**
 * @brief  Trigger a measurement on both sensors, subtract the calibration
 *         offsets, and compute the lateral position estimate:
 *
 *           pos_mm = (mag_R - mag_L) / (mag_R + mag_L) * POS_SCALE_MM
 *
 *         Positive = strip is to the RIGHT of centre.
 *         Negative = strip is to the LEFT  of centre.
 *         Returns 0.0 when the total field is below MAG_MIN_THRESHOLD.
 *
 * @param  pos_mm  Output pointer for lateral position in millimetres
 * @return esp_err_t ESP_OK on success, or an error code if a sensor read fails.
 */
esp_err_t magnets_read_position(float *pos_mm);

/**
 * @brief Read both sensors and return calibrated per-axis values and magnitudes.
 *
 * @param mx Arrays of length MLX90393_NUM_SENSORS (output) for X-axis values
 * @param my Arrays of length MLX90393_NUM_SENSORS (output) for Y-axis values
 * @param mz Arrays of length MLX90393_NUM_SENSORS (output) for Z-axis values
 * @param mag Arrays of length MLX90393_NUM_SENSORS (output) for magnitudes
 * @param mag_sum Total field magnitude (mag[0] + mag[1]) (output)
 * @param pos_mm Lateral position computed as in magnets_read_position (output)
 * @return esp_err_t ESP_OK on success or an error code if a sensor read fails.
 */
esp_err_t magnets_read_diagnostics(float mx[], float my[], float mz[],
								   float mag[], float *mag_sum, float *pos_mm);
