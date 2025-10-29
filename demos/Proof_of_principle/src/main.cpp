#include <Arduino.h>
#include <ESP32Servo.h>
#include <map>
#include <Wire.h>
#include "Adafruit_MLX90393.h"

#define SDA_PIN 21
#define SCL_PIN 22

#define motor 25 // GPIO 25 (motor)
// create servo object to control a servo
Servo servo;

// Aantal samples voor het mediaanfilter
#define MEDIAN_WINDOW 5

// Create sensor object
Adafruit_MLX90393 sensor = Adafruit_MLX90393();

// Buffers voor medianfilter
float xBuffer[MEDIAN_WINDOW];
float yBuffer[MEDIAN_WINDOW];
float zBuffer[MEDIAN_WINDOW];
int sampleIndex = 0;
bool bufferFilled = false;

// Functie om median te berekenen uit een float array
float median(float *arr, int size) {
  float temp[size];
  memcpy(temp, arr, sizeof(float) * size);
  // Sorteer array (eenvoudige bubblesort, voldoende voor kleine arrays)
  for (int i = 0; i < size - 1; i++) {
    for (int j = i + 1; j < size; j++) {
      if (temp[j] < temp[i]) {
        float t = temp[i];
        temp[i] = temp[j];
        temp[j] = t;
      }
    }
  }
  // Retourneer middelste waarde
  return temp[size / 2];
}

void Links(int graden) {
  servo.write(90 + graden);
}

void Rechts(int graden) {
  servo.write(90 - graden);
}

void Vooruit() {
  servo.write(90);
}

void Rijden_aan() {
  digitalWrite(motor, HIGH);

}

void Rijden_uit() {
  digitalWrite(motor, LOW);

}

void setup(void)
{
  Serial.begin(115200);
  while (!Serial) delay(10);
  // set servo
  servo.setPeriodHertz(50);
  servo.attach(26, 500, 2400); // Optional: improve servo accuracy
  servo.write(90); // tell servo to go to base position

  // set motor pin
  pinMode(motor, OUTPUT);

  Serial.println("Starting Adafruit MLX90393 I2C Demo with Median Filter");

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!sensor.begin_I2C(0x0C, &Wire)) {
    Serial.println("❌ No sensor found ... check your wiring!");
    while (1) delay(10);
  }

  Serial.println("✅ Found a MLX90393 sensor");

  sensor.setGain(MLX90393_GAIN_1X);
  sensor.setResolution(MLX90393_X, MLX90393_RES_17);
  sensor.setResolution(MLX90393_Y, MLX90393_RES_17);
  sensor.setResolution(MLX90393_Z, MLX90393_RES_16);
  sensor.setOversampling(MLX90393_OSR_3);
  sensor.setFilter(MLX90393_FILTER_5);

  Serial.println("Setup complete.\n");
}

void loop(void)
{
  float x, y, z;

  // Lees de sensorwaarden
  if (sensor.readData(&x, &y, &z)) {

    // Sla nieuwe waarden op in buffer
    xBuffer[sampleIndex] = x;
    yBuffer[sampleIndex] = y;
    zBuffer[sampleIndex] = z;

    // Update index
    sampleIndex++;
    if (sampleIndex >= MEDIAN_WINDOW) {
      sampleIndex = 0;
      bufferFilled = true;
    }

    // Bereken gefilterde waarden pas als buffer gevuld is
    if (bufferFilled) {
      float xMed = median(xBuffer, MEDIAN_WINDOW);
      float yMed = median(yBuffer, MEDIAN_WINDOW);
      float zMed = median(zBuffer, MEDIAN_WINDOW);

      Serial.print("Filtered -> X: "); Serial.print(xMed, 4); Serial.print(" uT\t");
      Serial.print("Y: "); Serial.print(yMed, 4); Serial.print(" uT\t");
      Serial.print("Z: "); Serial.print(zMed, 4); Serial.println(" uT");
    } else {
      Serial.println("Collecting samples for median filter...");
    }

  } else {
    Serial.println("⚠️ Unable to read XYZ data from sensor!");
  }

  delay(100);
}