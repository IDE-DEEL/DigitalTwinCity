#ifndef MQTT_HPP
#define MQTT_HPP

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

#define BROKER_HOST ""
#define BROKER_PORT 8883
#define PSK_IDENTITY "esp32-01"
#define PSK_HEX ""

#define SUB_TOPIC_CMD "esp32-01/out"
#define PUB_TOPIC_OUT "esp32-01/out"
#define PUB_TOPIC_RFID "esp32-01/out"

#define MQTT_CLIENT_ID PSK_IDENTITY

/** 
 * @brief Wrapper around PubSubClient + WiFiClientSecure to encapsulate the TLS-PSK setup and connect/publish/subscribe logic
 */
class MQTTWrapper
{
public:
	/** Construct with an existing TLS client
	 * @note explicit type to avoid implicit conversion of existing client.
	 */
	explicit MQTTWrapper(WiFiClientSecure &tlsClient);

	/** Connect to server using TLS-PSK constants, set server/callback/subscribe/and publish initial online message.
	 * @retval true on success
	 * @retval false on failure
	 */
	bool connectWithPsk();

	// Wrapped helper methods
	/** Wrapped loop from existing client. */
	void loop();

	// Publish helpers
	/** Publish a message
	 * @param topic Topic to publish to
	 * @param payload Message payload
	 * @param retained Whether the message should be retained by the broker
	 * @retval true on success
	 * @retval false on failure
	 */
	bool publish(const char *topic, const char *payload, bool retained = false);
	/** Publish a message
	 * @param topic Topic to publish to
	 * @param payload Message payload
	 * @param retained Whether the message should be retained by the broker
	 * @retval true on success
	 * @retval false on failure
	 */
	bool publish(const char *topic, const String &payload, bool retained = false);

	/** Subscribe to topic
	 * @param topic Topic to subscribe to
	 * @param qos Quality of Service level (default 1)
	 * @retval true on success
	 * @retval false on failure
	 */
	bool subscribe(const char *topic, uint8_t qos = 1);

	/** Check if connected to the MQTT broker
	 * @retval true if connected
	 * @retval false if not connected
	 */
	bool connected();

	/** Get the current state of the MQTT connection
	 * @retval integer state code
	 */
	int state();

private:
	/**
	 * Internal callback for incoming MQTT messages
	 * @param topic Topic of the incoming message
	 * @param payload Payload of the incoming message
	 * @param len Length of the payload
	 */
	static void onMqttMessage(char *topic, byte *payload, unsigned int len);

private:
	WiFiClientSecure &tlsClient;
	PubSubClient mqtt;
	const char *currentPubTopic{nullptr};
};

#endif // MQTT_HPP
