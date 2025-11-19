#ifndef RFID_HPP
#define RFID_HPP

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include "mqtt.hpp"


/**
 * @brief Simple RFID reader wrapper for MFRC522-based readers.
 */
class RFIDReader {
public:
	
	/**
	 * Construct an RFIDReader with specified SS and RST pins.
	 * @param ssPin_ Slave Select pin (default 21)
	 * @param rstPin_ Reset pin (default 22)
	 */
	RFIDReader(uint8_t ssPin = 21, uint8_t rstPin = 22);

	/**
	 * Initialize SPI and the MFRC522 reader. Must be called from setup().
	 */
	void begin();

	/**
	 * Poll the RFID reader for new cards.
	 * @retval Non-empty String containing the UID in hexadecimal format when a new card is detected or reannouncement timeout is reached.
	 * @retval Empty String if no new card is present or within debounce timeout.
	 */
	String poll();

	/**
	 * Publish the detected RFID UID via MQTT in JSON format.
	 * @param mqtt Reference to an existing MQTTWrapper instance for publishing.
	 * @param uidHex Hexadecimal string of the detected RFID UID.
	 */
	void publishRFID(MQTTWrapper& mqtt, const String& uidHex);

private:

	/** Convert MFRC522 UID to hexadecimal String representation.
	 * @param uid MFRC522::Uid structure
	 * @retval Hexadecimal String of the UID
	 */
	static String uidToHex(const MFRC522::Uid& uid);

	private:
	uint8_t ssPin;
	uint8_t rstPin;
	MFRC522 mfrc522;
	String lastUidHex;
	unsigned long lastPublishMs{0};
	const unsigned long reannounceMs{3000};
};

#endif // RFID_HPP
