# Non Functionele Requirements

Waar de functionele requirements (FR) laten zien wat een systeem moet doen, laten de Nonfunctionele requirements (NFR) zien hoe goed de specifieke FR het moeten doen. Hier worden harde getallen gegeven waar aangehouden moet worden. Dit is om zo overeenkomsten met de opdrachtgever zo duidelijk mogelijk te maken.

---

## Navigatie en Robotgedrag

| Koppeling | Nr | Beschrijving |
|------------|----|---------------|
| FR_N01 | NFR_N1.1 | De robot blijft binnen een afwijking van **±2 cm** van de lijn. |
| FR_N02 | NFR_N2.1 | De robot stuurt minimaal **1x per seconde** een signaal van zijn huidige locatie. |
| FR_N02 | NFR_N2.2 | De robot stuurt signalen via **MQTT**. |
| FR_N03 | NFR_N3.1 | De robot kan stabiel rijden op rotondes en in vier richtingen sturen met een foutmarge kleiner dan **5°**. |
| FR_N04 | NFR_N4.1 | De afstandssensoren detecteren obstakels binnen **10 cm**. |
| FR_N04 | NFR_N4.2 | De robot stopt automatisch als een obstakel binnen **5 cm** komt. |
| FR_N05 | NFR_N5.1 | Het route-algoritme bepaalt de optimale route binnen **3 seconden**. |
| FR_N06 | NFR_N6.1 | De RFID-scanner bevindt zich aan de onderzijde van de robot voor optimale detectie. |
| FR_N06 | NFR_N6.2 | Wanneer de robot over een RFID-tag rijdt, wordt deze **3 seconde** gereserveerd. |
| FR_N07 | NFR_N7.1 | Een gereserveerd baanvlak wordt vrijgegeven als het niet binnen **3 seconde** opnieuw wordt gescand. |
| FR_N08 | NFR_N8.1 | De robotsoftware is modulair opgebouwd zodat extra sensoren en toepassingen eenvoudig kunnen worden toegevoegd. |
| FR_N09 | NFR_N9.1 | De robot weet waar andere robots zich bevinden met een nauwkeurigheid van **≤5 cm**. |
| FR_N09 | NFR_N9.2 | Robots kunnen hun route aanpassen op basis van de realtime locatie van andere robots. |

---

## Simulatie en Logica

| Koppeling | Nr | Beschrijving |
|------------|----|---------------|
| FR_S01 | NFR_S1.1 | De webpagina toont een laadscherm totdat de simulatie volledig is geladen (geen blanco scherm). |
| FR_S02 | NFR_S2.1 | Gebruikersparameters kunnen **real-time** worden aangepast zonder herstart van de simulatie. |
| FR_S03 | NFR_S3.1 | Minimaal **80% van de testers** beoordeelt de overeenkomst tussen fysiek en digitaal model met een score van **8 of hoger**. |
| FR_S04 | NFR_S4.1 | Code is leesbaar volgens interne richtlijnen (namen, indents, documentatie consistent). |
| FR_S05 | NFR_S5.1 | Nieuwe functionaliteiten kunnen worden toegevoegd zonder bestaande functies te breken. |
| FR_S06 | NFR_S6.1 | Code is onderhoudbaar door toepassing van **SOLID-principes** en modulaire structuur. |
| FR_S07 | NFR_S7.1 | Unit tests dekken minimaal **75% van de business rules**. |
| FR_S09 | NFR_S9.1 | Parametergegevens en scores worden persistent opgeslagen. |

---

## Cloud en Beveiliging

| Koppeling | Nr | Beschrijving |
|------------|----|---------------|
| FR_C01 | NFR_C1.1 | De cloud verwerkt berichten binnen **3 seconden** na ontvangst. |
| FR_C01 | NFR_C1.2 | De cloud kan minimaal **30 berichten per seconde** parallel verwerken. |
| FR_C02 | NFR_C2.1 | De cloud heeft een uptime van minimaal **95% per maand**. |
| FR_C03 | NFR_C3.1 | Alle data wordt opgeslagen met **AES-256 encryptie**. |
| FR_C04 | NFR_C4.1 | Data-updates van cloud naar website hebben een maximale vertraging van **3 seconden**. |
| FR_C04 | NFR_C4.2 | Communicatie tussen robots en cloud verloopt via **MQTT**. |
| FR_C05 | NFR_C5.1 | De website laadt volledig binnen **3 seconden** bij een standaard internetverbinding. |
| FR_C06 | NFR_C6.1 | Alle verzamelde data wordt **anoniem** opgeslagen (geen namen, e-mails of ID’s). |
| FR_C07 | NFR_C7.1 | Toegang tot de cloud wordt gelogd met **timestamp** en **sessie-ID**. |
| FR_C08 | NFR_C8.1 | Alle communicatie verloopt via **HTTPS/TLS**. |
| FR_C08 | NFR_C8.2 | Firewall en inputvalidatie beschermen tegen ongeautoriseerde toegang. |
| FR_C09 | NFR_C9.1 | Alerts worden binnen **5 minuten** verzonden bij storingen of fouten. |
| FR_C10 | NFR_C10.1 | Updates en patches worden uitgevoerd met maximaal **30 minuten downtime**, bij voorkeur in het weekend. |

---
