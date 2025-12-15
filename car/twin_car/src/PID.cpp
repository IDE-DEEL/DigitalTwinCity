#include "PID.hpp"

PID::PID(enum road_types road_type) : _road_type(road_type)
{
    reset();
    set_previous_road_type(road_type);
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

enum road_types PID::set_previous_road_type(enum road_types type)
{

    _previous_road_type = type;
    
    return _previous_road_type;
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

    float adaptiveKp;
    switch (_road_type)
    {
    case STRAIGHT:
        // Linear scaling (default)
        // adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * min(abs(error) / ERROR_NORMALIZATION_FACTOR, 1.0f);

        // Exponential interpolation (uncomment to test)
        adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * (1.0f - expf(-2.0f * min(abs(error) / ERROR_NORMALIZATION_FACTOR, 1.0f)));

        // Piecewise interpolation (uncomment to test)
        // adaptiveKp = (abs(error) < 0.1f * ERROR_NORMALIZATION_FACTOR) ? _Kp_min \
        //                     : (abs(error) < 0.5f * ERROR_NORMALIZATION_FACTOR) ? (_Kp_min + _Kp_max) * 0.5f \
        //                     : _Kp_max;
        break;

    case CURVE:
        // Extreme exponential to test if different PID's are applied. This formale should be altered.
        adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * (1.0f - expf(-50.0f * min(abs(error) / ERROR_NORMALIZATION_FACTOR, 1.0f)));
        break;
    case ROUNDABOUT:
    case T_JUNCTION:
    case CROSSROAD:
    default:
        // For unknown road types, use a more conservative approach
        adaptiveKp = _Kp_min + (_Kp_max - _Kp_min) * 0.5f;

        // Log a warning only when the road type changes to avoid spamming the console
        if (_road_type != _previous_road_type)
        {
            Serial.printf("Warning: Unknown road type %d, using default Kp\n", _road_type);
        }
        
        break;
    }

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
