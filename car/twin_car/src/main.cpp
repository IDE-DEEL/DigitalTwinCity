#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "mqtt.hpp"
#include "rfid.hpp"
#include "magnetometer.hpp"
#include "MagnetometerManager.hpp"
#include "readjson.hpp"

// Define the external symbols for the embedded JSON file
extern const char rfid_json_start[] asm("_binary_include_rfid_json_start");
extern const char rfid_json_end[]   asm("_binary_include_rfid_json_end");

#define USE_MQTT 1
#define USE_RFID 1
#define USE_MAGNETOMETER 0
#define USE_JSON 1


#if USE_JSON
JsonDocument rfidDoc;
#endif // USE_JSON

// ---- Wi-Fi ----
const char* WIFI_SSID = "Xiaomi 12T Pro";
const char* WIFI_PASS = "Test1234";

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
    .filter = MLX90393_FILTER_3 };
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
  WiFi.begin(WIFI_SSID, WIFI_PASS);

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
  // Load JSON data from embedded file
  // Calculate length of the embedded file
  const size_t len = rfid_json_end - rfid_json_start;
  DeserializationError error = deserializeJson(rfidDoc, rfid_json_start, len);
  
  if(!error){
      Serial.println("JSON Read Success");
  } else {
      Serial.print("JSON Read Failed: ");
      Serial.println(error.c_str());
  }
#endif // USE_JSON

  // Wait before starting loop so initialization messages can be read.
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
#if USE_MAGNETOMETER
  int ret = magManager.updateAll();
  if (ret)
  {
    Serial.printf("Magnetometer update error: %d\n", ret);
    freeze();
  }
  Serial.printf("Mag Left: %.2f | Mag Right: %.2f\n",
    magLeft.getFilteredMagnitude(),
    magRight.getFilteredMagnitude());
#endif // USE_MAGNETOMETER
}
