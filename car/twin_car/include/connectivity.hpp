// include/Connectivity.hpp

#ifndef CONNECTIVITY_HPP
#define CONNECTIVITY_HPP

#define BROKER_HOST "IP"
#define BROKER_PORT 8883
#define PSK_IDENTITY "ID"
#define PSK_HEX "PASS"

#define SUB_TOPIC_CMD "test/to-web"
#define PUB_TOPIC_OUT "test/to-web"
#define PUB_TOPIC_RFID "test/to-web"

#define MQTT_CLIENT_ID PSK_IDENTITY

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

/**
 * @brief Connectivity class
 *
 * Verantwoordelijk voor:
 * - Wi-Fi initialisatie en reconnect
 * - MQTT initialisatie en reconnect
 * - Publiceren van berichten naar MQTT
 *
 * Gebruik:
 * 1. Connectivity connectivity(WIFI_SSID, WIFI_PASS);
 * 2. connectivity.begin() in setup()
 * 3. connectivity.loop() in loop()
 * 4. connectivity.publish(...) om berichten te versturen
 */
class Connectivity
{
public:
    /**
     * @brief Construct a new Connectivity object
     * @param ssid Wi-Fi SSID
     * @param pass Wi-Fi wachtwoord
     */
    Connectivity(const char* ssid, const char* pass);

    /**
     * @brief Initialiseer Wi-Fi en MQTT.
     * Roept intern ensureWifi() en connectMqtt() aan.
     */
    void begin();

    /**
     * @brief Houd Wi-Fi en MQTT in de lucht.
     * - Reconnect Wi-Fi indien nodig.
     * - Reconnect MQTT met een retry-interval.
     * - Roept mqtt.loop() aan indien verbonden.
     */
    void loop();

    /**
     * @brief Publiceer MQTT-bericht met C-string payload.
     * @param topic MQTT-topic
     * @param payload Payload (C-string)
     * @param retained Retained-flag
     * @return true bij succes, anders false
     */
    bool publish(const char* topic, const char* payload, bool retained = false);

    /**
     * @brief Publiceer MQTT-bericht met String payload.
     * @param topic MQTT-topic
     * @param payload Payload (String)
     * @param retained Retained-flag
     * @return true bij sucess, anders false
     */
    bool publish(const char* topic, const String& payload, bool retained = false);

    /**
     * @brief Stel standaard output-topic in.
     * @param topic MQTT-topic wat als default gebruikt wordt.
     */
    void setDefaultPubTopic(const char* topic);

    /**
     * @brief Publiceer naar het standaard output-topic.
     * @param payload Payload (String)
     * @param retained Retained-flag
     * @return true bij succes, anders false
     */
    bool publishDefault(const String& payload, bool retained = false);

       /**
     * @brief Type voor externe MQTT-bericht handler functie.
     *
     * De callback wordt aangeroepen wanneer er een MQTT-bericht binnenkomt.
     * @param topic Het MQTT-topic als C-string (null-terminated).
     * @param payload De payload bytes.
     * @param len Lengte van de payload in bytes.
     *
     * @note De functie wordt door de Connectivity-klasse in de context van de
     * MQTT-callback aangeroepen. Implementaties moeten snel zijn en geen
     * langlopende blocking operaties uitvoeren.
     */
    typedef void (*ExternalMqttHandler)(const char* topic, byte* payload, unsigned int len);

    /**
     * @brief Registreer een externe handler voor inkomende MQTT-berichten.
     *
     * Wanneer ingesteld wordt de meegegeven callback aangeroepen door de
     * interne MQTT-callback (`onMqttMessageStatic`). Dit biedt een lichte
     * extensiepunt voor andere modules (bijv. ReservationManager) zonder de
     * bestaande MQTT-logica te wijzigen.
     *
     * @param h Pointer naar een functie die berichten afhandelt. Geef `nullptr`
     *          om de handler te verwijderen.
     */
    static void setExternalHandler(ExternalMqttHandler h);

    /**
     * @brief Abonneer op een MQTT-topic.
     *
     * Wrapper rond de onderliggende PubSubClient `subscribe`-functie zodat
     * andere modules eenvoudig topics kunnen subscriben via de `Connectivity`-instantie.
     *
     * @param topic Het MQTT-topic om op te abonneren (C-string).
     * @param qos Quality of Service niveau (default 1).
     * @return true bij succesvolle subscribe, false bij falen.
     */
    bool subscribe(const char* topic, int qos = 1);

    /**
     * @brief Controleer of MQTT verbonden is.
     * @return true als MQTT verbonden is.
     */
    bool connected();

    /**
     * @brief Haal MQTT-status op.
     * @return MQTT status code (PubSubClient::state()).
     */
    int state();

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

        /** Externe handler pointer (default: nullptr). */
    static ExternalMqttHandler _externalHandler;

    const char* _defaultPubTopic = nullptr;
    unsigned long _lastMqttRetry = 0;
};

#endif // CONNECTIVITY_HPP
