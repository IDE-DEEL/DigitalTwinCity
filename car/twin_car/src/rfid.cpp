#include "rfid.hpp"

// SPI pins
static const uint8_t SPI_SCK = 18;
static const uint8_t SPI_MISO = 19;
static const uint8_t SPI_MOSI = 23;

RFIDReader::RFIDReader(uint8_t ssPin_, uint8_t rstPin_)
    : ssPin(ssPin_), rstPin(rstPin_), mfrc522(ssPin_, rstPin_)
{
}

void RFIDReader::begin()
{
    SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, ssPin);
    mfrc522.PCD_Init();
    delay(50);
    Serial.println("MFRC522 init done");
}

String RFIDReader::uidToHex(const MFRC522::Uid &uid)
{
    String hex = "";
    for (byte i = 0; i < uid.size; i++)
    {
        if (uid.uidByte[i] < 0x10)
            hex += "0";
        hex += String(uid.uidByte[i], HEX);
    }
    hex.toUpperCase();
    return hex;
}

String RFIDReader::poll()
{
    // Als dezelfde kaart lang blijft liggen, reset lastUid na timeout zodat opnieuw gepusht kan worden
    if (!mfrc522.PICC_IsNewCardPresent())
    {
        if (lastUidHex.length() && (millis() - lastPublishMs > reannounceMs))
        {
            lastUidHex = "";
        }
        return String("");
    }

    // Lees kaart uit
    if (!mfrc522.PICC_ReadCardSerial())
    {
        return String("");
    }
    
    String uidHex = uidToHex(mfrc522.uid);

    if (uidHex != lastUidHex || (millis() - lastPublishMs > reannounceMs))
    {
        lastUidHex = uidHex;
        lastPublishMs = millis();
        
        MFRC522::PICC_Type piccType = mfrc522.PICC_GetType(mfrc522.uid.sak);
        Serial.print("Type: ");
        Serial.println(mfrc522.PICC_GetTypeName(piccType));
    }
    else
    {
        uidHex = String("");
    }

    // Kaart netjes stoppen
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return uidHex;
}

void RFIDReader::publishRFID(MQTTWrapper &mqtt, const String &uidHex)
{
    // JSON payload: {"uid":"ABCD1234","ms":123456}
    String payload = "{\"uid\":\"" + uidHex + "\",\"ms\":" + String(millis()) + "}";

    Serial.print("RFID -> ");
    Serial.println(payload);
    mqtt.publish(PUB_TOPIC_RFID, payload);
}
