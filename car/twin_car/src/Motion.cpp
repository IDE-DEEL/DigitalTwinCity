#include "Motion.hpp"

Motion::Motion()
{
    _motor = Motor(MOTOR_AIN1, MOTOR_AIN2, MOTOR_PWMA, MOTOR_OFFSET, MOTOR_STBY);
    _servoAngle = FORWARD_ANGLE;
}

void Motion::init()
{
    ledcSetup(SERVO_PWM_CH, SERVO_PWM_FREQ, SERVO_PWM_RES);
    ledcAttachPin(SERVO_PIN, SERVO_PWM_CH);
    setSteeringAngle(_servoAngle);
    Serial.println("Motion controller initialized");
}

void Motion::setSteeringAngle(int angle)
{
    
    _servoAngle = constrain(angle, SERVO_ANGLE_MIN, SERVO_ANGLE_MAX);
    int duty = map(_servoAngle, 0, 180, SERVO_DUTY_MIN, SERVO_DUTY_MAX);
    //Serial.printf("Setting steering angle to %d, constrained to %d with duty %d\n", angle, _servoAngle, duty);
    ledcWrite(SERVO_PWM_CH, duty);
}

void Motion::drive(int speed)
{
    _motor.drive(speed);
}
