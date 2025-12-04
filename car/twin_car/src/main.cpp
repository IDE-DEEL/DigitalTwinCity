#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <FS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

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
const char *WIFI_SSID = "";
const char *WIFI_PASS = "";

// JSON document for RFID tags
#if USE_JSON
JsonDocument rfidDoc;
#endif // USE_JSON

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

#if USE_JSON
  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed");
    return;
  }
  File file = LittleFS.open("/rfid.json", "r");
  if (!file) {
    Serial.println("Failed to open file for reading");
    return;
  }
  DeserializationError error = deserializeJson(rfidDoc, file);
  file.close();
  if (!error) {
    Serial.println("JSON Read Success");
  } else {
    Serial.print("JSON Read Failed: ");
    Serial.println(error.c_str());
  }
#endif // USE_JSON

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
    Serial.printf("RFID UID: %s\n", uidHex.c_str());
    #endif // USE_MQTT

    #if USE_JSON
    // Look up the tag in the JSON data
    JsonArray tags = rfidDoc["rfid_tags"];
    bool found = false;
    for (JsonObject tag : tags) {
      if (tag["tag_id"] == uidHex) {
        found = true;
        
        // Create a new document for the payload
        JsonDocument payloadDoc;
        payloadDoc["tag_id"] = tag["tag_id"];
        payloadDoc["name"] = tag["name"];
        payloadDoc["location"] = tag["location"];
        
        String payload;
        serializeJson(payloadDoc, payload);
        #if USE_MQTT
        Serial.println("Tag Found in Database:");
        Serial.println(payload);
        if (mqtt.connected()) {
           mqtt.publish("esp32-01/out", payload.c_str());
        }
        #endif // USE_MQTT
        break;
      }
    }
    #endif // USE_JSON
    #endif // USE_RFID
  }

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
