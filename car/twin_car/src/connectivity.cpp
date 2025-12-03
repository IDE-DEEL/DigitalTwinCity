// src/Connectivity.cpp

#include "Connectivity.hpp"

// Verwacht dat deze defines ergens ander in het project aanwezig zijn:
// #define BROKER_HOST ...
// #define BROKER_PORT ...
// #define PSK_IDENTITY ...
// #define PSK_HEX ...
// #define MQTT_CLIENT_ID ...
// #define SUB_TOPIC_CMD ...
// #define PUB_TOPIC_OUT ...

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

void Connectivity::onMqttMessageStatic(char* topic, byte* payload, unsigned int len)
{
    // default handler : loggen naar Serial.
    Serial.printf("MQTT <- [%s]\n", topic);
    Serial.println(String(reinterpret_cast<const char*>(payload), len));
}

void Connectivity::onMqttMessage(char* topic, byte* payload, unsigned int len)
{
    // Instance specifiek handler als deze later nodig is.
    (void)topic;
    (void)payload;
    (void)len;
}
