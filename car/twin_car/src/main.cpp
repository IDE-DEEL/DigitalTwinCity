#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "Connectivity.hpp"
#include "rfid.hpp"
#include "magnetometer.hpp"
#include "MagnetometerManager.hpp"
#include "PID.hpp"
#include "Motion.hpp"
#include "ReservationManager.hpp"

#define USE_MQTT 1
#define USE_RFID 1
#define USE_MAGNETOMETER 1
#define USE_PID 1
#define USE_MOTION 1
#define USE_RESERVATION 1

// ---- Wi-Fi ----
const char* WIFI_SSID = "";
const char* WIFI_PASS = "";

#if USE_PID
static PID pidController;
#endif // USE_PID

#if USE_MOTION
static Motion motionController;
#endif // USE_MOTION

// Reservation manager
#if USE_RESERVATION
static ReservationManager reservationManager;
#endif // USE_RESERVATION

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

  // Connectivity (Wi-Fi + MQTT) initialization
#if USE_MQTT
  connectivity.begin();
  reservationManager.begin(&connectivity, "car-1"); // pas clientId aan indien nodig
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
      String payload = "{\"uid\":\"" + uidHex + "\",\"ms\":" + String(millis()) + "}";
      connectivity.publish(PUB_TOPIC_RFID, payload);
  #else
      Serial.printf("RFID UID: %s\n", uidHex.c_str());
  #endif

      // --- map tags naar segment events (pas aan voor jouw tags) ---
      struct TagMap { const char* uid; const char* segmentId; const char* event; };
      static const TagMap tagMap[] = {
          {"ABCD1234", "A1", "enter"},
          {"ABCD5678", "A1", "exit"},
          // voeg tags toe (uppercase hex)
      };

      String segId = "";
      String evt = "";
      for (auto &t : tagMap) {
          if (uidHex.equalsIgnoreCase(t.uid)) {
              segId = String(t.segmentId);
              evt = String(t.event);
              break;
          }
      }

      // opslag voor reservation_ids per segment
      static const int MAX_STORED = 8;
      static String storedSeg[MAX_STORED];
      static String storedResId[MAX_STORED];
      static int storedCount = 0;

      auto storeReservation = [&](const String& sid, const String& rid){
          for (int i=0;i<storedCount;i++){
              if (storedSeg[i] == sid) { storedResId[i] = rid; return; }
          }
          if (storedCount < MAX_STORED) {
              storedSeg[storedCount] = sid;
              storedResId[storedCount] = rid;
              storedCount++;
          }
      };
      auto getReservation = [&](const String& sid)->String{
          for (int i=0;i<storedCount;i++){
              if (storedSeg[i] == sid) return storedResId[i];
          }
          return String("");
      };
      auto clearReservation = [&](const String& sid){
          for (int i=0;i<storedCount;i++){
              if (storedSeg[i] == sid) {
                  for (int j=i;j<storedCount-1;j++){
                      storedSeg[j]=storedSeg[j+1];
                      storedResId[j]=storedResId[j+1];
                  }
                  storedSeg[storedCount-1] = "";
                  storedResId[storedCount-1] = "";
                  storedCount--;
                  return;
              }
          }
      };

      if (segId.length()) {
          if (evt == "enter") {
              Serial.printf("RFID ENTER for %s -> requesting reservation\n", segId.c_str());

  #if USE_MOTION
              motionController.setSpeed(0); // stop tijdelijk voordat we wachten
  #endif

              String reservationId;
              bool ok = reservationManager.requestReservation(segId, 60000, reservationId, 10000, 1500);
              if (ok) {
                  Serial.printf("Reservation granted for %s => %s\n", segId.c_str(), reservationId.c_str());
                  storeReservation(segId, reservationId);

  #if USE_MOTION
                  motionController.drive(100); // resume (pas aan)
  #endif
              } else {
                  Serial.printf("Reservation failed for %s\n", segId.c_str());
                  // fallback: blijf wachten of voer alternatieve actie uit
              }
          } else if (evt == "exit") {
              Serial.printf("RFID EXIT for %s -> releasing reservation\n", segId.c_str());
              String rid = getReservation(segId);
              bool ok = reservationManager.releaseReservation(segId, rid, 5000);
              if (ok) {
                  Serial.printf("Released %s\n", segId.c_str());
                  clearReservation(segId);
              } else {
                  Serial.printf("Release failed for %s\n", segId.c_str());
              }
          }
      } else {
          Serial.printf("RFID UID %s not mapped to a segment\n", uidHex.c_str());
      }
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
