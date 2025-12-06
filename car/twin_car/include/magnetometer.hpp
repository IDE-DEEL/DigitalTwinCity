#ifndef MAGNETOMETER_HPP
#define MAGNETOMETER_HPP

#include <Arduino.h>
#include "Adafruit_MLX90393.h"
#include "errno.h"

// Configuration constants
#define SAMPLE_DELAY_MS 10
#define SAMPLE_AMOUNT 10
#define MEDIAN_FILTER_SIZE 5
#define MEDIAN_FILTER_ALPHA 0.3f
#define FILTER_DECAY_RATE 0.5f

// Do not touch this assert
static_assert(MEDIAN_FILTER_ALPHA <= 1.0f, "MEDIAN_FILTER_ALPHA must be smaller or equal to 1.0f");

struct mag_config {
    mlx90393_gain_t gain; /** Magnetometer gain */
    mlx90393_resolution_t resolution; /** Magnetometer resolution */
    mlx90393_oversampling_t osr; /** Magnetometer oversampling */
    mlx90393_filter_t filter; /** Magnetometer filter */
};

enum mag_address : uint8_t {
    MAGNETOMETER_LEFT = 0x0E, /** I2C address of left magnetometer sensor */
    MAGNETOMETER_RIGHT = 0x0C /** I2C address of right magnetometer sensor */
};

struct mag_sample_raw {
    float x; /** Raw X coordinate */
    float y; /** Raw Y coordinate */
    float z; /** Raw Z coordinate */
};

struct mag_sample_processed {
    float magnitude; /** Processed magnitude */
    float filtered; /** Filtered magnitude */
    float max_filtered; /** Maximum filtered magnitude */
    float min_filtered; /** Minimum filtered magnitude */
};

/**
 * @brief Magnetometer class
 * \example initialization, calibration, reading, and processing of magnetometer data.
 * Uses Adafruit_MLX90393 as the underlying sensor interface.
 * Managed via MagnetometerManager for multiple sensors.
 * Class flow:
 * 1. init() during setup
 * 2. calibrate() during setup
 * 3. update() in the main loop
 */
class Magnetometer
{
public:

    /**
     * @brief Construct a new Magnetometer object
     * @param device_addr I2C address of the magnetometer.
     * @param config Configuration parameters for the magnetometer.
     * @note Recommended to use MagnetometerManager to manage multiple instances.
     */
    Magnetometer(enum mag_address device_addr, const mag_config &config);

    /**
     * @brief Initialize the magnetometer sensor.
     * @returns 0 on success, negative errno on failure.
     * @retval -ENODEV if the sensor is not found.
     * @retval -EIO on I/O error during configuration.
     */
    int init();

    /**
     * @brief Calibrate the magnetometer by calculating the offset.
     * @param samples Number of samples to use for calibration.
     * @returns 0 on success, negative errno on failure.
     * @retval -EIO on I/O error during reading.
     */
    int calibrate(int samples);

    /**
     * @brief Read raw data from the magnetometer.
     * @returns 0 on success, negative errno on failure.
     * @retval -EIO on I/O error during reading.
     */
    int read();

    /**
     * @brief Process the raw data to apply filtering.
     * @returns 0 on success, negative errno on failure.
     */
    int process();

    /**
     * @brief Update the magnetometer by reading and processing data.
     * @returns 0 on success, negative errno on failure.
     */
    int update();

    /**
     * @brief Get the latest processed magnitude.
     * @returns Processed magnitude value.
     * @note The rest of the processed sample can be obtained via getProcessedSample(). 
     * This one was singled out for ease of use.
     */
    float getFilteredMagnitude() const { return _proc.filtered; }

    /**
     * @brief Get the latest processed sample.
     * @returns Struct containing processed sample data.
     */
    struct mag_sample_processed getProcessedSample() const { return _proc; }

private:
    Adafruit_MLX90393 _sensor;
    enum mag_address _device_addr;
    mag_config _config;
    String _name;
        
    // Sample variables
    mag_sample_raw _raw {0,0,0};
    mag_sample_processed _proc {0,0};
    float _magOffset = 0;
    bool _calibrated = false;

    // Filter variables
    float _window[MEDIAN_FILTER_SIZE] = {0};
    int _windowPos = 0;
};

#endif // MAGNETOMETER_HPP