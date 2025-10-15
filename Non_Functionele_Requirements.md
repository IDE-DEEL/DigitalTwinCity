# Non Functionele Requirements

Waar de functionele requirements (FR) laten zien wat een systeem moet doen, laten de Nonfunctionele requirements (NFR) zien hoe goed de specifieke FR het moeten doen. Hier worden harde getallen gegeven waar aangehouden moet worden. Dit is om zo overeenkomsten met de opdrachtgever zo duidelijk mogelijk te maken.

---

## 1. Robotprestaties

| Nr | Koppeling | Beschrijving |
|----|------------|---------------|
| RBT_NF1.1 | TI_F01 | De robot blijft binnen een afwijking van **±2 cm** van de lijn. |
| RBT_NF1.2 | TI_F01 | De robot rijdt binnen de fysieke baanbreedte (max. **20 cm**). |
| RBT_NF2.1 | TI_F02 | De robot stuurt minimaal **1x per seconde** zijn huidige locatie door. |
| RBT_NF2.2 | TI_F02 | Communicatie tussen robot en cloud gebeurt via **MQTT**. |
| RBT_NF3.1 | TI_F03 | De robot kan stabiel sturen in vier richtingen en rotondes nemen met een foutmarge kleiner dan **5°**. |
| RBT_NF4.1 | TI_F04 | Afstandssensoren detecteren obstakels binnen **10 cm**. |
| RBT_NF4.2 | TI_F04 | De robot stopt automatisch als een obstakel binnen **5 cm** komt. |
| RBT_NF5.1 | TI_F05 | Het route-algoritme bepaalt de optimale route binnen **3 seconden**. |
| RBT_NF6.1 | TI_F06 | De RFID-scanner bevindt zich onder de robot voor optimale detectie. |
| RBT_NF6.2 | TI_F06 | Wanneer de robot over een RFID-tag rijdt, wordt het baanvlak **1 seconde** gereserveerd. |
| RBT_NF7.1 | TI_F07 | Een baanvlak wordt vrijgegeven als het niet binnen **1 seconde** opnieuw gescand wordt. |
| RBT_NF8.1 | TI_F08 | De code is modulair gestructureerd zodat nieuwe sensoren eenvoudig toegevoegd kunnen worden. |
| RBT_NF9.1 | TI_F09 | Robots kennen elkaars locatie met een nauwkeurigheid van **≤5 cm**. |
| RBT_NF9.2 | TI_F09 | Robots passen hun route aan op basis van de realtime positie van andere robots. |

---

## 2. Simulatie en Webomgeving

| Nr | Koppeling | Beschrijving |
|----|------------|---------------|
| SIM_NF1.1 | SD_F01 | De webpagina toont een laadscherm tot de simulatie gereed is (geen blanco scherm). |
| SIM_NF2.1 | SD_F02 | Gebruikersparameters kunnen **real-time** worden aangepast zonder herladen van de simulatie. |
| SIM_NF3.1 | SD_F03 | Minimaal **80% van de testers** moet een score van **≥8/10** geven voor overeenstemming tussen fysiek en digitaal model. |
| SIM_NF4.1 | SD_F04 | Code is leesbaar volgens interne richtlijnen (consistentie in namen, indents, documentatie). |
| SIM_NF5.1 | SD_F05 | Nieuwe functionaliteiten kunnen worden toegevoegd zonder dat bestaande functies breken. |
| SIM_NF6.1 | SD_F06 | Code is onderhoudbaar door toepassing van SOLID-principes en modulaire opbouw. |
| SIM_NF7.1 | SD_F07 | Unit tests dekken minimaal **75% van de business rules**. |
| SIM_NF8.1 | SD_F08 | Parametergegevens en scores worden persistent opgeslagen. |

---

## 3. Cloud en Beveiliging

| Nr | Koppeling | Beschrijving |
|----|------------|---------------|
| CLD_NF1.1 | CSC_F01 | De cloud verwerkt berichten binnen **3 seconden** na ontvangst. |
| CLD_NF1.2 | CSC_F01 | De cloud kan minimaal **30 berichten per seconde** parallel verwerken. |
| CLD_NF2.1 | CSC_F02 | De cloud heeft een uptime van minimaal **95% per maand**. |
| CLD_NF3.1 | CSC_F03 | Alle data wordt opgeslagen met **encryptie (AES-256)**. |
| CLD_NF4.1 | CSC_F04 | Data-updates van cloud naar website hebben een maximale vertraging van **3 seconden**. |
| CLD_NF4.2 | CSC_F04 | **MQTT** wordt gebruikt voor communicatie tussen robots en cloud. |
| CLD_NF5.1 | CSC_F05 | De webomgeving laadt volledig binnen **3 seconden** bij standaardverbinding. |
| CLD_NF6.1 | CSC_F06 | Alle data wordt **anoniem** opgeslagen (geen namen, e-mails of ID’s). |
| CLD_NF7.1 | CSC_F07 | Toegang tot de cloud wordt gelogd met **timestamp en sessie-ID**. |
| CLD_NF8.1 | CSC_F08 | Alle communicatie verloopt via **HTTPS/TLS**. |
| CLD_NF8.2 | CSC_F08 | **Firewall en inputvalidatie** beschermen tegen ongeautoriseerde toegang. |
| CLD_NF9.1 | CSC_F09 | Bij storingen of fouten wordt binnen **5 minuten** een alert verstuurd. |
| CLD_NF10.1 | CSC_F10 | Updates en patches worden uitgevoerd met maximaal **30 minuten downtime**, bij voorkeur in het weekend. |

---
