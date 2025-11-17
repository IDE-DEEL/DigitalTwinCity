#include <Arduino.h>
#include <Wire.h>
#include "Adafruit_MLX90393.h"
#include <SparkFun_TB6612.h>
#include <math.h>

// --- Pin definities ---
#define SDA 16
#define SCL 17
#define MOTOR_STBY 19
#define MOTOR_PWMA 23
#define MOTOR_AIN1 21
#define MOTOR_AIN2 22
#define SERVO_PIN 14
#define LED_PIN 27

// --- Configuratie ---
#define CALC_SAMPLES 10
#define LEFT_DEVICE_ID 0
#define RIGHT_DEVICE_ID 1
#define LEFT_MAX_ANGLE 170
#define RIGHT_MAX_ANGLE 30
#define FORWARD_ANGLE 100
#define SERVO_PWM_CH 0
#define SERVO_PWM_FREQ 50
#define SERVO_PWM_RES 16

const int offset = 1;

// --- Motor en sensor objecten ---
Motor motor = Motor(MOTOR_AIN1, MOTOR_AIN2, MOTOR_PWMA, offset, MOTOR_STBY);
Adafruit_MLX90393 sensorLeft;
Adafruit_MLX90393 sensorRight;
Servo servo;

// --- Struct voor sensorgegevens ---
struct sensor_coords {
  float x = 0;
  float y = 0;
  float z = 0;
  float magOffset = 0;
  bool calibrated = false;
  int device_id;
};

static struct sensor_coords hall_left;
static struct sensor_coords hall_right;

// --- max en min magneet sterkte --- 
float leftMax = -10;
float leftMin = 10;
float rightMax = -10;
float rightMin = 10;
float magDecay = 0.5;

// --- Servo en loop timing ---
static int servoAngle = FORWARD_ANGLE;
unsigned long lastLoopTime = 0;

// --- PID parameters ---
float Kp_min = 0.2;   // rustige reactie bij kleine fouten
float Kp_max = 1.0;
float Ki = 0.0001;
float Kd = 0.001;
float previousError = 0;
float integral = 0;
float integralMax = 1000.0;

// --- Filter instellingen ---
#define FILTER_SIZE 5
float leftWindow[FILTER_SIZE] = {0};
float rightWindow[FILTER_SIZE] = {0};
float filteredMagLeft = 0;
float filteredMagRight = 0;
float alpha = 0.3;
bool firstRead = true;


// --- Functie declaraties ---
float calculateMagValue(struct sensor_coords coords);
int calibrateDirectionMLX90393(struct sensor_coords *direction);
bool getSensorData(struct sensor_coords *direction);
void followLinePID(float magLeft, float magRight);
float medianFilter(float newValue, float *window, int size);
void updateMaxMin(float magLeft, float magRight);

// --- Functies ---
float calculateMagValue(struct sensor_coords coords) {
  return sqrt(coords.x * coords.x + coords.y * coords.y + coords.z * coords.z);
}

float medianFilter(float newValue, float *window, int size) {
  for (int i = size - 1; i > 0; i--) {
    window[i] = window[i - 1];
  }
  window[0] = newValue;

  float temp[size];
  for (int i = 0; i < size; i++) temp[i] = window[i];

  for (int i = 0; i < size - 1; i++) {
    for (int j = i + 1; j < size; j++) {
      if (temp[j] < temp[i]) {
        float t = temp[i];
        temp[i] = temp[j];
        temp[j] = t;
      }
    }
  }
  return temp[size / 2];
}

int calibrateDirectionMLX90393(struct sensor_coords *direction) {
  bool directionOk;
  for (int i = 0; i < CALC_SAMPLES; i++) {
    directionOk = getSensorData(direction);
    if (!directionOk) {
      Serial.printf("Error reading sensor data of device %d\n", direction->device_id);
      return -1;
    }
    if (!direction->calibrated && directionOk) {
      direction->magOffset += calculateMagValue(*direction);
    }
  }
  direction->magOffset /= CALC_SAMPLES;
  direction->calibrated = true;
  Serial.printf("Device %d calibrated successfully.\n", direction->device_id);
  return 0;
}

bool getSensorData(struct sensor_coords *direction) {
  bool succes = false;
  switch (direction->device_id) {
    case LEFT_DEVICE_ID:
      succes = sensorLeft.readData(&direction->x, &direction->y, &direction->z);
      break;
    case RIGHT_DEVICE_ID:
      succes = sensorRight.readData(&direction->x, &direction->y, &direction->z);
      break;
    default:
      break;
  }
  return succes;
}

// --- automatische max en min magneet sterkte ---
void updateMaxMin(float magLeft, float magRight){
  if (magLeft > leftMax){
     leftMax = magLeft;
  }else{
    leftMax -= magDecay;
  }
  if (magLeft < leftMin){
    leftMin = magLeft;
  }else{
    leftMin += magDecay;
  }
  if (leftMax < leftMin + 1){
    leftMax = leftMin + 1;
  }

  if (magRight > rightMax){
     rightMax = magRight;
  }else{
    rightMax -= magDecay;
  }
  if (magRight < rightMin){
    rightMin = magRight;
  }else{
    rightMin += magDecay;
  }
  if (rightMax < rightMin + 1){
    rightMax = rightMin + 1;
  }
}


// --- PID lijnvolgfunctie ---
void followLinePID(float magLeft, float magRight) {
  float leftMapped = map(magLeft, leftMin, leftMax, 0, 100);
  float rightMapped = map(magRight, rightMin, rightMax, 0, 100);
  float error = leftMapped - rightMapped;  
  unsigned long now = millis();
  float dt = (now - lastLoopTime) / 1000.0;
  if (dt <= 0) dt = 0.001;
  lastLoopTime = now;

  float adaptiveKp = Kp_min + (Kp_max - Kp_min) * min(abs(error) / 160, 1.f);

  integral += error * dt;
  if (integral > integralMax) integral = integralMax;
  if (integral < -integralMax) integral = -integralMax;

  float derivative = (error - previousError) / dt;
  float output = adaptiveKp * error + Ki * integral + Kd * derivative;
  previousError = error;

  servoAngle = FORWARD_ANGLE + output;
  servoAngle = constrain(servoAngle, RIGHT_MAX_ANGLE, LEFT_MAX_ANGLE);
  int duty = map(servoAngle, 0, 180, 3277, 6553);
  ledcWrite(SERVO_PWM_CH, duty);

  int speed = 120;
  motor.drive(speed);

  Serial.printf("Err: %.2f\tOut: %.2f\tServo: %d\n", error, output, servoAngle);
}

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10);

  ledcSetup(SERVO_PWM_CH, SERVO_PWM_FREQ, SERVO_PWM_RES);
  ledcAttachPin(SERVO_PIN, SERVO_PWM_CH);
  int duty = map(servoAngle, 0, 180, 3277, 6553);
  ledcWrite(SERVO_PWM_CH, duty);
  delay(1000);
  pinMode(LED_PIN, OUTPUT);
  Wire.begin(SDA, SCL);

  if (!sensorLeft.begin_I2C(0x0C)) {
    Serial.println("Sensor 1 niet gevonden!");
  } else Serial.println("Sensor 1 OK");
  
  if (!sensorRight.begin_I2C(0x0E)) {
    Serial.println("Sensor 2 niet gevonden!");
  } else Serial.println("Sensor 2 OK");

  sensorLeft.setOversampling(MLX90393_OSR_0);
  sensorRight.setOversampling(MLX90393_OSR_0);
  sensorLeft.setFilter(MLX90393_FILTER_3);
  sensorRight.setFilter(MLX90393_FILTER_3);

  digitalWrite(LED_PIN, HIGH);

  hall_left.device_id = LEFT_DEVICE_ID;
  hall_right.device_id = RIGHT_DEVICE_ID;

  if (calibrateDirectionMLX90393(&hall_left) < 0) {
    digitalWrite(LED_PIN, LOW);
    return;
  }
  if (calibrateDirectionMLX90393(&hall_right) < 0) {
    digitalWrite(LED_PIN, LOW);
    return;
  }

  servoAngle = constrain(servoAngle, 70, 130);
  lastLoopTime = millis();
}

void loop() {
  if (!getSensorData(&hall_left)) {
    Serial.println("Error reading left hall sensor");
    digitalWrite(LED_PIN, LOW);
    return;
  }

  if (!getSensorData(&hall_right)) {
    Serial.println("Error reading right hall sensor");
    digitalWrite(LED_PIN, LOW);
    return;
  }

  float magLeftRaw = calculateMagValue(hall_left) - hall_left.magOffset;
  float magRightRaw = calculateMagValue(hall_right) - hall_right.magOffset;

  // --- Mediaanfilter ---
  float magLeft = medianFilter(magLeftRaw, leftWindow, FILTER_SIZE);
  float magRight = medianFilter(magRightRaw, rightWindow, FILTER_SIZE);

  // --- Extra lichte smoothing na median (optioneel) ---
  if (firstRead) {
    filteredMagLeft = magLeft;
    filteredMagRight = magRight;
    firstRead = false;
  }
  filteredMagLeft = alpha * magLeft + (1 - alpha) * filteredMagLeft;
  filteredMagRight = alpha * magRight + (1 - alpha) * filteredMagRight;

  Serial.printf("Lfilt: %.1f \t Rfilt: %.1f \t", filteredMagLeft, filteredMagRight);

  updateMaxMin(filteredMagLeft, filteredMagRight);
  followLinePID(filteredMagLeft, filteredMagRight);
}
