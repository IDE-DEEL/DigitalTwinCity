#include "ReservationManager.hpp"
#include <ArduinoJson.h>

ReservationManager* ReservationManager::_instance = nullptr;

ReservationManager::ReservationManager()
    : _conn(nullptr), _clientId("car"), _pendingNonce(""), _lastResponseTopic(""),
      _lastResponsePayload(""), _gotResponse(false)
{
}

void ReservationManager::begin(Connectivity* connectivity, const char* clientId)
{
    _conn = connectivity;
    if (clientId && strlen(clientId) > 0) _clientId = String(clientId);

    if (_conn) {
        // subscribe op response topics en registreer static handler 
        _conn->subscribe("track/segments/+/response", 1);
        _instance = this;
        Connectivity::setExternalHandler(ReservationManager::staticMqttHandler);
    }
}

// static wrapper om MQTT callbacks aan deze instance door te geven
void ReservationManager::staticMqttHandler(const char* topic, byte* payload, unsigned int len)
{
    if (_instance) _instance->handleMqttMessage(topic, payload, len);
}

void ReservationManager::handleMqttMessage(const char* topic, byte* payload, unsigned int len)
{
    _lastResponseTopic = String(topic);
    _lastResponsePayload = String(reinterpret_cast<const char*>(payload), len);
    _gotResponse = true;
}

String ReservationManager::makeNonce()
{
    String n = String(millis()) + "-" + String(random(0x10000), HEX);
    return n;
}

bool ReservationManager::requestReservation(const String& segmentId, unsigned long leaseMs, String& outReservationId,
                                            unsigned long timeoutMs, unsigned long retryIntervalMs)
{
    if (!_conn) return false;

    while (true) {
        String nonce = makeNonce();
        _pendingNonce = nonce;
        _gotResponse = false;
        _lastResponsePayload = "";

        StaticJsonDocument<256> doc;
        doc["action"] = "reserve";
        doc["client_id"] = _clientId;
        doc["ttl_ms"] = leaseMs;
        doc["timestamp"] = millis();
        doc["nonce"] = _pendingNonce;

        String payload;
        serializeJson(doc, payload);

        String topic = "track/segments/" + segmentId + "/request";
        Serial.printf("ReservationManager: publish reserve -> %s\n", topic.c_str());
        _conn->publish(topic.c_str(), payload, false);

        unsigned long start = millis();
        while (millis() - start < timeoutMs) {
            _conn->loop(); // zorgt dat MQTT events binnenkomen
            if (_gotResponse) {
                StaticJsonDocument<512> resp;
                DeserializationError err = deserializeJson(resp, _lastResponsePayload);
                if (!err) {
                    const char* rnonce = resp["nonce"] | "";
                    const char* status = resp["status"] | "";
                    if (String(rnonce) == _pendingNonce) {
                        if (String(status) == "ok") {
                            outReservationId = String((const char*)(resp["reservation_id"] | ""));
                            Serial.printf("ReservationManager: reserved id=%s\n", outReservationId.c_str());
                            _gotResponse = false;
                            return true;
                        } else {
                            Serial.printf("ReservationManager: reserve denied (%s)\n",
                                          String((const char*)(resp["reason"] | "")).c_str());
                            // break to retry after interval
                            break;
                        }
                    }
                }
                _gotResponse = false;
            }
            delay(50);
        }

        // timeout or denied -> wacht en probeer opnieuw
        Serial.println("ReservationManager: retrying reserve after interval");
        unsigned long tstart = millis();
        while (millis() - tstart < retryIntervalMs) {
            _conn->loop();
            delay(50);
        }
        // loop en blijf proberen (pas aan als je maxAttempts wilt)
    }

    return false; // onbereikbaar in huidige loop-constructie
}

bool ReservationManager::releaseReservation(const String& segmentId, const String& reservationId, unsigned long timeoutMs)
{
    if (!_conn) return false;

    String nonce = makeNonce();
    _pendingNonce = nonce;
    _gotResponse = false;
    _lastResponsePayload = "";

    StaticJsonDocument<256> doc;
    doc["action"] = "release";
    doc["client_id"] = _clientId;
    if (reservationId.length()) doc["reservation_id"] = reservationId;
    doc["timestamp"] = millis();
    doc["nonce"] = _pendingNonce;

    String payload;
    serializeJson(doc, payload);

    String topic = "track/segments/" + segmentId + "/request";
    Serial.printf("ReservationManager: publish release -> %s\n", topic.c_str());
    _conn->publish(topic.c_str(), payload, false);

    unsigned long start = millis();
    while (millis() - start < timeoutMs) {
        _conn->loop();
        if (_gotResponse) {
            StaticJsonDocument<256> resp;
            DeserializationError err = deserializeJson(resp, _lastResponsePayload);
            if (!err) {
                const char* rnonce = resp["nonce"] | "";
                const char* status = resp["status"] | "";
                if (String(rnonce) == _pendingNonce) {
                    if (String(status) == "ok") {
                        Serial.println("ReservationManager: release ok");
                        _gotResponse = false;
                        return true;
                    } else {
                        Serial.println("ReservationManager: release denied");
                        _gotResponse = false;
                        return false;
                    }
                }
            }
            _gotResponse = false;
        }
        delay(50);
    }

    Serial.println("ReservationManager: release timed out");
    return false;
}

void ReservationManager::loop()
{
    // placeholder
}