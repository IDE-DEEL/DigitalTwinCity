#include <Arduino.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include "Adafruit_MLX90393.h"
#include <math.h>

#define SDA_LEFT 16
#define SCL_LEFT 17
#define SDA_RIGHT 21
#define SCL_RIGHT 22

#define SERVO_PIN 14
#define MOTOR_PIN 25
#define LED_PIN 27
#define CALC_SAMPLES 10
#define LEFT_DEVICE_ID 0
#define RIGHT_DEVICE_ID 1
#define THRESHOLD 300
#define LEFT_MAX_ANGLE 130
#define RIGHT_MAX_ANGLE 70
#define FORWARD_ANGLE 100


Adafruit_MLX90393 sensorLeft;
Adafruit_MLX90393 sensorRight;
Servo servo;

// Twee I2C-instanties
TwoWire I2C_Left = TwoWire(0);
TwoWire I2C_Right = TwoWire(1);

struct sensor_coords
{
  float x = 0;
  float y = 0;
  float z = 0;
  float magOffset = 0;
  bool calibrated = false;
  int device_id;
};

// Sensor coords
static struct sensor_coords hall_left;
static struct sensor_coords hall_right;

// Kalibratie
static float magOffsetLeft = 0;
static float magOffsetRight = 0;
static int calCountLeft = 0;
static int calCountRight = 0;
static bool calibratedLeft = false;
static bool calibratedRight = false;

// Servo instellingen
static int servoAngle = 70;

// Loop timing
unsigned long lastLoopTime = 0;
const unsigned long LOOP_INTERVAL = 20;

// --- Motor functies ---
void motorOn() { digitalWrite(MOTOR_PIN, HIGH); }
void motorOff() { digitalWrite(MOTOR_PIN, LOW); }


// Forward declarations
float calculateMagValue(struct sensor_coords coords);
int calibrateDirectionMLX90393(struct sensor_coords *direction);
bool getSensorData(struct sensor_coords *direction);

float calculateMagValue(struct sensor_coords coords)
{
  return sqrt(coords.x * coords.x + coords.y * coords.y + coords.z * coords.z);
}

/* Kalibreer een richting van de MLX90393 Sensor*/
int calibrateDirectionMLX90393(struct sensor_coords *direction)
{

  // Lees eerste sensor data
  bool directionOk;
  
  // Lees CALC_SAMPLES hoeveelheid om de sensor offset mee te berekenen
  for (int i = 0; i < CALC_SAMPLES; i++)
  {
    // Lezen van sensoren
    directionOk = getSensorData(direction);

    if (!directionOk)
    {
      Serial.printf("Error reading sensor data of device %d\n", direction->device_id);
      return -1;
    }
    
    // Bereken mag offset
    if (!direction->calibrated && directionOk)
    {
      direction->magOffset += calculateMagValue(*direction);
    }
  }

  // Bereken gemiddelde offset en geef aan dat het gecalibreerd.
  direction->magOffset /= CALC_SAMPLES;
  direction->calibrated = true;
  Serial.printf("Device %d calibrated successfully.\n", direction->device_id);
  return 0;
}

bool getSensorData(struct sensor_coords *direction){
  bool succes = false;
  switch (direction->device_id)
  {
  case LEFT_DEVICE_ID:
    // if (!sensorLeft.startSingleMeasurement())
    // {
    //   return false;
    // }
    // delay(100);
    succes = sensorLeft.readData(&direction->x, &direction->y, &direction->z);
    
    break;
  case RIGHT_DEVICE_ID:
    // if (!sensorRight.startSingleMeasurement())
    // {
    //   return false;
    // }
    // delay(100);
    succes = sensorRight.readData(&direction->x, &direction->y, &direction->z);
    break;
  default:
    break;
  }
  return succes;
}

void followLine(int threshold, float difference, float magLeft, float magRight){
  if (magLeft > threshold && magLeft > magRight){
    servoAngle = LEFT_MAX_ANGLE;
    // Serial.println("Bocht links");  //debug print
  }
  else if (magRight > threshold && magRight > magLeft){
    servoAngle = RIGHT_MAX_ANGLE;
    // Serial.println("Bocht rechts"); //debug print
  }
  else if (difference < threshold){
    servoAngle = FORWARD_ANGLE;
    // Serial.println("Rechtdoor"); // debug print
  }
  
  servo.write(servoAngle);
}

void setup()
{
  Serial.begin(115200);
  while (!Serial)
    delay(10);

  // Servo test
  servo.attach(SERVO_PIN, 500, 2400);
  servo.write(100);
  delay(1000);
  servo.write(120);
  delay(1000);
  servo.write(80);
  delay(1000);
  servo.write(100);
  delay(1000);

  // led
  pinMode(LED_PIN, OUTPUT);

  // Motor
  pinMode(MOTOR_PIN, OUTPUT);
  motorOff();

  // --- I2C setup ---
  I2C_Left.begin(SDA_LEFT, SCL_LEFT, 400000);
  I2C_Right.begin(SDA_RIGHT, SCL_RIGHT, 400000);

  // --- Sensoren ---
  if (!sensorLeft.begin_I2C(0x0C, &I2C_Left))
  {
    Serial.println("Linker sensor niet gevonden op bus 0!");
    // while (1)
      delay(10);
  }
  if (!sensorRight.begin_I2C(0x0C, &I2C_Right))
  {
    Serial.println("Rechter sensor niet gevonden op bus 1!");
    // while (1)
      delay(10);
  }

  Serial.println("Beide sensoren gevonden op aparte I2C-bussen.");

  Serial.printf("OSR is %d", sensorLeft.getOversampling());
  sensorLeft.setOversampling(MLX90393_OSR_0);
  sensorRight.setOversampling(MLX90393_OSR_0);
  sensorLeft.setFilter(MLX90393_FILTER_3);
  sensorRight.setFilter(MLX90393_FILTER_3);

  digitalWrite(LED_PIN, HIGH);

  hall_left.device_id = LEFT_DEVICE_ID;
  hall_right.device_id = RIGHT_DEVICE_ID;
  if(calibrateDirectionMLX90393(&hall_left) < 0){
      digitalWrite(LED_PIN, LOW);
    return;
  }
  if(calibrateDirectionMLX90393(&hall_right) < 0){
    digitalWrite(LED_PIN, LOW);
    return;
  }
  

  servoAngle = constrain(servoAngle, 30, 130);
  motorOn();
}

void loop()
{

  // Lees linker hall sensor
  if (!getSensorData(&hall_left))
  {
    Serial.println("Error reading left hall sensor");
    digitalWrite(LED_PIN, LOW);
    return;
  }

  // Lees rechter hall sensor
  if (!getSensorData(&hall_right))
  {
    Serial.println("Error reading right hall sensor");
    digitalWrite(LED_PIN, LOW);
    return;
  }

  // --- Berekening ---
  float magLeft = calculateMagValue(hall_left);   // - magOffsetLeft;
  float magRight = calculateMagValue(hall_right); // - magOffsetRight;
  float diff = magLeft - magRight;


  // --- print sensor waardes ---
  Serial.printf("L: %3.f \t R: %3.f\n", magLeft, magRight);

  
  // --- Lijn volgen ---
  followLine(THRESHOLD, diff, magLeft, magRight);
}
