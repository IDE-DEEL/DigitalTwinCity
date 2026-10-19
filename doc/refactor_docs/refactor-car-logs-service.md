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
| `tests/test_car_logs_api.py` | Dertien tests voor het API-contract, opslag en rollback. |

De service gebruikt geen FastAPI, `Depends` of `HTTPException`. De service geeft eigen fouten door voor een ontbrekende auto, ontbrekend baanvlak of ontbrekende loggeschiedenis. De API vertaalt deze naar dezelfde 404-antwoorden als voorheen.

De repositories blijven verantwoordelijk voor de schrijfhandelingen. De service krijgt nu een transactiefunctie mee en voert de RFID-log en positie-update binnen één transactie uit. De betrokken repositorymethodes ondersteunen `commit=False`; andere aanroepen behouden standaard hun eigen commit. Het logtijdstip en de volgorde van de schrijfhandelingen zijn behouden.

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

Er zijn dertien tests voor de RFID-log-API. De normale antwoorden, foutantwoorden, queryparameters, uitvoervelden en sorteervolgorde zijn behouden. De eerdere test die een gedeeltelijk opgeslagen log verwachtte, is vervangen door een rollbacktest.

Bij succes wordt precies één commit uitgevoerd. Bij fouten wordt gecontroleerd dat geen nieuwe log is opgeslagen en de oude autopositie behouden blijft. Ook een fout nadat beide wijzigingen naar de database zijn verstuurd, een fout vóór commit, hergebruik van dezelfde sessie na rollback en de standaardwerking van de repositories worden getest.

Zie `car-logs-transactie.md` voor de details van de transactiewijziging.

Voer vanuit de projectmap uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_car_logs_api.py" -v
```

Voor de volledige reeks:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```