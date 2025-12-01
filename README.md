# INNO-Institute-for-Design-Engineering
Ontwikkelomgeving voor het Innovation project (HU). In samenwerking met het Institute for Design &amp; Engineering.

Deze branch laat zien hoe er met een virtuele machine (VM) gecommuniceerd kan worden en hoe berichten ernaar gestuurd kunnen worden. Hier beneden is een korte uitleg over hoe je kan verbinden met de VM.
## Verbinden met de Virtuele Machine (VM)

### Inloggen op de VM
Gebruik SSH om verbinding te maken met de VM:
```bash
ssh MQTT@4.235.121.171
```

### HiveMQ starten
Navigeer naar de HiveMQ-map en start de broker:
```bash
cd hivemq-ce-2025.4
./bin/run.sh
```

### Mosquitto subscriber starten
Zorg dat HiveMQ draait en start vervolgens de Mosquitto subscriber om berichten te ontvangen:
```bash
mosquitto_sub -h localhost -p 1883 -t emqx/esp32 -v
```

### Overzicht componenten
- **VM**: Virtuele machine waarop alles draait
- **MQTT**: Berichtensysteem voor communicatie
- **ESP32MQTTRFID**: Hardware die berichten verstuurt via MQTT

