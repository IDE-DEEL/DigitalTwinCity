#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "mqtt.hpp"
#include "rfid.hpp"
#include "magnetometer.hpp"
#include "MagnetometerManager.hpp"
#include "PID.hpp"
#include "Motion.hpp"

#define USE_MQTT 1
#define USE_RFID 1
#define USE_MAGNETOMETER 1
#define USE_PID 1
#define USE_MOTION 1

// ---- Wi-Fi ----
#ifndef CFG_WIFI_SSID
#define CFG_WIFI_SSID ""
#endif
#ifndef CFG_WIFI_PSK
#define CFG_WIFI_PSK ""
#endif
const char *WIFI_SSID = CFG_WIFI_SSID;
const char *WIFI_PASS = CFG_WIFI_PSK;

#if USE_PID
static PID pidController;
#endif // USE_PID

#if USE_MOTION
static Motion motionController;
#endif // USE_MOTION

// TLS client and wrappers
#if USE_MQTT
static WiFiClientSecure tlsClient;
static MQTTWrapper mqtt(tlsClient);
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

#if USE_MQTT
void ensureWifi()
{
  if (WiFi.status() == WL_CONNECTED)
    return;

  Serial.printf("WiFi: connecting to %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  Serial.printf("Set WiFi mode to STA\n");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("Started WiFi connection\n");

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\nWiFi: connected, IP=%s\n", WiFi.localIP().toString().c_str());
}
#endif // USE_MQTT

void freeze()
{
  Serial.println("Freezing...");
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

  // MQTT initialization
#if USE_MQTT
  ensureWifi();
  mqtt.connectWithPsk();
#endif // USE_MQTT

  // Magnetometer initialization
#if USE_MAGNETOMETER
  magManager.add(&magLeft);
  magManager.add(&magRight);
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
  pidController.reset();
#endif // USE_PID

#if USE_MOTION
  motionController.init();
#endif // USE_MOTION

  // Wait before starting loop so initialization messages can be read.
  Serial.println("Setup complete, starting main loop in 5 seconds...");
  delay(5000);
}

void loop()
{

  // Ensure Wi-Fi connection
#if USE_MQTT
  if (WiFi.status() != WL_CONNECTED)
    ensureWifi();

  // MQTT connection handling
  if (!mqtt.connected())
  {
    // Retry connection every 3 seconds
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 3000)
    {
      lastRetry = millis();
      mqtt.connectWithPsk();
    }
  }
  else
  {
    mqtt.loop();
  }
#endif // USE_MQTT

  // RFID polling
#if USE_RFID
  String uidHex = rfid.poll();
  if (uidHex.length())
  {
#if USE_MQTT
    rfid.publishRFID(mqtt, uidHex);
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
    freeze();
  }
  float pidOutput = pidController.compute(
      magLeft.getProcessedSample(),
      magRight.getProcessedSample());
  //Serial.printf("PID Output: %.2f\n", pidOutput);
#else
  float pidOutput = 0.0f;
#endif // USE_PID

#if USE_MOTION && USE_PID
  motionController.setSteeringAngle(FORWARD_ANGLE + pidOutput);
  motionController.drive(100);
#endif // USE_MOTION

#if USE_MOTION && !USE_PID
  motionController.setSteeringAngle(FORWARD_ANGLE + pidOutput);
  motionController.setSpeed(100);
#endif // USE_MOTION
}
