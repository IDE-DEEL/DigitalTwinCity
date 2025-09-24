 
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN  21  /*Slave Select Pin*/
#define RST_PIN 22  /*Reset Pin for RC522*/

MFRC522 mfrc522(SS_PIN, RST_PIN);   /*Create MFRC522 instance*/

void setup()
{
  Serial.begin(115200);   /*Serial Communication begin*/
  SPI.begin();          /*SPI communication initialized*/
  mfrc522.PCD_Init();   /*RFID sensor initialized*/
  Serial.println("Put your card to the reader...");
  Serial.println();
}

void loop()
{
  /*Look for the RFID Card*/
  if ( ! mfrc522.PICC_IsNewCardPresent())
  {
    return;
  }
  /*Select Card*/
  if ( ! mfrc522.PICC_ReadCardSerial())
  {
    return;
  }

  /*Show UID for Card/Tag on serial monitor*/
  Serial.print("UID tag :");
  String content = "";
  for (byte i = 0; i < mfrc522.uid.size; i++)
  {
     Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");
     Serial.print(mfrc522.uid.uidByte[i], HEX);
     content.concat(String(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " "));
     content.concat(String(mfrc522.uid.uidByte[i], HEX));
  }
  Serial.println();
  Serial.print("Message : ");
  content.toUpperCase();

  if (content.substring(1) == "FE 4E DF 1D") /*Replace with your card UID*/
  {
    Serial.println("Authorized access");  
    Serial.println();
    delay(100);
  }
  else   
  {
    Serial.println("Access denied"); 
    delay(100);
  }
  delay(100);
}
