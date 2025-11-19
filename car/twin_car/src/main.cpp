#include <Arduino.h>
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "mqtt.hpp"
#include "rfid.hpp"

// ---- Wi-Fi ----
const char *WIFI_SSID = "WiFi_SSID";
const char *WIFI_PASS = "WiFi_password";

// TLS client and wrappers
static WiFiClientSecure tlsClient;
static MQTTWrapper mqtt(tlsClient);
static RFIDReader rfid;

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
  Serial.begin(115200);
  delay(200);

  rfid.begin();

  ensureWifi();
  mqtt.connectWithPsk();
}

void loop()
{
  if (WiFi.status() != WL_CONNECTED)
    ensureWifi();

  if (!mqtt.connected())
  {
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
}
