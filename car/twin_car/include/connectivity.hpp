#ifndef CONNECTIVITY_HPP
#define CONNECTIVITY_HPP

#define BROKER_HOST DEEL_SERVER_IP
#define BROKER_PORT 8883

#define PSK_IDENTITY "esp32-01"
#define PSK_HEX DEEL_SERVER_PSK

#define SUB_TOPIC_CMD "test/web-to-esp32"
#define PUB_TOPIC_OUT "test/to-web"
#define PUB_TOPIC_RFID "test/to-web"

#define MQTT_CLIENT_ID PSK_IDENTITY
#define MQTT_RETRY_TIME_MS 3000

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <vector>

/**
 * @brief Connectivity class for Wi-Fi and MQTT management
 * 
 * Responsible for:
 * - Wi-Fi initialization and reconnection
 * - MQTT initialization and reconnection
 * - Publishing messages to MQTT
 * - Storing incoming MQTT messages in a queue for later processing
 * 
 * Usage:
 * 1. Create instance: Connectivity connectivity(WIFI_SSID, WIFI_PASS);
 * 2. Call connectivity.begin() in setup()
 * 3. Call connectivity.loop() in loop()
 * 4. Use connectivity.publish(...) to send messages
 * 5. Use getMessage() and eraseProcessedMessage() to handle incoming messages
 */
class Connectivity
{
public:
    /**
     * @brief Construct a new Connectivity object
     * @param ssid Wi-Fi SSID
     * @param pass Wi-Fi Password
     */
    Connectivity(const char* ssid, const char* pass);

    /**
     * @brief Initialize Wi-Fi and MQTT.
     * Internally calls ensureWifi() and connectMqtt().
     */
    void begin();

    /**
     * @brief Keep Wi-Fi and MQTT connected.
     * - Reconnect Wi-Fi if necessary.
     * - Reconnect MQTT with a retry interval.
     * - Calls mqtt.loop() if connected.
     */
    void loop();

    /**
     * @brief Publish MQTT message with C-string payload.
     * @param topic MQTT-topic
     * @param payload Payload (C-string)
     * @param retained Retained-flag
     * @return true on success, otherwise false
     */
    bool publish(const char* topic, const char* payload, bool retained = false);

    /**
     * @brief Publish MQTT message with String payload.
     * @param topic MQTT-topic
     * @param payload Payload (String)
     * @param retained Retained-flag
     * @return true on success, otherwise false
     */
    bool publish(const char* topic, const String& payload, bool retained = false);

    /**
     * @brief Set the default output topic.
     * @param topic MQTT topic to be used as default.
     */
    void setDefaultPubTopic(const char* topic);

    /**
     * @brief Publish to the default output topic.
     * @param payload Payload (String)
     * @param retained Retained-flag
     * @return true on success, otherwise false
     */
    bool publishDefault(const String& payload, bool retained = false);

    /**
     * @brief Check if MQTT is connected.
     * @return true if MQTT is connected.
     */
    bool connected();

    /**
     * @brief Get MQTT status.
     * @return MQTT status code (PubSubClient::state()).
     */
    int state();

    /**
     * @brief Get the pending message payload
     * @param message Reference to String to store the message
     * @return Number of bytes in the message. 0 means no message available.-EBUSY means previous message was not yet processed.
     * @note It is the user's responsibility to erase the message after processing with eraseProcessedMessage()
     */
    int getMessage(String &message);

    /**
     * @brief Clear the message that is currently in the front of the message queue.
     * @note This method should always be called after successfully processing the message.
     */
    void eraseProcessedMessage();

private:

    /**
     * @brief Ensure Wi-Fi is connected, reconnect if necessary.
     * @note This method blocks infinitely until Wi-Fi is connected.
     */
    void ensureWifi();

    /**
     * @brief Connect to the MQTT broker, with retry logic.
     * @return true if connected successfully.
     */
    bool connectMqtt();

    /**
     * @brief MQTT message callback handler.
     * 
     * Stores incoming messages in a queue for later processing.
     * Retrieve messages using getMessage() and mark them as processed with eraseProcessedMessage().
     * @param topic Topic of the incoming message.
     * @param payload Payload of the incoming message.
     * @param len Length of the payload.
     */
    void onMqttMessage(char* topic, byte* payload, unsigned int len);

private:
    const char* _ssid;
    const char* _pass;

    WiFiClientSecure _tlsClient;
    PubSubClient     _mqtt;

    const char* _defaultPubTopic = nullptr;
    unsigned long _lastMqttRetry = 0;

    std::vector<String> _messageQueue;
    bool _firstMessageProcessing;
};

#endif // CONNECTIVITY_HPP
