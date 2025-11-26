#pragma once

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// Bestaande defines:
// #define BROKER_HOST ...
// #define BROKER_PORT ...
// #define PSK_IDENTITY ...
// #define PSK_HEX ...
// #define MQTT_CLIENT_ID ...
// #define SUB_TOPIC_CMD ...
// #define PUB_TOPIC_OUT ...

class Connectivity
{
public:
    Connectivity(const char* ssid, const char* pass);

    void begin();      // init Wi-Fi + MQTT
    void loop();       // Wi-Fi en MQTT in de lucht houden

    bool publish(const char* topic, const char* payload, bool retained = false);
    bool publish(const char* topic, const String& payload, bool retained = false);

    bool connected() const;
    int  state() const;

    // Optionele helper voor “default output topic”
    void setDefaultPubTopic(const char* topic);
    bool publishDefault(const String& payload, bool retained = false);

private:
    void ensureWifi();
    bool connectMqtt();

    static void onMqttMessageStatic(char* topic, byte* payload, unsigned int len);
    void onMqttMessage(char* topic, byte* payload, unsigned int len);

private:
    const char* _ssid;
    const char* _pass;

    WiFiClientSecure _tlsClient;
    PubSubClient     _mqtt;

    const char* _defaultPubTopic = nullptr;
    unsigned long _lastMqttRetry = 0;
};
