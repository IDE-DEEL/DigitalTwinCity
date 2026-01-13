#ifndef MAGNETOMETER_MANAGER_HPP
#define MAGNETOMETER_MANAGER_HPP

#include <vector>
#include <Wire.h>
#include "magnetometer.hpp"

#define SDA 17
#define SCL 16

/**
 * @brief Manager for multiple Magnetometer instances.
 * Allows batch initialization, calibration, and updating.
 */
class MagnetometerManager {
public:

    /**
     * @brief Initialize a new Magnetometer Manager object
     * @note Call this during setup()
     */
    int initMgr(){
        if (!_sensors.empty())
        {
            return 0; // Already initialized
        }

        struct mag_config magConfig = 
        {
            .gain = MLX90393_GAIN_1X,
            .resolution = MLX90393_RES_16,
            .osr = MLX90393_OSR_0,
            .filter = MLX90393_FILTER_3
        };
        
        enum mag_address mag_address_arr[] = {MAGNETOMETER_LEFT, MAGNETOMETER_RIGHT};
        for (size_t i = 0; i < sizeof(mag_address_arr) / sizeof(mag_address_arr[0]); i++)
        {
            _sensors.push_back(new Magnetometer(mag_address_arr[i], magConfig));
        }
        
    }

    /**
     * @brief Initialize all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int initAll() {
        if (!Wire.begin(SDA, SCL)) {
            Serial.println("I2C bus initialization failed!");
            i2c_scan();
            return -EIO;
        }
        else {
            Serial.println("I2C bus initialized.");
        }
        for (auto* s : _sensors) {
            int r = s->init();
            if (r) {
                i2c_scan();
                return r;
            }
        }
        return 0;
    }

    /**
     * @brief Calibrate all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int calibrateAll() {
        for (auto* s : _sensors) { int r = s->calibrate(SAMPLE_AMOUNT); if (r) return r; }
        return 0;
    }

    /**
     * @brief Update all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int updateAll() {
        for (auto* s : _sensors) { int r = s->update(); if (r) return r; }
        return 0;
    }

    /**
     * @brief Get filtered magnitudes from all managed Magnetometer instances.
     * @returns Vector of filtered magnitude values.
     */
    std::vector<float> getFilteredMagnitudeAll() {
        std::vector<float> magnitudes;
        for (auto* s : _sensors) {
            magnitudes.push_back(s->getFilteredMagnitude());
        }
        return magnitudes;
    }
private:

    /**
     * @brief Scan the I2C bus for connected devices and print their addresses.
     * @note Useful for debugging I2C connections.
     */
    void i2c_scan() {
        byte error, address;
        int nDevices;
        Serial.println("Scanning...");
        nDevices = 0;
        for (address = 1; address < 127; address++) {
            Wire.beginTransmission(address);
            error = Wire.endTransmission();
            if (error == 0) {
                Serial.print("I2C device found at address 0x");
                if (address < 16) {
                    Serial.print("0");
                }
                Serial.println(address, HEX);
                nDevices++;
            }
            else if (error == 4) {
                Serial.print("Unknown error at address 0x");
                if (address < 16) {
                    Serial.print("0");
                }
                Serial.println(address, HEX);
            }
        }
        if (nDevices == 0) {
            Serial.println("No I2C devices found\n");
        }
        else {
            Serial.println("done\n");
        }
    }


private:
    std::vector<Magnetometer*> _sensors;
};

#endif // MAGNETOMETER_MANAGER_HPP