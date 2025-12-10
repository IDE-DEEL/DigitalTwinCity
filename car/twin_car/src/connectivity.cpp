// src/Connectivity.cpp

#include "Connectivity.hpp"
#include <WiFi.h>

Connectivity::Connectivity(const char* ssid, const char* pass)
    : _ssid(ssid),
      _pass(pass),
      _tlsClient(),
      _mqtt(_tlsClient)
{
}

void Connectivity::ensureWifi()
{
    if (WiFi.status() == WL_CONNECTED)
        return;

    Serial.printf("WiFi: connecting to %s ...\n", _ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(_ssid, _pass);

    while (WiFi.status() != WL_CONNECTED)
    {
        delay(400);
        Serial.print(".");
    }
    Serial.printf("\nWiFi: connected, IP=%s\n", WiFi.localIP().toString().c_str());
}

bool Connectivity::connectMqtt()
{
    _tlsClient.setPreSharedKey(PSK_IDENTITY, PSK_HEX);

    _mqtt.setServer(BROKER_HOST, BROKER_PORT);
    _mqtt.setCallback(Connectivity::onMqttMessageStatic);

    Serial.printf("MQTT: connecting to %s:%u ...\n", BROKER_HOST, BROKER_PORT);
    if (!_mqtt.connect(MQTT_CLIENT_ID))
    {
        Serial.printf("MQTT connect failed, state=%d\n", _mqtt.state());
        return false;
    }

    Serial.println("MQTT: connected (TLS-PSK)");
    _mqtt.subscribe(SUB_TOPIC_CMD, 1);
    // Geen "(rfid ready)" meer, deze klasse weet niets van specifieke sensoren.
    _mqtt.publish(PUB_TOPIC_OUT, "esp32 online", true);

    _defaultPubTopic = PUB_TOPIC_OUT;

    return true;
}

void Connectivity::begin()
{
    ensureWifi();
    connectMqtt();
}

void Connectivity::loop()
{
    // Wi-Fi
    if (WiFi.status() != WL_CONNECTED)
        ensureWifi();

    // MQTT
    if (!_mqtt.connected())
    {
        if (millis() - _lastMqttRetry > 3000)
        {
            _lastMqttRetry = millis();
            (void)connectMqtt();
        }
    }
    else
    {
        _mqtt.loop();
    }
}

bool Connectivity::publish(const char* topic, const char* payload, bool retained)
{
    return _mqtt.publish(topic, payload, retained);
}

bool Connectivity::publish(const char* topic, const String& payload, bool retained)
{
    return _mqtt.publish(topic, payload.c_str(), retained);
}

void Connectivity::setDefaultPubTopic(const char* topic)
{
    _defaultPubTopic = topic;
}

bool Connectivity::publishDefault(const String& payload, bool retained)
{
    if (!_defaultPubTopic)
        return false;
    return publish(_defaultPubTopic, payload, retained);
}

bool Connectivity::connected()
{
    return _mqtt.connected();
}

int Connectivity::state()
{
    return _mqtt.state();
}

// Definitie van de static externe handler
Connectivity::ExternalMqttHandler Connectivity::_externalHandler = nullptr;

void Connectivity::setExternalHandler(ExternalMqttHandler h) {
    Connectivity::_externalHandler = h;
}

bool Connectivity::subscribe(const char* topic, int qos) {
    return _mqtt.subscribe(topic, qos);
}

void Connectivity::onMqttMessage(char* topic, byte* payload, unsigned int len)
{
    // Default: geen instance-specifieke logica.
    // Als je instance-gebonden verwerking wilt, voeg die hier toe.
    (void)topic;
    (void)payload;
    (void)len;
}

void Connectivity::onMqttMessageStatic(char* topic, byte* payload, unsigned int len)
{
    // logging (bestaande stijl)
    Serial.printf("MQTT <- [%s]\n", topic);
    Serial.println(String(reinterpret_cast<const char*>(payload), len));

    // call instance handler? (optioneel)
    // Als je per-instance verwerking wilt, roep die hier aan,
    // bijvoorbeeld: someSingletonInstance.onMqttMessage(topic, payload, len);
    // In deze code gebruiken we de externe handler mechanismen:
    if (Connectivity::_externalHandler) {
        Connectivity::_externalHandler(topic, payload, len);
    }
}
