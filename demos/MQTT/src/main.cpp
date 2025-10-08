#include <WiFi.h>
#include <WiFiClient.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN  21
#define RST_PIN 22

MFRC522 mfrc522(SS_PIN, RST_PIN);

// WiFi
const char *ssid = "Xiaomi 12T Pro";
const char *password = "Test1234";

// MQTT Broker (TLS port 8883)
const char *mqtt_broker = "4.235.121.171";
const char *topic = "emqx/esp32";
const char *mqtt_username = "Testing";
const char *mqtt_password = "Blablabla1";
const int mqtt_port = 1883;

// secure client for TLS
WiFiClient espClient;
PubSubClient client(espClient);

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi ");
  Serial.print(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Wi-Fi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  // create client id from MAC (keeps it unique)
  String client_id = "esp32-client-";
  client_id += WiFi.macAddress();
  while (!client.connected()) {
    Serial.printf("Connecting to MQTT broker as %s ...\n", client_id.c_str());
    if (client.connect(client_id.c_str(), mqtt_username, mqtt_password)) {
      Serial.println("MQTT connected");
      // If you need to subscribe to something, do it here:
      // client.subscribe("some/topic");
    } else {
      Serial.print("MQTT connect failed, rc=");
      Serial.print(client.state());
      Serial.println(" — retrying in 2s");
      delay(2000);
    }
  }
}

String readUIDString(MFRC522::Uid &uid) {
  String s = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
    if (i + 1 < uid.size) s += " ";
  }
  s.toUpperCase();
  return s;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // WiFi
  connectWiFi();

  // TLS setup: for quick testing use insecure. For production, replace with setCACert().
  
  // MQTT
  client.setServer(mqtt_broker, mqtt_port);

  // RFID init
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.println("RFID reader ready - present a card/tag");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();

  // Check for a new card
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Build UID string
  String uidStr = readUIDString(mfrc522.uid);
  Serial.print("UID tag: ");
  Serial.println(uidStr);

  // Build JSON payload (you can change format if you want)
  String payload = "{\"uid\":\"" + uidStr + "\"}";

  // Publish (QoS 0)
  bool ok = client.publish(topic, payload.c_str());
  Serial.print("Published to ");
  Serial.print(topic);
  Serial.print(": ");
  Serial.print(payload);
  Serial.print(" -> ");
  Serial.println(ok ? "OK" : "FAILED");

  // Halt PICC and small delay to avoid duplicate reads
  mfrc522.PICC_HaltA();
}
