# Backend opschonen

## Wat ik heb gecontroleerd

Ik heb gekeken naar Python-imports, de frontend, Dockerbestanden, CI-workflows, deploymentbestanden, scripts en documentatie. Een bestand is niet alleen verwijderd omdat het nergens wordt geïmporteerd: startpunten en tests worden ook op andere manieren uitgevoerd.

## Verwijderde bestanden

| Bestand vanuit `backend` | Reden |
|---|---|
| `api/mqtt/handlers.py` | Leeg bestand, nergens gebruikt. |
| `core/db.py` | Leeg bestand. De actieve databasecode staat in `data/db/database.py`. |
| `core/mqtt.py` | Leeg bestand. De actieve MQTT-verbinding staat in `vehicle_control/mqtt_client.py`. |
| `data/db/carDatabase.py` | Leeg bestand, nergens gebruikt. |
| `tests/results_tests.py` | Leeg bestand zonder tests. |
| `services/car_service.py` | Niet aangeroepen door de API of andere projectcode. De auto-API gebruikt de repository rechtstreeks. |
| `baanvlakreservering/baanvlakreservering.py` | Alleen nog een doorverwijzing. De applicatie gebruikt al `vehicle_control`; alleen de compatibiliteitstest gebruikte dit pad nog. |
| `baanvlakreservering/databasePoller.py` | Algemene databasewrapper die alleen door het oude losse `test.py` werd gebruikt. Geen verwijzing vanuit de actieve applicatie of scripts. |
| `baanvlakreservering/test.py` | Oud databasevoorbeeld met een verwijzing naar de ontbrekende `dbConfig`. Geen onderdeel van de huidige testreeks of applicatiestart. |
| `baanvlakreservering/Tag_adjacency_list.json` | Exact dezelfde gegevens staan in `vehicle_control/Tag_adjacency_list.json`, de kopie die de applicatie gebruikt. |

In totaal zijn tien bestanden verwijderd. De lege map `api/mqtt` en de oude map `baanvlakreservering` zijn daarmee verdwenen nadat de documentatie is verplaatst.

## Verplaatst en aangepast

- `baanvlakreservering/regels_reservering.md` is behouden als `vehicle_control/traffic_rules.md`.
- De test `test_legacy_imports_delegate_to_current_service` is verwijderd, omdat het oude importpad bewust is verwijderd. De andere tests van servicefuncties, toestand en WebSocket blijven bestaan.
- De documentatie over de voertuigrefactor is bijgewerkt, zodat daarin niet meer staat dat het oude importpad nog beschikbaar is.

## Bewust behouden

- `vehicle_control/__init__.py`: de expliciete package-indeling.
- `vehicle_control/__main__.py`: het startpunt voor `python -m backend.vehicle_control`. Een startpunt hoeft geen inkomende import te hebben.
- `backend/main.py`, de actieve API-routes, repositories, modellen en schemas.
- De tests, replaycode en fixture met de vastgelegde resultaten van de oorspronkelijke voertuigbesturing.
- `pyproject.toml`, `uv.lock`, `requirements.txt` en de Dockerconfiguratie. Afhankelijkheden opschonen is een afzonderlijke wijziging.

De productcode die daadwerkelijk wordt uitgevoerd is verder niet aangepast. De mogelijke gedragsfouten rond uitgesteld hervatten en meerdere rijbeslissingen blijven aparte verbeterpunten.

## Controle

Voor de opschoning slaagden alle 17 tests uit de aangeleverde zip. Na de opschoning slagen alle 16 overgebleven tests. Het verschil is de bewust verwijderde compatibiliteitstest.

De tests omvatten onder andere:

- Normale simulatie, demo-modus, deadlock, statistieken en scores.
- Vergelijking met de oorspronkelijke fysieke voertuigbesturing voor 30.283 MQTT-commando's en 7.434 toestandmomenten.
- MQTT-configuratie, abonnementen, starten en stoppen.
- WebSocketbediening, updates, reset en opnieuw verbinden.

Daarna kunnen de tests vanuit de projectmap worden uitgevoerd:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```