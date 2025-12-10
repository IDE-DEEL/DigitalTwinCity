#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "Connectivity.hpp"
#include "rfid.hpp"
#include "magnetometer.hpp"
#include "MagnetometerManager.hpp"
#include "PID.hpp"
#include "PIDManager.hpp"
#include "Motion.hpp"

#define USE_MQTT 1
#define USE_RFID 0
#define USE_MAGNETOMETER 0
#define USE_PID 0
#define USE_MOTION 0

const char *WIFI_SSID = DEEL_WIFI_SSID;
const char *WIFI_PASS = DEEL_WIFI_PSK;

#if USE_PID
static PIDManager pidManager;
#endif // USE_PID

#if USE_MOTION
static Motion motionController;
#endif // USE_MOTION

// Connectivity (Wi-Fi + MQTT)
#if USE_MQTT
static Connectivity connectivity(WIFI_SSID, WIFI_PASS);
#endif // USE_MQTT

// RFID reader
#if USE_RFID
static RFIDReader rfid;
#endif // USE_RFID

// Magnetometer objects
#if USE_MAGNETOMETER
struct mag_config magConfig = {
    .gain = MLX90393_GAIN_1X,
    .resolution = MLX90393_RES_16,
    .osr = MLX90393_OSR_0,
    .filter = MLX90393_FILTER_3};
Magnetometer magLeft(MAGNETOMETER_LEFT, magConfig);
Magnetometer magRight(MAGNETOMETER_RIGHT, magConfig);
MagnetometerManager magManager;
#endif // USE_MAGNETOMETER

void freeze()
{
  Serial.println("Freezing...");
#if USE_MOTION
  motionController.drive(0);
#endif // USE_MOTION
  while (1)
  {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(200);
    digitalWrite(LED_BUILTIN, LOW);
    delay(200);
  }
}

void setup()
{
  // Serial initialization
  Serial.begin(115200);
  delay(200);

  // RFID initialization
#if USE_RFID
  rfid.begin();
#endif // USE_RFID

  // Connectivity (Wi-Fi + MQTT) initialization
#if USE_MQTT
  connectivity.begin();
#endif // USE_MQTT

  // Magnetometer initialization
#if USE_MAGNETOMETER
  magManager.add(&magRight);
  magManager.add(&magLeft);
  int ret = magManager.initAll();
  if (ret)
  {
    Serial.printf("Magnetometer initialization error: %d\n", ret);
    freeze();
  }
  ret = magManager.calibrateAll();
  if (ret)
  {
    Serial.printf("Magnetometer calibration error: %d\n", ret);
    freeze();
  }
#endif // USE_MAGNETOMETER

#if USE_PID
  pidManager.reset();
#endif // USE_PID

#if USE_MOTION
  motionController.init();
#endif // USE_MOTION

  // Wait before starting loop so initialization messages can be read.
  Serial.println("Setup complete, starting main loop in 5 seconds...");
  delay(5000);
  Serial.println("Starting main loop now.");
}

void loop()
{
  // Wi-Fi + MQTT connection handling
#if USE_MQTT
  connectivity.loop();
#endif // USE_MQTT

  // RFID polling
#if USE_RFID
  String uidHex = rfid.poll();
  if (uidHex.length())
  {
  #if USE_MQTT
    // JSON payload: {"uid":"ABCD1234","ms":123456}
    String payload = "{\"uid\":\"" + uidHex + "\",\"ms\":" + String(millis()) + "}";
    connectivity.publish(PUB_TOPIC_RFID, payload);
  #else
    Serial.printf("RFID UID: %s\n", uidHex.c_str());
  #endif // USE_MQTT
  }
#endif // USE_RFID

  // Magnetometer updating
#if USE_MAGNETOMETER && !USE_PID
  int ret = magManager.updateAll();
  if (ret)
  {
    Serial.printf("Magnetometer update error: %d\n", ret);
    freeze();
  }
  // Serial.printf("Mag Left: %.2f | Mag Right: %.2f\n",
  //               magLeft.getFilteredMagnitude(),
  //               magRight.getFilteredMagnitude());
#endif // USE_MAGNETOMETER

#if USE_PID && USE_MAGNETOMETER
  int ret = magManager.updateAll();
  if (ret)
  {
    Serial.printf("Magnetometer update error: %d\n", ret);
    static int err_count = 0;
    err_count++;
    if (err_count >= 5)
    {
      freeze();
    } else {
      return;
    }
  }
  float pidOutput = pidManager.compute(
      STRAIGHT,
      magLeft.getProcessedSample(),
      magRight.getProcessedSample());
  //Serial.printf("PID Output: %.2f\n", pidOutput);
#else
  float pidOutput = 0.0f;
#endif // USE_PID

#if USE_MOTION && USE_PID
  motionController.setSteeringAngle(FORWARD_ANGLE - pidOutput);
  static bool firstRun = true;
  if (firstRun) {
  motionController.drive(100);
  firstRun = false;
  }
#endif // USE_MOTION

#if USE_MOTION && !USE_PID
  motionController.setSteeringAngle(FORWARD_ANGLE + pidOutput);
  motionController.setSpeed(100);
#endif // USE_MOTION
}
