#include "rfid.hpp"



RFIDReader::RFIDReader()
    : ssPin(SPI_SS), rstPin(SPI_RST), mfrc522(SPI_SS, SPI_RST)
{
}

void RFIDReader::begin()
{
    Serial.println("Initializing RFID reader...");
    SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SPI_SS);
    Serial.println("SPI initialized");
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
    if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial())
    {
        if (lastUidHex.length() && (millis() - lastPublishMs > reannounceMs))
        {
            Serial.println("RFID timeout, resetting lastUidHex %s" + lastUidHex);
            lastUidHex = "";
        }
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
