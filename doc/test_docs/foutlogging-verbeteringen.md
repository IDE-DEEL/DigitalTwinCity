# BE-05 — foutafhandeling en foutlogging

## Foutmeldingen zonder invoerwaarden

`core/error_logging.py` bevat een gedeelde functie voor onverwachte fouten. Een melding bevat:

- Een vaste beschrijving van de mislukte handeling.
- Het type exception.
- De bestandsnamen, functies en regelnummers van de traceback.

De functie neemt geen exceptiontekst, exceptionketen, bronregels of lokale variabelen over. Zo komen bijvoorbeeld een foutief token, een wachtwoord, een payload of SQL-parameters niet via die exceptiontekst in de applicatielog terecht.

Dit is een bewuste afweging: de foutlocatie en het fouttype blijven beschikbaar, maar gedetailleerde exceptionwaarden worden niet opgeslagen. De functie moet altijd met een vaste beschrijving worden aangeroepen.

De helper is geen filter voor alle logging van externe libraries of Uvicorn. Ook eigen logregels die buiten de helper worden toegevoegd moeten op gevoelige gegevens worden gecontroleerd.

## HTTP-fouten

`core/error_handling.py` voegt in `main.py` één foutgrens toe voor onverwachte fouten in HTTP-requesthandlers. Die fout wordt één keer door de applicatie geregistreerd. Het antwoord is:

```json
{"detail": "Internal server error"}
```

De status blijft 500. Dit maakt het onverwachte foutantwoord bewust generiek en geeft er nu een vaste JSON-vorm aan. Normale responses en bestaande 401-, 404- en validatiefouten blijven werken zonder extra melding van deze foutgrens.

Dit vangt geen fouten af die pas na het versturen van een streamingresponse ontstaan, en verandert ook niet de afhandeling van alle opstartfouten van het framework.

## Simulatie-WebSocket

- Ongeldige start- en snelheidsinstellingen geven nog steeds `validation_error`. De invoerwaarden worden niet meer geprint.
- Ongeldig JSON, een bericht dat geen object is en een onjuist type voor `parameters` worden als validatiefout afgehandeld.
- Een fout tijdens een simulatiestap stopt de simulatielus en schakelt de pauzestatus uit.
- De backend stuurt een vaste melding met `command: error` en `result.type: simulation_error`.
- Een onverwachte fout tijdens het verwerken van een commando gebruikt `result.type: internal_error`.
- Ruwe exceptiontekst wordt niet meer naar de frontend gestuurd.
- Een normale disconnect of bewuste annulering wordt niet als fout gelogd.
- Bij een fout wordt niet opnieuw `stop_simulation()` aangeroepen om statistieken te berekenen: juist die berekening kan de oorspronkelijke fout hebben veroorzaakt.
- Via dezelfde WebSocket kan na een mislukte simulatiestap een nieuwe simulatie worden gestart. Dit is getest met de echte WebSocketroute.

Als het versturen van een foutbericht zelf mislukt doordat de verbinding weg is, wordt voor datzelfde incident geen tweede foutlog toegevoegd.

De backend verstuurt de nieuwe fouttypes. Hoe de bestaande frontend die types toont en de knoppen daarop aanpast, moet afzonderlijk worden gecontroleerd; dit pakket wijzigt alleen de backend.

## CSV-export

Geen model of beschikbare data blijft `None` opleveren. Een echte exportfout wordt één keer in de service geregistreerd en geeft nu `SimulationExportError`.

De WebSocket vertaalt deze fout naar het bestaande `export_data`-antwoord met `status: error` en de vaste melding `Simulation data could not be exported`. Deze fout wordt daar niet nogmaals gelogd.

Dit verandert bewust het gedrag voor directe Python-aanroepen van `export_data_as_csv()` bij een fout: die ontvangen nu een exception in plaats van `None`. De bestaande WebSocketaanroep is hiervoor aangepast.

## MQTT en voertuigupdates

- Als verbinden of het starten van de MQTT-netwerklus mislukt, wordt de clientreferentie weer leeg gemaakt. Opnieuw starten maakt een nieuwe client aan.
- De mislukte client wordt zo goed mogelijk opgeruimd. Een fout tijdens het opruimen vervangt de oorspronkelijke fout niet.
- De startmethode geeft de fout door aan de aanroeper. Die verzorgt de enkele foutmelding, bijvoorbeeld bij applicatiestart of een digital-twin-commando.
- Afwijzen van een verbinding en mislukte lokale abonnementsaanvragen geven een foutmelding.
- Meerdere mislukte aanvragen in dezelfde abonnementsronde worden samengevoegd in één melding met aantallen.
- Dit controleert het resultaat van de lokale `subscribe()`-aanvraag. Een aparte controle van alle broker-SUBACK-redenen is niet toegevoegd.
- De echte MQTT-callback heeft nu een foutgrens. Een fout in de berichtverwerking wordt geregistreerd zonder het bericht of exceptiontekst af te drukken.
- Een fout in een listener wordt geregistreerd; andere listeners blijven uitgevoerd worden.
- Een fout in een uitgestelde hervatactie wordt geregistreerd zonder autogegevens of payload in de log.

De rij-, bezorg- en verkeersbeslissingen zelf zijn niet opnieuw ontworpen. Het eerder vastgelegde aandachtspunt dat een uitgestelde hervatactie opnieuw moet controleren of rijden toegestaan is, blijft vervolgwerk.

## Digital-twin-WebSocket

Een mislukte broadcast naar één verbinding houdt de andere verbindingen niet meer tegen. De mislukte verbinding wordt verwijderd. Normaal afsluiten is stil; een onverwachte verzendfout wordt eenmaal geregistreerd.

Het verwijderen van een verbinding is herhaalbaar gemaakt. Ook het resultaat van een ingeplande broadcast wordt gecontroleerd, zodat een onverwachte fout in die achtergrondactie niet onopgemerkt blijft.

Bij een fout tijdens een commando krijgt de betreffende verbinding zo mogelijk een vaste melding:

```json
{
  "type": "error",
  "payload": {
    "type": "command_error",
    "message": "Digital twin command could not be processed"
  }
}
```

De verbinding wordt bij het verlaten van de handler opgeruimd. De verwerking van dit nieuwe foutbericht in de frontend is niet aangepast.

## Authenticatie en score/MQTT

Een ongeldige toegangscode houdt het bestaande 401-antwoord en levert geen extra applicatielog op. Een onverwacht probleem bij hashcontrole wordt wel geregistreerd, zonder hash of code.

De overgebleven foutprints in de score/MQTT-module zijn vervangen door vaste waarschuwingen en foutmeldingen. Ongeldige batterij-, snelheids- en PID-waarden worden zonder de ontvangen waarde gemeld. Ongeldige UTF-8 wordt afgehandeld. Signaalverlies blijft zichtbaar; gewone metingen en herstelmeldingen blijven stil.

De bestaande losse import van scoregewichten via `from config import WEIGHTS` is niet gerepareerd. Een mislukte import wordt nu met foutlocaties geregistreerd. Het scheiden van de scoreformules en de losse MQTT-integratie blijft vervolgwerk.

## Tests en controles

De volledige reeks bevat nu **55 tests**: de bestaande 32 en 23 nieuwe foutscenario’s in `tests/test_error_logging.py`. Alle tests slagen hier. De nieuwe fouttests slagen ook afzonderlijk.

De controles omvatten onder andere:

- Eén HTTP-foutlog en een generiek 500-antwoord.
- Geen extra foutlog voor een verwachte 404 of ongeldige toegangscode.
- Tracebacklocaties zonder exceptiontekst, keten, bronregels of lokale waarden.
- Een gestopte simulatielus en een vaste foutmelding bij een mislukte stap.
- Opnieuw starten na een achtergrondfout via de echte WebSocketroute.
- Validatiefouten zonder de ontvangen invoer in log of antwoord.
- Een exportfout onderscheiden van ontbrekende data, zonder dubbel loggen.
- Doorgaan met andere listeners en verbindingen na een fout.
- Herstel na mislukte MQTT-start, mislukte netwerklus en opruimfouten.
- Eén melding bij meerdere mislukte abonnementsaanvragen.
- Behoud van de bestaande simulatie, demo, beweging, RFID-logtransactie en voertuigscenario’s.

De bestaande MQTT-test is aangepast omdat de client nu de beschermde callback gebruikt. Bewust opgewekte fouten in bestaande tests worden opgevangen en op hun logging gecontroleerd, zodat ze niet onnodig als losse foutmeldingen door het testoverzicht lopen.

Daarnaast is de volledige FastAPI-app gestart met een SQLite-testdatabase en een nagebootste MQTT-startfout. Healthcheck en OpenAPI bleven werken. De startupfout en een geforceerde HTTP-fout werden ieder eenmaal geregistreerd, zonder de gebruikte geheime testwaarden.

Alle Pythonbestanden en interne importpaden zijn gecontroleerd. Er zijn geen uitvoerbare productieprints meer; prints die alleen in documentatievoorbeelden staan zijn behouden.

## lokaal uitvoeren

Voer vanuit de projectmap alleen de nieuwe fouttests uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_error_logging.py" -v
```

Voor de volledige reeks:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```

De tests reproduceren de fouten zonder echte broker, auto's of bestaande database-inhoud. Er hoeven geen tijdelijke foutendpoints aan de lokale applicatie te worden toegevoegd.

Na het opnieuw bouwen/starten van de backend kunnen de Dockerlogs worden bekeken met:

```powershell
docker compose logs --tail=100 backend
```

Normale Uvicorn-toegangslogs en waarschuwingen uit dependencies blijven buiten deze wijziging. Er is geen globale loggingconfiguratie toegevoegd die de bestaande serverlogging overschrijft.
