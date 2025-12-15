#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// ---- Wi-Fi ----
const char* WIFI_SSID = "WiFi_SSID";
const char* WIFI_PASS = "WiFi_password";

// ---- Broker ----
const char* BROKER_HOST = "Broker_Location_IP";
const uint16_t BROKER_PORT = 8883;

// ---- TLS-PSK ----
const char* PSK_IDENTITY = "PSK_IDENTITY";
const char* PSK_HEX      = "PSK_HEX";

// ---- Topics ----
const char* SUB_TOPIC_CMD = "esp32-01/out";
const char* PUB_TOPIC_OUT = "esp32-01/out";
const char* PUB_TOPIC_RFID = "esp32-01/out";

// ---- MQTT clientId ----
const char* MQTT_CLIENT_ID = PSK_IDENTITY;

// ---- MFRC522 SPI ----
#define SS_PIN  21
#define RST_PIN 22
// ESP32 default VSPI: SCK=18, MISO=19, MOSI=23
#define SPI_SCK   18
#define SPI_MISO  19
#define SPI_MOSI  23

WiFiClientSecure tlsClient;
PubSubClient mqtt(tlsClient);
MFRC522 mfrc522(SS_PIN, RST_PIN);

std::string file_path = "demos/MQTT/lib/json_file/rfid.json";

// Debounce / anti-spam
String lastUidHex = "";
unsigned long lastPublishMs = 0;
const unsigned long reannounceMs = 3000; // na 3s zelfde kaart opnieuw toestaan

// ---------- Helpers ----------
static String uidToHex(const MFRC522::Uid& uid) {
  String hex = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) hex += "0";
    hex += String(uid.uidByte[i], HEX);
  }
  hex.toUpperCase();
  return hex;
}

void onMqttMessage(char* topic, byte* payload, unsigned int len) {
  Serial.print("MQTT <- ["); Serial.print(topic); Serial.print("] ");
  for (unsigned int i = 0; i < len; i++) Serial.print((char)payload[i]);
  Serial.println();
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("WiFi: connecting to %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf("\nWiFi: connected, IP=%s\n", WiFi.localIP().toString().c_str());
}

bool mqttConnect() {
  tlsClient.setPreSharedKey(PSK_IDENTITY, PSK_HEX); // TLS-PSK

  mqtt.setServer(BROKER_HOST, BROKER_PORT);
  mqtt.setCallback(onMqttMessage);

  Serial.printf("MQTT: connecting to %s:%u ...\n", BROKER_HOST, BROKER_PORT);
  if (!mqtt.connect(MQTT_CLIENT_ID)) {
    Serial.printf("MQTT connect failed, state=%d\n", mqtt.state());
    return false;
  }

  Serial.println("MQTT: connected (TLS-PSK)");
  mqtt.subscribe(SUB_TOPIC_CMD, 1);
  mqtt.publish(PUB_TOPIC_OUT, "esp32 online (rfid ready)", true);
  return true;
}

void publishRFID(const String& uidHex) {
  // JSON payload: {"uid":"ABCD1234","ms":123456}
  String payload = "{\"uid\":\"" + uidHex + "\",\"ms\":" + String(millis()) + "}";

  Serial.print("RFID -> "); Serial.println(payload);
  mqtt.publish(PUB_TOPIC_RFID, payload.c_str(), false);
}

void setup() {
  Serial.begin(115200);
  delay(200);

  // SPI + MFRC522 init
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SS_PIN);
  mfrc522.PCD_Init();
  delay(50);
  Serial.println("MFRC522 init done");

  const char* json =
    "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";

  // Deserialize the JSON document
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, file_path);
  if (error) {
    Serial.print("deserializeJson() failed: ");
    Serial.println(error.c_str());
  } else {
    const char* sensor = doc["tag_id"];
    long time = doc["segment"];
    Serial.print("Parsed JSON sensor=");
    Serial.print(sensor);
    Serial.print(" time=");
    Serial.println(time);
  }

  ensureWifi();
  mqttConnect();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) ensureWifi();

  if (!mqtt.connected()) {
    static unsigned long lastRetry = 0;
    if (millis() - lastRetry > 3000) {
      lastRetry = millis();
      mqttConnect();
    }
  } else {
    mqtt.loop();
  }

  // RFID polling
  if (!mfrc522.PICC_IsNewCardPresent()) {
    // Als dezelfde kaart lang blijft liggen, reset lastUid na timeout zodat opnieuw gepusht kan worden
    if (lastUidHex.length() && (millis() - lastPublishMs > reannounceMs)) {
      lastUidHex = "";
    }
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) return;

  String uidHex = uidToHex(mfrc522.uid);

  // Debounce: publiceer alleen bij nieuwe UID of na timeout
  if (uidHex != lastUidHex || (millis() - lastPublishMs > reannounceMs)) {
    publishRFID(uidHex);
    lastUidHex = uidHex;
    lastPublishMs = millis();
  }

  // Optioneel: kaart-type loggen
  MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
  Serial.print("Type: "); Serial.println(mfrc522.PICC_GetTypeName(piccType));

  // Kaart netjes stoppen
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
