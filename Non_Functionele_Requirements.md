# Non Functionele Requirements

Waar de functionele requirements (FR) laten zien wat een systeem moet doen, laten de Nonfunctionele requirements (NFR) zien hoe goed de specifieke FR het moeten doen. Hier worden harde getallen gegeven waar aangehouden moet worden. Dit is om zo overeenkomsten met de opdrachtgever zo duidelijk mogelijk te maken.

## Technische Informatica

|Functional Nr|Nr|Beschrijving|
|---|---|---|
|TI_F01|TI_NF1.1|De robot is binnen een diameter van x cm van de lijn|
|TI_F02|TI_NF2.1|De robot stuurt minimaal elke seconde een signaal van zijn huidige locatie|
|TI_F02|TI_NF2.2|De robot stuurt signalen via MQTT|
|TI_F03|TI_NF3.1|De robot kan op de rotonde rijden|
|TI_F03|TI_NF3.2|De robot kan naar links en naar rechts sturen|
|TI_F04|TI_NF4.1|Er zitten afstandssensoren op de robot die aangeven als de robot dichtbij een muur, of obstakel komt|
|TI_F04|TI_NF4.2|De robot komt tot een stop wanneer de obstakels te dichtbij komen|
|TI_F04|TI_NF4.2|De robot bevat een camera om hiermee obstakels te kunnen herkennen|
|TI_F05|TI_NF5.1|Het algoritme bepaalt de route binnen 3 seconden|
|TI_F06|TI_NF6.1|De RFID scanner zit op de onderkant van de auto voor optimale scanning|
|TI_F06|TI_NF6.2|Wanneer de robot over een RFID tag rijdt, wordt deze voor 1 seconde gereserveerd|
|TI_F07|TI_NF7.1|Het gereserveerde vlak wordt weer vrijgelaten als binnen 1 seconde na het scannen van de tag, de tag niet opnieuw gescanned|
|TI_F08|TI_NF8.1|De code is eenvoudig gestructureerd waardoor eenvoudig extra toepassingen en sensoren kunnen worden toegevoegd|
|TI_F09|TI_NF9.1|De robot weet waar andere robots zijn op 5 cm nauwkeurig|
|TI_F09|TI_NF9.2|Robots kunnen hun route aanpassen op basis van de locatie van andere robots|