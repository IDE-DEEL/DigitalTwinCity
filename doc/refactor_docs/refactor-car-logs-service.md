# RFID-logverwerking naar een service verplaatsen

## Onderzoek en keuze

Ik heb de afhankelijkheden tussen de API, services en repositories in de actuele backend bekeken. Voor de wijziging heb ik het verwerken van RFID-logs gekozen.

`car_logs_api.py` stuurde drie repositories aan, controleerde of de auto en het baanvlak bestonden, maakte een log aan en wijzigde de autopositie. Daarmee stond de volledige verwerking in het endpoint.

## Wat ik heb aangepast

| Bestand | Aanpassing |
|---|---|
| `services/car_logs_service.py` | Nieuwe `CarLogsService` voor het verwerken van een RFID-waarneming en het ophalen van de loggeschiedenis. |
| `api/v1/car_logs_dependencies.py` | Nieuwe dependencyfunctie die de drie repositories met dezelfde databasesessie aan de service meegeeft. |
| `api/v1/car_logs_api.py` | Roept de service aan en vertaalt de fouten naar de bestaande HTTP-antwoorden. |
| `tests/test_car_logs_api.py` | Acht tests voor de bestaande API- en databasewerking. |

De service gebruikt geen FastAPI, `Depends` of `HTTPException`. De service geeft eigen fouten door voor een ontbrekende auto, ontbrekend baanvlak of ontbrekende loggeschiedenis. De API vertaalt deze naar dezelfde 404-antwoorden als voorheen.

De repositories blijven verantwoordelijk voor databaseopslag. Ze zijn niet aangepast. Ook het aanmaken van een logtijdstip en de volgorde van de twee schrijfhandelingen zijn behouden.

## Request- en responseformaten

De endpoints blijven:

- `POST /api/v1/car-logs?car_id=...&rfid_tag=...`
- `GET /api/v1/car-logs/{car_id}`

De POST-parameters blijven queryparameters. Er is geen nieuw JSON-requestmodel toegevoegd. Het succesvolle POST-antwoord blijft:

```json
{"message": "Position logged", "car_id": "auto_A", "segment": "tag-new"}
```

Ook de bestaande foutteksten en statuscodes zijn behouden. De loggeschiedenis bevat dezelfde velden en wordt nog steeds van nieuw naar oud opgehaald. Een onbekende auto zonder logs geeft, net als een bestaande auto zonder logs, `No logs found for this car` terug.

De volledige OpenAPI-beschrijving van beide endpoints is vóór en na de wijziging vergeleken en is gelijk, inclusief parameters, responses en beschrijvingen.

## Tests

De acht nieuwe tests zijn eerst tegen de oorspronkelijke API uitgevoerd en daarna tegen de refactor. Beide versies slagen voor dezelfde controles:

1. Een geldige waarneming slaat een log op, wijzigt de positie en geeft hetzelfde antwoord terug. De twee commits blijven behouden.
2. Een ontbrekende auto geeft dezelfde 404 zonder wijzigingen op te slaan.
3. Een ontbrekend baanvlak geeft dezelfde 404 zonder wijzigingen op te slaan.
4. Als beide ontbreken, wordt eerst de auto gecontroleerd.
5. Alleen een JSON-body vervangt de vereiste queryparameters niet; dit blijft een 422.
6. De loggeschiedenis houdt dezelfde velden, filtering en sortering.
7. Geen logs geeft dezelfde 404 voor een bestaande en een onbekende auto.
8. Een fout bij de tweede schrijfhandeling behoudt het bestaande gedeeltelijk opgeslagen resultaat.

De tests gebruiken echte repositories en een aparte SQLite-database in het geheugen per test. Foreign keys zijn ingeschakeld. Er is geen PostgreSQL-server, MQTT-broker of bestaande database-inhoud nodig.

Alle 27 tests slagen hier: de bestaande 19 en de acht nieuwe tests. Getest met Python 3.12 en FastAPI 0.135.3. De nieuwe controles moeten lokaal nog worden uitgevoerd met Python 3.14 en waar nodig de echte PostgreSQL-omgeving.

Voor het importeren van de ORM-modellen worden in de testklasse tijdelijk testinstellingen gebruikt. De databasehandelingen lopen via een override van `get_db` naar de eigen testdatabase. De bestaande koppeling tussen ORM-`Base`, configuratie en de standaardengine is hiermee niet in de productcode opgelost.

## Overnemen

Pak de map `backend` uit deze zip uit in de projectmap:

- Vervang `backend/api/v1/car_logs_api.py`.
- Voeg de andere vier bestanden toe.

De zip is gebaseerd op de meest recent aangeleverde volledige projectzip. Er worden geen bestanden verwijderd. Een patch is hiervoor niet nodig.

Voer vanuit de projectmap alleen de nieuwe tests uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_car_logs_api.py" -v
```

Voor de volledige reeks:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

## Verbeterpunten voor later

### RFID-log en autopositie gezamenlijk opslaan

De log wordt nog steeds met een eerste commit opgeslagen. De autopositie volgt met een tweede commit. Als de tweede handeling mislukt, kan de log dus al zijn opgeslagen terwijl de autopositie niet is bijgewerkt. De nieuwe fouttest bevestigt dat dit gedrag al bestond.

Een gezamenlijke transactie is een aparte verbetering. De huidige fouttest legt de bestaande werking vast en moet bij die bewuste gedragswijziging worden aangepast. Het behouden van deze fout is geen aanbeveling voor het uiteindelijke ontwerp.

### Andere afhankelijkheden

Tijdens het bredere onderzoek zijn ook deze kandidaten gevonden:

- `car_commands_api.py` bevat controles en mutatielogica naast directe repositoryaanroepen.
- De beheerder-login controleert gegevens en maakt tokens in de API, terwijl de toegangscode-login een service gebruikt.
- Bestaande authenticatie- en toegangscodeservices gebruiken HTTP-fouten en FastAPI-dependencyfuncties.
- ORM-modellen importeren `Base` uit een module die ook configuratie en de database-engine aanmaakt.
- De digital-twin-API wijzigt gedeelde toestand en roept de scoreberekening rechtstreeks aan.
- `scoreCalculator.py` combineert scoreformules met MQTT-afhandeling.

Een rechtstreekse repositoryaanroep bij eenvoudige CRUD is niet automatisch een probleem. Ik heb daarom niet voor alle endpoints extra servicelagen toegevoegd.

Deze punten zijn in dit document vastgelegd als voorstellen voor backlog-items; er zijn hiervoor geen GitHub-issues aangemaakt.

## Status

De RFID-logverwerking is lokaal via Docker en Swagger gecontroleerd. Na het toevoegen van een log voor `test_car` is de log opgeslagen en de autopositie bijgewerkt naar `test_segment`. Beide gegevens zijn via de GET-endpoints opgehaald en in pgAdmin gecontroleerd.
