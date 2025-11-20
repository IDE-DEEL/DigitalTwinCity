#include <Arduino.h>
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "mqtt.hpp"
#include "rfid.hpp"
#include "magnetometer.hpp"
#include "MagnetometerManager.hpp"

// ---- Wi-Fi ----
const char *WIFI_SSID = "WiFi_SSID";
const char *WIFI_PASS = "WiFi_password";

// TLS client and wrappers
static WiFiClientSecure tlsClient;
static MQTTWrapper mqtt(tlsClient);
static RFIDReader rfid;

// Magnetometer objects
struct mag_config magConfig = {
    .gain = MLX90393_GAIN_1X,
    .resolution = MLX90393_RES_16,
    .osr = MLX90393_OSR_0,
    .filter = MLX90393_FILTER_3};
Magnetometer magLeft(MAGNETOMETER_LEFT, magConfig);
Magnetometer magRight(MAGNETOMETER_RIGHT, magConfig);
MagnetometerManager magManager;

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

void setup()
{
  // Serial initialization
  Serial.begin(115200);
  delay(200);

  // RFID initialization
  rfid.begin();

  // MQTT initialization
  ensureWifi();
  mqtt.connectWithPsk();

  // Magnetometer initialization
  magManager.add(&magLeft);
  magManager.add(&magRight);
  int ret = magManager.initAll();
  if (ret)
  {
    Serial.printf("Magnetometer initialization error: %d\n", ret);
  }
  ret = magManager.calibrateAll();
  if (ret)
  {
    Serial.printf("Magnetometer calibration error: %d\n", ret);
  }
}

void loop()
{

  // Ensure Wi-Fi connection
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

  // RFID polling
  String uidHex = rfid.poll();
  if (uidHex.length())
  {
    rfid.publishRFID(mqtt, uidHex);
  }

  // Magnetometer updating
  int ret = magManager.updateAll();
  if (ret)
  {
    Serial.printf("Magnetometer update error: %d\n", ret);
  }
  Serial.printf("Mag Left: %.2f | Mag Right: %.2f\n",
                magLeft.getFilteredMagnitude(),
                magRight.getFilteredMagnitude());
}
