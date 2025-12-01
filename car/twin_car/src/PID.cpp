#include "PID.hpp"

PID::PID()
{
    reset();
}

float PID::compute(const mag_sample_processed& magLeft, const mag_sample_processed& magRight)
{
    if ((long)magLeft.min_filtered == (long)magLeft.max_filtered)
    {
        Serial.printf("Warning: Left magnetometer min and max filtered values are equal. min:%.2f max:%.2f. cast min %ld max %ld\n",
                      magLeft.min_filtered,
                      magLeft.max_filtered,
                      (long)magLeft.min_filtered,
                      (long)magLeft.max_filtered); 
    }

    if ((long)magRight.min_filtered == (long)magRight.max_filtered)
    {
        Serial.printf("Warning: Right magnetometer min and max filtered values are equal. min:%.2f max:%.2f. cast min %ld max %ld\n",
                      magRight.min_filtered,
                      magRight.max_filtered,
                      (long)magRight.min_filtered,
                      (long)magRight.max_filtered); 
    }
    

    // Map magnetometer readings to 0-100 range
    float leftMapped = map(magLeft.filtered, magLeft.min_filtered, magLeft.max_filtered, 0, 100);
    float rightMapped = map(magRight.filtered, magRight.min_filtered, magRight.max_filtered, 0, 100);
    
    // Calculate error
    float error = leftMapped - rightMapped;
    
    // Calculate time delta
    unsigned long now = millis();
    float dt = (now - _lastTime) / 1000.0f; // Convert to seconds

    // Prevent time delta division or multiplication by zero
    if (_lastTime == 0 || dt <= 0)
    {
        dt = 0.001f;
    }
    _lastTime = now;
    
    // Compute PID components
    float proportional = compute_proportional(error);
    float integral = compute_integral(error, dt);
    float derivative = compute_derivative(error, dt);

    // Update previous error
    _previousError = error;
        
    // Calculate PID output and return it
    return proportional + integral + derivative;
}

void PID::reset()
{
    _Kp_min = KP_MIN_DEFAULT;
    _Kp_max = KP_MAX_DEFAULT;
    _Ki = KI_DEFAULT;
    _Kd = KD_DEFAULT;
    _integralMax = INTEGRAL_MAX_DEFAULT;
    _integral = 0.0f;
    _previousError = 0.0f;
    _lastTime = 0;
}

float PID::compute_proportional(float error)
{
    /*
    TODO: Current implementaation is a linear scaling. Find out if
    Exponential interpolation or piecewise interpolation is better.

    Exponential: aggressive response to large errors, smooth for small errors
    Piecewise: distinct zones with different Kp values

    Also find out if Hysteresis should and could be implemented.
    */

    // Linear scaling (default)
    //float adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * min(abs(error) / ERROR_NORMALIZATION_FACTOR, 1.0f);

    // Exponential interpolation (uncomment to test)
    float adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * (1.0f - expf(-2.0f * min(abs(error) / ERROR_NORMALIZATION_FACTOR, 1.0f)));

    // Piecewise interpolation (uncomment to test)
    // float adaptiveKp = (abs(error) < 0.1f * ERROR_NORMALIZATION_FACTOR) ? _Kp_min \
    //                     : (abs(error) < 0.5f * ERROR_NORMALIZATION_FACTOR) ? (_Kp_min + _Kp_max) * 0.5f \
    //                     : _Kp_max;

    return adaptiveKp * error;
}

float PID::compute_integral(float error, float dt)
{
    // Integrate error over time
    _integral += error * dt;
    
    // Prevent integral windup
    _integral = constrain(_integral, -_integralMax, _integralMax);
    return _Ki * _integral;
}

float PID::compute_derivative(float error, float dt)
{
    float derivative_over_dt = (error - _previousError) / dt;
    return _Kd * derivative_over_dt;
}
