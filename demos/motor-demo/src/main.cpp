#include <Arduino.h>
#include <SparkFun_TB6612.h>
#include <Wire.h>
#include <math.h>

#define MOTOR_STBY 19
#define MOTOR_PWMA 23
#define MOTOR_AIN1 21
#define MOTOR_AIN2 22

const int offset = 1;

Motor motor = Motor(MOTOR_AIN1, MOTOR_AIN2, MOTOR_PWMA, offset, MOTOR_STBY);


void setup()
{
  Serial.begin(115200);
  while (!Serial)
    delay(10);
}

void loop()
{
  motor.drive(255,1000);
  delay(1000);
  motor.drive(100,1000);
  delay(1000);
  motor.drive(-255,1000);
  delay(1000);
  motor.brake();
  delay(1000);
}
