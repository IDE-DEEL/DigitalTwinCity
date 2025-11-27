#ifndef PID_HPP
#define PID_HPP

#include <Arduino.h>
#include "magnetometer.hpp"
#include <algorithm>

#define ERROR_NORMALIZATION_FACTOR 160.0f /** Error normalization factor for adaptive Kp calculation */
#define KP_MIN_DEFAULT 0.5f /** Startup minimum proportional gain (small errors) */
#define KP_MAX_DEFAULT 2.0f /** Startup maximum proportional gain (large errors) */
#define KI_DEFAULT 0.1f /** Startup integral gain */
#define KD_DEFAULT 0.05f /** Startup derivative gain */
#define INTEGRAL_MAX_DEFAULT 1000.0f /** Startup maximum value for integral windup prevention */

class PID
{
public:
    /**
     * @brief Construct a new PID controller for magnetometer-based line following
     */
    PID();
    
    /**
     * @brief Calculate PID output based on two magnetometer readings
     * @param magLeft Left magnetometer processed sample
     * @param magRight Right magnetometer processed sample
     * @returns PID output value to be used for steering control
     */
    float compute(const mag_sample_processed& magLeft, const mag_sample_processed& magRight);

    /**
     * @brief Reset PID controller state (errors and timing)
     */
    void reset();

    private:

    float compute_proportional(float error);
    float compute_integral(float error, float dt);
    float compute_derivative(float error, float dt);

private:
    // PID coefficients
    float _Kp_min;
    float _Kp_max;
    float _Ki;
    float _Kd;
    
    // PID state
    float _integral;
    float _previousError;
    float _integralMax;
    unsigned long _lastTime;
};


#endif // PID_HPP