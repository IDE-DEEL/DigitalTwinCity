# Aansturing fysieke auto's

Deze map bevat de besturing die eerder in `baanvlakreservering.py` stond.

De API gebruikt de functies uit `service.py`. Die module werkt met één gedeelde `VehicleControlService`. Voor tests kan een afzonderlijke service worden aangemaakt met een eigen toestand, opgenomen MQTT-client en gecontroleerde wachtacties.

Routes staan in `routes.py`, pakketafhandeling in `package_service.py`, verkeersbeslissingen in `traffic_control.py` en de MQTT-verbinding in `mqtt_client.py`. De gegevens van de auto's staan in `VehicleState`.

De gekozen routes en algemene start/stop-instelling komen uit de bestaande gedeelde toestand in `backend/domain/states.py`.

Zie `backend/doc/refactor-vehicle-control.md` voor de controles, migratie en nog openstaande punten.
