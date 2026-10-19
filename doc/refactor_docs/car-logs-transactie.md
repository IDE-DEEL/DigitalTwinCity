# RFID-log en autopositie samen opslaan

## Probleem

De service sloeg eerst een RFID-log op met een commit. Daarna werd de autopositie bijgewerkt met een tweede commit. Als de tweede handeling mislukte, bleef de log bestaan terwijl de auto nog op het vorige segment stond.

## Wijziging

De bestaande `CarLogsService` krijgt via de dependencyfunctie `db.begin` mee als transactiefunctie. Binnen die transactie worden de auto en het segment gecontroleerd en worden beide wijzigingen uitgevoerd.

De betrokken repositorymethodes hebben een optionele parameter gekregen:

- `CarLogsRepository.add(log, commit=True)`
- `CarRepository.update(car, commit=True)`

De service gebruikt voor deze handeling `commit=False`. De repositories voeren dan een `flush()` uit: de wijziging wordt naar de database verstuurd, maar nog niet definitief opgeslagen. Na het succesvol verlaten van de transactie volgt één commit. Bij een fout voert de transactie een rollback uit.

De parameter is alleen met zijn naam mee te geven. Bestaande aanroepen zonder deze parameter blijven zelf committen en refreshen, zoals voorheen. Andere endpoints hoeven hiervoor niet te worden aangepast.

De controles op auto en segment staan binnen de transactie, zodat de eerste databasequery niet al buiten de transactie een automatische transactie start. De dependencyfunctie gebruikt dezelfde requestgebonden databasesessie voor alle drie repositories en voor de transactie. De service importeert nog steeds geen FastAPI of HTTP-fouten.

## API blijft hetzelfde

Er zijn geen wijzigingen aan het API-bestand nodig ten opzichte van de eerder uitgevoerde service-refactor.

- `POST /api/v1/car-logs?car_id=...&rfid_tag=...` blijft bestaan.
- `GET /api/v1/car-logs/{car_id}` blijft bestaan.
- De queryparameters, statuscodes, succesvolle antwoorden en bestaande 404-foutteksten blijven hetzelfde.
- De volledige OpenAPI-beschrijving is gelijk aan die van vóór de wijzigingen.
- Bij een onverwachte databasefout blijft de API een 500 geven. Het verschil is dat er geen gedeeltelijke opslag meer achterblijft.

Deze wijziging maakt de twee writes gezamenlijk. Ze voorkomt niet dat een client twee afzonderlijke succesvolle verzoeken voor dezelfde RFID-waarneming verstuurt; ontdubbeling is een apart onderwerp.

## Tests

De eerdere fouttest is aangepast: bij een fout bij de tweede write mag de log niet meer blijven bestaan.

Daarnaast worden de volgende situaties gecontroleerd:

| Situatie | Verwacht resultaat |
|---|---|
| Beide writes slagen | Log en positie zijn opgeslagen met één commit. |
| Fout bij de tweede repositoryaanroep | Geen nieuwe log en geen gewijzigde positie. |
| Fout nadat beide writes zijn geflusht | Beide wijzigingen teruggedraaid. |
| Databasefout bij het invoegen van de log | Geen log en de positie blijft gelijk. |
| Fout in de `before_commit`-fase | Geen commit en beide wijzigingen teruggedraaid. |
| Na een fout opnieuw proberen met dezelfde sessie | De sessie is na rollback bruikbaar; de volgende transactie slaagt. |
| Repositories aanroepen zonder `commit=False` | De bestaande afzonderlijke commits blijven werken. |
| Ontbrekende auto/segment en ophalen van logs | De bestaande API-antwoorden blijven behouden. |

De fout vóór commit wordt nagebootst met een SQLAlchemy-event. Dit is geen test van een verbroken netwerkverbinding tijdens een PostgreSQL-commit.

De volledige reeks bevat nu 32 tests, waarvan dertien voor de RFID-log-API. Alle tests slagen hier. De opslag wordt getest met SQLite in het geheugen en ingeschakelde foreign keys. De andere negentien tests voor simulatie, beweging, demo en voertuigbesturing blijven slagen.

De controles zijn uitgevoerd met Python 3.12 en FastAPI 0.135.3. De nieuwe versie moet lokaal nog met Python 3.14 en PostgreSQL via Docker worden gecontroleerd. Peerreview staat ook nog open.

## Lokaal uitvoeren

Voer vanuit de projectmap de RFID-tests uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_car_logs_api.py" -v
```

Voor de volledige reeks:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

De handmatige controle via Swagger kan met dezelfde API-calls als voorheen. Gebruik een bestaande auto en een bestaand segment, voeg een RFID-log toe en controleer daarna de loggeschiedenis en de autopositie. De foutscenario's worden gecontroleerd door de automatische tests