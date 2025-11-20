#ifndef MAGNETOMETER_MANAGER_HPP
#define MAGNETOMETER_MANAGER_HPP

#include <vector>
#include "magnetometer.hpp"

/**
 * @brief Manager for multiple Magnetometer instances.
 * Allows batch initialization, calibration, and updating.
 */
class MagnetometerManager {
public:

    /**
     * @brief Add a Magnetometer instance to the manager.
     * @param m Pointer to the Magnetometer instance to add.
     */
    void add(Magnetometer *m) { _sensors.push_back(m); }

    /**
     * @brief Initialize all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int initAll() {
        for (auto *s : _sensors) { int r = s->init(); if (r) return r; }
        return 0;
    }

    /**
     * @brief Calibrate all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int calibrateAll() {
        for (auto *s : _sensors) { int r = s->calibrate(SAMPLE_AMOUNT); if (r) return r; }
        return 0;
    }
    
    /**
     * @brief Update all managed Magnetometer instances.
     * @returns 0 on success, negative errno on first failure.
     */
    int updateAll() {
        for (auto *s : _sensors) { int r = s->update(); if (r) return r; }
        return 0;
    }

    /**
     * @brief Get filtered magnitudes from all managed Magnetometer instances.
     * @returns Vector of filtered magnitude values.
     */
    std::vector<float> getFilteredMagnitudeAll(){
        std::vector<float> magnitudes;
        for (auto *s : _sensors) {
            magnitudes.push_back(s->getFilteredMagnitude());
        }
        return magnitudes;
    }
private:
    std::vector<Magnetometer*> _sensors;
};

#endif // MAGNETOMETER_MANAGER_HPP