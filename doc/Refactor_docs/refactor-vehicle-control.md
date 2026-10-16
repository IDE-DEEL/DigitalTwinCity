# Baanvlakreservering opsplitsen

## Wat ik heb aangepast

Ik heb de actieve aansturing van de fysieke auto's verplaatst naar `backend/vehicle_control`. De naam `baanvlakreservering` dekte de inhoud niet meer, omdat deze module ook MQTT, routes, pakketten en gegevens voor de frontend afhandelde.

De eerdere wijzigingen aan de simulatieservice en democonfiguratie zitten ook in dit pakket.

## Verdeling

| Bestand | Taak |
|---|---|
| `vehicle_control/service.py` | RFID-updates afhandelen en de andere onderdelen aanroepen. Dit is ook het aanspreekpunt voor de API. |
| `vehicle_control/mqtt_client.py` | De MQTT-client aanmaken, verbinden, abonnementen instellen en de verbinding stoppen. |
| `vehicle_control/routes.py` | De 15 routes en depotstukken bewaren en de gekozen route samenstellen. |
| `vehicle_control/state.py` | De toestand van auto's, pakketten, huizen, routevoortgang en listeners bewaren. |
| `vehicle_control/package_service.py` | Laden, bezorgen, pakketgegevens en het uitgestelde hervatten afhandelen. |
| `vehicle_control/traffic_control.py` | Naburige tags controleren en de bestaande verkeersstops en hervattingen afhandelen. |
| `vehicle_control/Tag_adjacency_list.json` | De bestaande gegevens over naburige tags. |

`main.py` en `api/v1/digital_twin.py` gebruiken nu de nieuwe module. De API wijzigt de capaciteit via `set_capacity()` in plaats van rechtstreeks in een geïmporteerde dictionary te schrijven.

De gekozen routes en de algemene start/stop-instelling blijven in de bestaande `backend/domain/states.py` staan. De API en de voertuigaansturing gebruiken dezelfde instantie. De nieuwe `VehicleState` bewaart de overige gegevens van de fysieke auto's.

## Oude imports en bestanden

Bij de eerste refactor bleef het oude importpad beschikbaar als doorverwijzing. Na controle van de volledige projectzip is die doorverwijzing verwijderd: de applicatie gebruikt alleen `backend.vehicle_control`.

Ook het losse databasescript, de ongebruikte databasewrapper en de dubbele taggegevens uit de oude map zijn verwijderd. De verkeersregeldocumentatie is behouden in `vehicle_control/traffic_rules.md`.

De controle van het oude importpad is uit de tests gehaald. De tests van de huidige service, MQTT-verbinding en WebSocketroute blijven bestaan. Zie `backend-opschoning.md` voor de volledige lijst.

Los uitvoeren blijft mogelijk vanuit de projectmap met:

```powershell
python -m backend.vehicle_control
```

Dit commando maakt een echte MQTT-verbinding. Het hoort niet bij de automatische tests.

## Werking behouden

Ik heb de MQTT-topics, payloadtypen, volgorde van commando's, routes, depotstukken, pakketberekeningen, wachttijd en resetgedrag behouden. De scoreberekening wordt op dezelfde momenten met dezelfde argumenten aangeroepen.

De gevonden mogelijke gedragsfouten zijn niet opgelost:

- Een wachtende laad- of losactie verstuurt na de wachttijd nog steeds een startcommando, ook als ondertussen gestopt is.
- Binnen één RFID-update kunnen pakketafhandeling, verkeer en routeafhandeling nog steeds verschillende start- en stopcommando's versturen.
- Reset wist, net als voorheen, niet alle verkeerswachtrijen en routetellers en annuleert geen wachtthreads.
- De gedeelde toestand is nu op één plek ondergebracht, maar er is nog geen vergrendeling of centrale beslisser voor gelijktijdige updates toegevoegd.

Voor deze punten zijn aparte bugfixes nodig, met tests voor het gewenste nieuwe gedrag.

## Vergelijking met de oude code

Ik heb vóór de wijziging dezelfde scenario's afgespeeld tegen de oorspronkelijke module. De MQTT-client was vervangen door een recorder. Wachtacties werden apart vastgelegd en op vaste momenten uitgevoerd, zodat de test niet afhankelijk is van threadtiming.

Vervolgens zijn dezelfde scenario's tegen de nieuwe onderdelen afgespeeld. De vergelijking bevat alle MQTT-topics en payloads in volgorde, toestand na de acties, listenerupdates, geplande wachtacties, wachttijden, scoreaanroepen en verwachte fouten bij ongeldige invoer.

| Scenario | MQTT-commando's | Resultaat |
|---|---:|---|
| Gestopt, inactieve en ontbrekende routes | 15 | Gelijk |
| Laden, lossen, uitgesteld hervatten en reset | 50 | Gelijk |
| Bezorgen, gedeeltelijke bezorging en herhaalde RFID | 35 | Gelijk |
| Verkeersstop en hervatten na verplaatsen van een andere auto | 32 | Gelijk |
| Alle 15 routes met alle vijf auto's, inclusief depotstukken | 30.149 | Gelijk |
| Listenerfouten en ongeldige invoer | 2 | Gelijk |
| **Totaal** | **30.283** | **Gelijk op 7.434 toestandmomenten** |

De verwachte controlesommen staan in `tests/fixtures/vehicle_control_before_refactor.json`, met de broncontrole van de oude module. De nieuwe code wordt daar tijdens de tests opnieuw mee vergeleken. Dat bewijst overeenkomst voor deze scenario's, niet voor iedere mogelijke situatie of threadvolgorde.

## Andere controles

Na het verwijderen van de compatibiliteitslaag slagen alle 16 overgebleven tests.

- De tien bestaande tests voor de simulatierefactoren slagen.
- De nieuwe tests controleren MQTT-configuratie, de vijf abonnementen, starten, stoppen en opnieuw starten, gescheiden toestand per instantie, capaciteit na reset en gescheiden toestand per instantie.
- De WebSockettest gebruikt de echte FastAPI-route met een opgenomen MQTT-client. Deze controleert route kiezen, capaciteit instellen, starten, stoppen, RFID-updates doorsturen, reset en opnieuw verbinden.
- De Pythonbestanden zijn op syntax gecontroleerd.

## Tests uitvoeren

Voer vanuit de projectmap uit met de Python-omgeving waarin de backendafhankelijkheden staan:

```powershell
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Bij gebruik van uv:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

De tests gebruiken geen echte MQTT-broker, database of auto's. De WebSockettest gebruikt `httpx`, dat beschikbaar is via `fastapi[all]` in de projectconfiguratie. Als alleen de minimale `requirements.txt` is geïnstalleerd en `httpx` ontbreekt, installeer dan de projectafhankelijkheden via `uv sync` in `backend`, of installeer `httpx` in dezelfde testomgeving.