# BE-06 — Ongebruikte en dubbele backendcode verwijderen

## Doel en uitgangspunt

Het onderzoek omvat de 69 Pythonbestanden van de backend, inclusief tests. De opschoning verandert geen endpoints, berichttypes, scoreformules of databasetabellen.

## Onderzoek

Ik heb definities, imports, gewone aanroepen, attribuutverwijzingen, callbacks en relevante verwijzingen in strings gecontroleerd. Voor de repositorymethodes is ook nagegaan welk repositoryobject de aanroeper gebruikt. Alleen zoeken op een methodenaam als `delete` is onvoldoende: de gelijknamige methode van `AccessCodesRepository` wordt bijvoorbeeld wel gebruikt.

## Verwijderde code

| Bestand | Verwijderd | Onderbouwing |
|---|---|---|
| `data/repositories/car_repo.py` | `find_all`, `find_by_segment`, `delete` | Geen aanroepers van deze methodes op `CarRepository` gevonden. De API gebruikt `find_by_id`, `add` en `update`; de RFID-service gebruikt `find_by_id` en `update`. |
| `data/repositories/track_segment_repo.py` | `find_by_status`, `update`, `delete` | De actieve API gebruikt `find_all`, `find_by_id` en `add`. De RFID-service gebruikt alleen `find_by_id`. |
| `data/repositories/car_logs_repo.py` | `find_all`, `find_by_id`, `find_by_rfid_tag`, `delete` | De actieve service gebruikt `find_by_car_id` en `add`. De tests gebruiken ook `add`. |
| `digital_sim/utils/coordinate_util.py` | `convert_waypoint_from_svg_to_math` | Geen import of aanroeper gevonden. De actieve code gebruikt de arrayconversie. |
| `digital_sim/domain/car_model.py` | Import van `convert_position_math_to_svg` | Wordt niet gebruikt in dit bestand. Het gebruik door `CarAgent` blijft behouden. |
| `api/v1/track_segment_api.py` | Import van `List` | Wordt niet gebruikt. |
| `api/v1/digital_twin.py` | Import van `TripData` | Wordt niet gebruikt. |
| `score/scoreCalculator.py` | Tweede import van `dataclass` | Dezelfde import staat al bovenaan het bestand. |

Ook de typingimports van de opgeschoonde repositories zijn aangepast: `List` is niet meer nodig in `car_repo.py` en `Optional` niet meer in `car_logs_repo.py`.

In totaal zijn tien repositorymethodes en één losse functie verwijderd. Er zijn geen volledige bronbestanden verwijderd.

## Verminderde duplicatie

In `api/v1/digital_twin.py` deden vijf berichttypes hetzelfde: het oorspronkelijke berichttype en de payload doorsturen via `broadcast_update`.

Deze types delen nu één `match`-tak:

- `speed`
- `scenario`
- `car_packages`
- `car_status`
- `car_energy`

De bestaande `houses`-update blijft vóór de berichtspecifieke afhandeling komen. Onbekende berichttypes worden nog steeds niet doorgestuurd.

Voor activeren en stoppen werden dezelfde vijf aanroepen apart geschreven voor `auto_A` tot en met `auto_E`. Deze gebruiken nu een lus over de bestaande `CAR_IDS`-tuple. De volgorde, argumenten en foutafhandeling blijven behouden.

De productiecode is per saldo 83 regels korter. De wijziging raakt acht productiecodebestanden, één bestaand testbestand en dit document.

## Bewust behouden

- De modelimports in `main.py` registreren SQLAlchemy-tabellen en zijn daardoor niet overbodig.
- De publieke wrappers in `vehicle_control/service.py` zijn actieve toegangspunten voor de API en applicatielevenscyclus.
- `vehicle_control/__main__.py` is een apart startpunt en blijft behouden.
- De MQTT-scoreverwerking heeft een eigen startfunctie en wordt deels direct getest. Het ontbreken van een aanroep vanuit `main.py` is onvoldoende reden om die volledige integratie te verwijderen.
- Schijnbaar dubbele afstandsvelden in simulatieberichten en CSV-reporters kunnen onderdeel zijn van het bestaande gegevenscontract. Deze zijn niet verwijderd.
- Er is geen generieke repositorybasisklasse toegevoegd. De transacties en commitopties verschillen; samenvoegen zou deze beperkte opschoning groter maken.

## Controles en resultaten

| Controle | Resultaat |
|---|---|
| Bestaande testreeks vóór wijzigingen | 55 tests, `OK` |
| Volledige testreeks na wijzigingen | 56 tests, `OK` |
| Python-syntaxcontrole | Alle 69 Pythonbestanden kunnen worden geparset |
| Gerichte API-controles | Acht controles met SQLite geslaagd |

De extra WebSocket-test controleert met twee verbonden clients dat alle vijf samengevoegde berichttypes de oorspronkelijke payload en berichtvolgorde behouden. Ook controleert deze test met een volgend bericht als barrière dat onbekende commando's niet worden doorgestuurd.

De bestaande WebSocket-test controleert nu bovendien dat activeren en stoppen precies de vijf verwachte voertuigcommando's versturen, in dezelfde volgorde.

De acht aanvullende API-controles betroffen:

1. Een onbekende auto geeft 404.
2. Een onbekend baanvlak geeft 404.
3. Een baanvlak aanmaken lukt.
4. Het aangemaakte baanvlak staat in de lijst.
5. Het baanvlak afzonderlijk ophalen lukt.
6. Een auto registreren lukt.
7. De autocommando's wijzigen lukt.
8. De gewijzigde richting, rijtoestemming en positie worden correct teruggelezen.

Deze API-controles zijn uitgevoerd als afzonderlijke functionele controle en voegen geen testbestand toe. De bestaande automatische tests blijven onder andere normale simulatie, demo, pauzeren/hervatten, rapportage, rollback en foutlogging controleren.

De controles zijn hier uitgevoerd met Python 3.12.14 en beschikbare testafhankelijkheden. De projectconfiguratie vraagt Python 3.14 of hoger. Python 3.14, Docker, PostgreSQL en fysieke voertuigen zijn voor deze opschoning hier niet opnieuw gecontroleerd.

## Lokaal testen

Voer vanuit de projectmap uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Verwacht na toepassen van deze zip 56 tests met `OK`.

## Vervolgpunten voor de backlog

### 1. Validatie van routekoppelingen herstellen

`SimulationStartPayload.validate_route_names_match` is een validator op `cars`, terwijl `housesOnRoutes` later in het model staat. Bij normale validatie is dat latere veld nog niet beschikbaar via `info.data`. Daardoor wordt de beoogde controle overgeslagen.

Dit is gereproduceerd: een verder geldig startbericht met `simulationSpeed=1` en een autoroute die niet in `housesOnRoutes` staat, wordt geaccepteerd.

Mogelijk vervolg: controle na validatie van het volledige model uitvoeren en tests toevoegen voor ontbrekende routekoppelingen en demo-invoer. Het herstellen verandert welke invoer wordt geaccepteerd en valt daarom buiten deze opschoning.

### 2. Afstandseenheid bij fysieke scores controleren

In `VehicleControlService.on_message` wordt `(len(car_route) - 1) * routes_completed` als vierde argument doorgegeven aan de scorefunctie. Dat argument heet `route_length_km`, maar de aangeleverde waarde telt routepunten over voltooide routes; er is daar geen omzetting naar kilometers.

Mogelijk vervolg: de eenheid vaststellen en afstanden consequent omrekenen voordat routeafhankelijke scorestraffen worden berekend. De juiste conversiefactor is niet uit deze code af te leiden. De scoreformules zijn nu niet aangepast.

### 3. Losse MQTT-score-integratie beoordelen

`scoreCalculator.py` bevat naast de scoreformules een eigen MQTT-client, eigen voertuigtoestand en lokale brokerinstellingen. De applicatie start daarnaast de client uit `vehicle_control`.

In de losse score-integratie staat in `mqtt_attempt_score_calculation` bovendien `from config import WEIGHTS`. De applicatie importeert de scoreconfiguratie elders als `backend.score.config`. Vanuit de projectmap is die losse import niet dezelfde moduleroute.

Mogelijk vervolg: bepalen of deze integratie nog als zelfstandige uitvoering nodig is, de configuratie-import corrigeren en zo nodig MQTT-verwerking scheiden van de scoreformules. Dit is geen reden om nu zonder verdere verificatie de hele integratie te verwijderen.