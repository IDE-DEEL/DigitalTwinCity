# RFID werkend krijgen met de bestaande code (ESP32)

Om de RFID-module correct te laten werken met de bestaande code, moet de juiste versie van **ESP32 by Espressif Systems** gebruikt worden. 
Nieuwere versies veroorzaken compatibiliteitsproblemen, waardoor o.a. `SparkFun_TB6612.h` niet goed functioneert. De oplossing is om de board-package terug te zetten naar **versie 2.0.17**.

---

## 1. Boards Manager openen
Ga in de Arduino IDE naar:

**Tools → Board → Boards Manager…**

---

## 2. Zoeken naar `esp32`
Typ in de zoekbalk:

esp32

Selecteer:

**ESP32 by Espressif Systems**

---

## 3. Versie instellen op 2.0.17
Open het versiemenu en kies:

2.0.17

Klik op **Install**.

> Nieuwere versies zoals 2.0.18 of 3.x zorgen dat de sparksfun niet werkt.

---

## 4. Arduino IDE herstarten
Sluit de Arduino IDE en start hem opnieuw.

---

Nu werkt de RFID-functionaliteit weer zoals bedoeld.
