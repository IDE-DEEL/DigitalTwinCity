#ifndef MOTION_HPP
#define MOTION_HPP

#include <Arduino.h>
#include <SparkFun_TB6612.h>

// Motor pin definitions
#define MOTOR_STBY 23
#define MOTOR_PWMA 18
#define MOTOR_AIN1 22
#define MOTOR_AIN2 19

// Motor constants
#define MOTOR_OFFSET 1

// Steering pin definitions
#define SERVO_PIN 14

// Steering constants
#define LEFT_MAX_ANGLE 170
#define RIGHT_MAX_ANGLE 30
#define FORWARD_ANGLE 100
#define SERVO_PWM_CH 0
#define SERVO_PWM_FREQ 50
#define SERVO_PWM_RES 16

// Servo limits
#define SERVO_ANGLE_MIN 0
#define SERVO_ANGLE_MAX 180
#define SERVO_DUTY_MIN 3277
#define SERVO_DUTY_MAX 6553
/**
 * @brief Motion control class for driving and steering
 */
class Motion
{
public:
    /**
     * @brief Construct a new Motion object
     */
    Motion();

    /**
     * @brief Initialize motion control components
     * @note Call this during setup()
     */
    void init();
    
    /**
     * @brief Set the steering angle
     * @param angle Steering angle in degrees
     */
    void setSteeringAngle(int angle);

    /**
     * @brief Drive the motor at specified speed
     * @param speed Speed value in TODO: define range and unit
     */
    void drive(int speed);

    private:
    Motor _motor = Motor(MOTOR_AIN1, MOTOR_AIN2, MOTOR_PWMA, MOTOR_OFFSET, MOTOR_STBY);
    int _servoAngle;
};
#endif // MOTION_HPP