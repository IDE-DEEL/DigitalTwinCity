# Uitwerking user story | simulatielogica onderzoeken en refactoren

## User story

Als ontwikkelaar wil ik de verantwoordelijkheden binnen de simulatielogica onderzoeken en een gericht verbeterpunt aanpakken, zodat de code overzichtelijker en makkelijker te onderhouden wordt.

## Aanpak

Ik ben begonnen met het onderzoeken van `car_agent.py`, `car_model.py` en `movement_controller.py`. Daarna heb ik de omliggende backendmodules meegenomen om te kijken waar taken door elkaar liepen en welke bestanden nog werden gebruikt.

De democonfiguratie was het eerste gekozen verbeterpunt. Daarna heb ik ook de statistieken en scoreberekening uit de simulatieservice gehaald en de aansturing van de fysieke auto's opgesplitst. Daarmee is de uitvoering breder geworden dan het oorspronkelijke doel van één verbeterpunt. De wijzigingen zijn wel gericht uitgevoerd, met behoud van de bestaande werking in de geteste situaties.

## Onderzoek naar verantwoordelijkheden — #1010

| Onderdeel | Verantwoordelijkheid |
|---|---|
| `CarModel` | Auto's, routes, huizen en pakketten aanmaken, agents aansturen, gegevens verzamelen en controleren of de simulatie klaar is of vastloopt. |
| `CarAgent` | Laden en bezorgen, bepalen wanneer gereden mag worden en status, tijd en batterijgebruik bijhouden. In demo-modus ook een volgende route kiezen. |
| `MovementController` | Positie, snelheid, richting, sensoren, routevolging en afgelegde afstand berekenen. |
| `PIDController` | Stuurcorrecties berekenen voor het volgen van de route. |
| `SimulationService` | De simulatie starten, uitvoeren en stoppen en gegevens voor de API samenstellen. |
| WebSocket-API | Commando's ontvangen, de simulatielus uitvoeren, pauzeren en hervatten en updates versturen. |

De verdeling tussen agent en bewegingscontroller was al duidelijk: de agent bepaalt wanneer de auto mag rijden en de controller berekent hoe de auto beweegt. De bewegingscontroller kent geen pakketten, huizen of WebSocketberichten. Deze verdeling heb ik behouden.

De opvallendste verbeterpunten waren de democonfiguratie die achteraf aan het model werd toegevoegd, de verschillende taken binnen `SimulationService` en de grote hoeveelheid verantwoordelijkheden in `baanvlakreservering.py`.

## Gekozen verbeterpunten — #1011

Ik heb de volgende punten aangepakt:

1. De democonfiguratie direct onderdeel maken van `CarModel`.
2. Statistieken en de voorbereiding van de scoreberekening uit `SimulationService` halen.
3. De fysieke voertuigbesturing verdelen over bestanden met een eigen taak.
4. Na controle van de volledige codebase de ongebruikte backendbestanden verwijderen.

Ik heb de bewegingsberekeningen, bezorglogica en scoreformules niet opnieuw ontworpen. Mogelijke gedragsfouten zijn vastgelegd voor later.

## Uitgevoerde refactor — #1013

### Democonfiguratie in het model

`demo_mode` en `demo_routes` worden nu meegegeven wanneer `CarModel` wordt aangemaakt. Het model bewaart deze instellingen en controleert in demo-modus of iedere auto minimaal één demoroute heeft.

De service zet de aangeleverde routes nog steeds om naar simulatiecoördinaten, maar voegt de instellingen niet meer achteraf aan het model toe. De dubbele toewijzing van `demo_mode` is verwijderd.

De agent en de service kunnen `model.demo_mode` direct gebruiken, omdat ieder model deze instelling nu heeft. Zonder democonfiguratie blijft het model in normale modus werken.

### Simulatieservice opsplitsen

| Bestand | Taak na de wijziging |
|---|---|
| `simulation_service.py` | Instellingen verwerken, het model aanmaken, de simulatie starten, stappen uitvoeren en stoppen. Roept de statistiek- en scorefuncties aan. CSV-export blijft hier voorlopig staan. |
| `simulation_statistics.py` | Statistieken per auto en totalen verzamelen. |
| `simulation_scoring.py` | Gegevens uit het model verzamelen, `TripData` maken en de bestaande scoreberekening aanroepen. |

Voor de nieuwe onderdelen zijn gewone functies gebruikt. Ze hebben geen eigen toestand nodig en krijgen het model mee.

De bestaande methode `get_current_statistics()` blijft beschikbaar. De uitvoervelden `simulation_stats` en `trip_scores` zijn behouden, net als de berekeningen en afrondingen. De scoreformules staan nog steeds in `scoreCalculator.py`.

### Fysieke voertuigbesturing opsplitsen

`baanvlakreservering.py` regelde naast verkeer ook MQTT, routes, pakketten, toestand en updates voor de frontend. Daarom is de actieve besturing verplaatst naar `vehicle_control`.

| Bestand | Taak |
|---|---|
| `service.py` | RFID-updates verwerken en de andere onderdelen aanroepen. Aanspreekpunt voor de API. |
| `mqtt_client.py` | De MQTT-verbinding, abonnementen en start/stop van de client beheren. |
| `routes.py` | De 15 routes en depotstukken bewaren en de gekozen route samenstellen. |
| `state.py` | Gegevens van auto's, pakketten, huizen, routevoortgang en listeners bewaren. |
| `package_service.py` | Laden, bezorgen en uitgesteld hervatten afhandelen. |
| `traffic_control.py` | Naburige tags controleren en verkeersstops en hervattingen afhandelen. |
| `Tag_adjacency_list.json` | De bestaande gegevens over naburige tags bewaren. |

`main.py` en de digital-twin-API gebruiken het nieuwe pad. De API stelt de pakketcapaciteit in via `set_capacity()` in plaats van rechtstreeks een geïmporteerde dictionary te wijzigen.

De gekozen routes en algemene start/stop-instelling blijven in de bestaande gedeelde toestand uit `domain/states.py`. De overige voertuiggegevens staan in `VehicleState`.

In eerste instantie bleef het oude bestand bestaan als doorverwijzing. Na controle van de volledige projectzip bleek dat de applicatie dit pad niet meer gebruikte. De doorverwijzing is daarna verwijderd.

### Ongebruikte bestanden verwijderen

Voor het verwijderen heb ik gekeken naar imports, de frontend, Docker, CI, deploymentbestanden, scripts en documentatie.

De volgende tien bestanden zijn verwijderd, met paden vanuit `backend`:

| Bestand | Reden |
|---|---|
| `api/mqtt/handlers.py` | Lege placeholder. |
| `core/db.py` | Lege placeholder; de actieve databasecode staat elders. |
| `core/mqtt.py` | Lege placeholder; de actieve MQTT-code staat in `vehicle_control`. |
| `data/db/carDatabase.py` | Leeg en ongebruikt. |
| `tests/results_tests.py` | Leeg bestand zonder tests. |
| `services/car_service.py` | Niet gebruikt door de API of andere projectcode. |
| `baanvlakreservering/baanvlakreservering.py` | Oude doorverwijzing die niet meer nodig was. |
| `baanvlakreservering/databasePoller.py` | Alleen gebruikt door het oude losse databasevoorbeeld. |
| `baanvlakreservering/test.py` | Oud databasevoorbeeld met een verwijzing naar de ontbrekende `dbConfig`. |
| `baanvlakreservering/Tag_adjacency_list.json` | Dubbele kopie van de taggegevens. |

De verkeersregeldocumentatie is behouden als `vehicle_control/traffic_rules.md`. De compatibiliteitstest voor het verwijderde importpad is ook verwijderd.

`vehicle_control/__init__.py` en `vehicle_control/__main__.py` zijn behouden. Het eerste hoort bij de package-indeling. Het tweede maakt het mogelijk om de besturing los te starten met `python -m backend.vehicle_control`.

## Controle van de werking — #1012

### Automatische tests

Tijdens de wijzigingen zijn tests toegevoegd voor de democonfiguratie, statistieken, scores, voertuigbesturing en WebSocketafhandeling.

Voor de opschoning waren er 17 tests. Na het verwijderen van de compatibiliteitslaag zijn er 16 overgebleven. Het verschil is de test die alleen het oude importpad controleerde.

De tests controleren onder andere:

- De standaardinstellingen van een normaal model en ontbrekende demoroutes.
- De coördinatenconversie van demoroutes.
- Normale bezorging met meerdere laadbeurten en het afronden van de simulatie.
- Deadlock bij een onbereikbare afleverzone.
- Meerdere demoroutewissels met behoud van de opgebouwde afstand.
- Statistieken, afrondingen en het samenstellen van de score-invoer.
- MQTT-configuratie, abonnementen en starten, stoppen en opnieuw starten.
- De pakketcapaciteit na reset en gescheiden toestand per service-instantie.
- WebSocketbediening, RFID-updates, reset en opnieuw verbinden.

De volledige testreeks is lokaal uitgevoerd met:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Resultaat met Python 3.14.7:

```text
Ran 16 tests in 0.507s

OK
```

De melding `Connection failed: 1` kwam uit de test van een mislukte MQTT-verbinding. Dit was geen mislukte test. Er verscheen ook een Starlette-deprecationwaarschuwing; de WebSockettest slaagde.

### Uitvoer vóór en na de simulatierefactor vergelijken

Met dezelfde willekeurige seed zijn de volledige stapresultaten, statistieken, scores en CSV-uitvoer vergeleken.

| Scenario | Stappen | Resultaat |
|---|---:|---|
| Normale bezorging met één auto | 142 | Gelijk; simulatie voltooid. |
| Onbereikbare afleverzone | 59 | Gelijk; deadlock. |
| Demo met één auto | 500 | Gelijk; blijft draaien. |
| Normale bezorging met vijf auto's | 71 | Gelijk; simulatie voltooid. |
| Demo met vijf auto's | 500 | Gelijk; blijft draaien. |

### Uitvoer van de voertuigbesturing vergelijken

Dezelfde RFID-scenario's zijn afgespeeld tegen de oude en nieuwe besturing. Daarbij is een opgenomen MQTT-client gebruikt. Wachtacties zijn op vaste momenten uitgevoerd, zodat de vergelijking niet afhankelijk was van de timing van threads.

De vergelijking bevatte de MQTT-topics en payloads in volgorde, toestand na acties, listenerupdates, geplande wachtacties, wachttijden, scoreaanroepen en verwachte fouten bij ongeldige invoer.

| Scenario | MQTT-commando's | Resultaat |
|---|---:|---|
| Gestopt, inactieve en ontbrekende routes | 15 | Gelijk. |
| Laden, lossen, uitgesteld hervatten en reset | 50 | Gelijk. |
| Bezorgen en herhaalde RFID-berichten | 35 | Gelijk. |
| Verkeersstop en hervatten | 32 | Gelijk. |
| Alle 15 routes met alle vijf auto's, inclusief depotstukken | 30.149 | Gelijk. |
| Listenerfouten en ongeldige invoer | 2 | Gelijk. |
| **Totaal** | **30.283** | **Gelijk op 7.434 toestandmomenten.** |

Dit bevestigt dat de nieuwe code in deze scenario's hetzelfde reageert. Het bewijst niet iedere mogelijke combinatie van berichten of gelijktijdige acties.

### Applicatiecontrole

De volledige FastAPI-app is gecontroleerd met een tijdelijke SQLite-testdatabase en nagebootste MQTT-start/stop. De applicatiestart, healthcheck en OpenAPI werkten.

Daarna heb ik de applicatie zelf lokaal via Docker gedraaid en de werking gecontroleerd. De app werkte nog zoals verwacht. Er is geen afzonderlijk handmatig testverslag per knop vastgelegd.

De digital twin kon ik niet met de fysieke auto's controleren, omdat die niet beschikbaar waren. De automatische voertuigtests en WebSockettest gebruiken nagebootste MQTT-onderdelen; er is daarbij geen echte brokerverbinding getest.

## Documentatie en branch

De documentatie bij de wijzigingen is in het Nederlands geschreven. De toegevoegde codecomments zijn in het Engels.

Bij de opschoning is een patch meegeleverd om ook de verwijderingen te kunnen overnemen. Omdat de nieuwe bestanden al waren uitgepakt, paste die patch lokaal niet meer. De achtergebleven bestanden zijn daarna afzonderlijk verwijderd en het Git-overzicht is gecontroleerd. De tien verwijderde bestanden en de verplaatste verkeersregels kwamen overeen met de bedoelde opschoning.

De wijzigingen zijn gecommit naar de branch. Een peerreview is nog niet bevestigd.

## Verbeterpunten voor later

- De demoroutewissel verder onderbrengen bij de bewegingscontroller, zodat de agent niet zelf bewegingsgegevens hoeft terug te zetten.
- SVG-conversies uit de agent verplaatsen naar het samenstellen van de uitvoer.
- De opslag van simulatiegeschiedenis tijdens een langlopende demo beperken.
- CSV-export en eventueel de voorbereiding van startinstellingen verder uit de simulatieservice halen.
- De waypointvalidatie gelijkmaken aan de eis van minimaal twee waypoints in de bewegingscontroller.
- De controle van routenamen en `housesOnRoutes` herstellen.
- Voorkomen dat startgegevens bij hergebruik opnieuw worden omgezet naar simulatiecoördinaten.
- Overbodige of niet bijgewerkte toestand, zoals `House.num_undelivered_packages`, opruimen.
- De beschrijving van versnellen en remmen laten aansluiten op de huidige bewegingscode.
- MQTT-afhandeling en scoreformules in `scoreCalculator.py` verder scheiden.
- Het uitgestelde startcommando na laden of lossen opnieuw laten controleren of de auto nog mag rijden.
- Voorkomen dat verschillende onderdelen binnen één RFID-update elkaar tegenwerkende start- en stopcommando's sturen.
- Reset, wachtthreads en gelijktijdige updates verder onderzoeken.

Een lokale broker met nagebootste auto's is besproken als mogelijke vervolgtaak. Daarmee kan de echte MQTT-berichtenstroom zonder fysieke auto's worden getest. Deze opstelling is nog niet gebouwd.

## Huidige status

| Onderdeel | Status |
|---|---|
| Verantwoordelijkheden en afhankelijkheden onderzoeken — #1010 | Uitgevoerd. |
| Verbeterpunten selecteren — #1011 | Uitgevoerd. |
| Geselecteerde code refactoren — #1013 | Uitgevoerd en gecommit naar de branch. |
| Normale simulatie en demo controleren — #1012 | Automatische tests geslaagd en lokaal via Docker gecontroleerd. Geen apart handmatig verslag per bediening. |
| Documentatie bijwerken | Uitgevoerd. |
| Digital twin met echte broker en fysieke auto's controleren | Nog niet uitgevoerd. |
| Peerreview | Nog open. |

Voor deze sprint laat ik het bij de uitgevoerde wijzigingen. De overgebleven verbeterpunten kunnen als vervolgwerk worden opgepakt.