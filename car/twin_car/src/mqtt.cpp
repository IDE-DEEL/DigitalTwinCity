#include "mqtt.hpp"
#include <WiFi.h>

MQTTWrapper::MQTTWrapper(WiFiClientSecure &tlsClient)
	: tlsClient(tlsClient), mqtt(this->tlsClient)
{
}

void MQTTWrapper::onMqttMessage(char *topic, byte *payload, unsigned int len)
{
	Serial.printf("MQTT <- [%s]\n", topic);
	Serial.println(String((const char *)payload, len));
}

bool MQTTWrapper::connectWithPsk()
{
	tlsClient.setPreSharedKey(PSK_IDENTITY, PSK_HEX);

	mqtt.setServer(BROKER_HOST, BROKER_PORT);
	mqtt.setCallback(MQTTWrapper::onMqttMessage);

	Serial.printf("MQTT: connecting to %s:%u ...\n", BROKER_HOST, BROKER_PORT);
	if (!mqtt.connect(MQTT_CLIENT_ID))
	{
		Serial.printf("MQTT connect failed, state=%d\n", mqtt.state());
		return false;
	}

	Serial.println("MQTT: connected (TLS-PSK)");
	mqtt.subscribe(SUB_TOPIC_CMD, 1);
	mqtt.publish(PUB_TOPIC_OUT, "esp32 online (rfid ready)", true);
	currentPubTopic = PUB_TOPIC_OUT;
	return true;
}

void MQTTWrapper::loop()
{
	mqtt.loop();
}

bool MQTTWrapper::publish(const char *topic, const char *payload, bool retained)
{
	return mqtt.publish(topic, payload, retained);
}

bool MQTTWrapper::publish(const char *topic, const String &payload, bool retained)
{
	return mqtt.publish(topic, payload.c_str(), retained);
}

bool MQTTWrapper::subscribe(const char *topic, uint8_t qos)
{
	return mqtt.subscribe(topic, qos);
}

bool MQTTWrapper::connected()
{
	return mqtt.connected();
}

int MQTTWrapper::state()
{
	return mqtt.state();
}
