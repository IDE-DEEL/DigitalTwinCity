# BE-05 — stap 1: onnodige uitvoer verwijderen

## Wat ik heb gedaan

Ik heb de bijgewerkte backend gecontroleerd en de normale succesmeldingen, debugprints en uitvoer per bericht verwijderd. In deze stap heb ik de bestaande foutafhandeling niet opnieuw ingericht.

Er zijn 38 uitvoerbare `print()`-aanroepen en vijf `logger.info()`-aanroepen verwijderd uit elf bestanden. De scorevoorbeelden in de docstring van `score/config.py` zijn behouden; deze worden niet uitgevoerd bij een import.

## Verwijderde uitvoer

- Verbinden, verbreken en bewust annuleren van een simulatieverbinding.
- Volledige berichten en payloads van de digital-twin-WebSocket.
- Debugregels zoals `Case werkt`, het payloadtype en de activatiestatus.
- Iedere ontvangen RFID-tag en het opvragen van pakketgegevens.
- Succesvol verbinden met MQTT en afzonderlijke abonnementen.
- Wachten op RFID, telemetrie of nog ontbrekende scoregegevens.
- Begin en einde van een rit, batterijmetingen en laadstatus.
- Het berekenen en afdrukken van succesvolle scores.
- Een normaal ontbrekend simulatiemodel of ontbrekende agents bij statistieken.
- Succesvol inloggen en het aanmaken, wijzigen en verwijderen van toegangscodes.
- De melding dat een eerder verloren signaal is hersteld.

De berekening van een score wordt nog steeds uitgevoerd en de rittoestand wordt daarna nog steeds gereset. Alleen het afdrukken van het resultaat is verwijderd. Ook alle andere berekeningen, MQTT-commando's en antwoorden blijven behouden.

## Behouden foutmeldingen

De bestaande meldingen over onder andere mislukte verbindingen, ongeldige telemetrie, listenerfouten, exportfouten, onverwachte simulatiefouten en corrupte hashes zijn behouden. De bestaande melding voor een mislukte inlogpoging is ook behouden.

Signaalverlies blijft zichtbaar. Het bijhouden van zowel signaalverlies als herstel blijft werken; herstel veroorzaakt alleen geen normale statusmelding meer.

Een normale WebSocket-disconnect blijft afgehandeld worden, maar zonder consolebericht. Waar het verwijderen van de enige print een lege exceptiontak zou achterlaten, staat nu `pass`. Het annuleren en opruimen van de simulatietaak blijft behouden.

Dit is nog niet de privacy- en tracebackverbetering. Sommige bestaande foutmeldingen bevatten nog de ontvangen foutieve waarde of exceptiontekst. Die nemen we in de volgende stap mee. Er is geen nieuwe logging toegevoegd.

## Aangepaste bestanden

Paden vanuit `backend`:

| Bestand | Verwijderde uitvoer |
|---|---|
| `api/manager.py` | Normaal verbreken van een verbinding. |
| `api/v1/digital_twin.py` | Payloads, debugprints en activatiestatus. |
| `digital_sim/controller/v1/digital_sim_api.py` | Verbinden, normaal verbreken en annuleren. |
| `digital_sim/service/simulation_statistics.py` | Normaal ontbrekend model of agents. |
| `services/access_codes_service.py` | Succesvolle toegangscodeacties. |
| `services/auth_service.py` | Succesvolle login. |
| `vehicle_control/service.py` | Iedere ontvangen RFID-tag. |
| `vehicle_control/package_service.py` | Het opvragen van pakketgegevens. |
| `vehicle_control/mqtt_client.py` | Verbinden, abonnementen en wachten op RFID. |
| `vehicle_control/__main__.py` | Normale startmelding. |
| `score/scoreCalculator.py` | Normale telemetrie-, score- en startmeldingen. |

## Controle

Alle 32 bestaande tests slagen na de wijziging. Daarmee blijven onder andere de transactie, API-antwoorden, simulatie, pauzeren/hervatten, beweging, demoroutewissels en de opgenomen voertuigscenario's werken.

Daarnaast heb ik afzonderlijk gecontroleerd dat succesvolle MQTT-abonnementen, normale telemetrieverwerking, scoreberekening en het opvragen van statistieken zonder model geen console-uitvoer meer geven. Mislukte MQTT-verbindingen en signaalverlies blijven wel een melding geven.

Voor de controle van de losse score/MQTT-handler is de bestaande `config`-import tijdelijk nagebootst. De bestaande losse import `from config import WEIGHTS` is niet gerepareerd; die blijft een aandachtspunt voor vervolgwerk.

Er zijn voor deze opruimstap geen nieuwe permanente tests toegevoegd. De bestaande tests zijn niet aangepast.

Voer vanuit de projectmap uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Start daarna lokaal de bijgewerkte app en controleer of normale bediening minder uitvoer geeft.

Uvicorn-toegangslogs en waarschuwingen van gebruikte libraries zijn niet aangepast. De uitvoer van `unittest` zelf blijft ook bestaan.