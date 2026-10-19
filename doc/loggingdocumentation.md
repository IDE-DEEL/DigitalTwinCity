# Logafspraken backend

## Doel

De logs moeten helpen om fouten terug te vinden. Normaal gebruik moet geen onnodige uitvoer opleveren. Daarom loggen we geen succesmeldingen, volledige payloads of iedere simulatiestap.

## Wanneer loggen we?

| Situatie | Afspraak |
|---|---|
| Normale werking | Geen extra applicatielog. |
| Ongeldige invoer of ontbrekende gegevens | Een duidelijk API-antwoord. Meestal geen extra logregel. |
| Normale WebSocket-disconnect | Geen foutmelding. |
| Bewust annuleren van een simulatietaak | Geen foutmelding. |
| Afwijkende invoer uit MQTT | Een vaste waarschuwing zonder de ontvangen waarde. |
| Onverwachte fout | Eén foutmelding met de mislukte handeling, het fouttype en de foutlocaties. |

## Logniveaus

- `warning`: een afwijkende situatie die wordt afgehandeld, zoals ongeldige telemetrie of gemeld signaalverlies.
- `error`: een mislukte handeling, zoals een verbindingsfout, exportfout of fout tijdens een simulatiestap.

Succesmeldingen op `info` en debugprints worden niet toegevoegd. Toegangslogs van Uvicorn en waarschuwingen van externe libraries worden apart door die onderdelen verzorgd.

## Waar loggen we?

Een fout wordt gelogd op de plek waar deze wordt afgehandeld.

Als een repository een fout doorgeeft aan een service en de service deze doorgeeft aan de API, loggen we niet in iedere laag opnieuw.

Voorbeelden:

- Onverwachte fouten in HTTP-requesthandlers worden door de centrale HTTP-foutafhandeling geregistreerd.
- Een fout in de simulatielus wordt daar geregistreerd.
- Een exportfout wordt door de exportservice geregistreerd. De WebSocket vertaalt deze alleen naar een antwoord.
- Een mislukte MQTT-start wordt doorgegeven aan de aanroeper. Die verzorgt de foutmelding.

## Welke informatie nemen we op?

Een onverwachte fout bevat:

- Een vaste beschrijving van de mislukte handeling.
- Het type exception.
- Bestandsnamen, functies en regelnummers uit de traceback.

Waar dat nuttig is, kunnen veilige aantallen worden opgenomen. Bijvoorbeeld hoeveel abonnementsaanvragen zijn mislukt.

## Welke informatie nemen we niet op?

We loggen geen:

- Wachtwoorden, tokens of toegangscodes.
- Hashes of databaseverbindingsgegevens.
- Volledige requests, payloads of querystrings.
- Ruwe exceptionteksten die invoer of SQL-parameters kunnen bevatten.
- Lokale variabelen, bronregels of exceptionketens.

Ook bij een fout mogen ontvangen waarden niet zomaar in een logmelding worden opgenomen.

## Onverwachte fouten registreren

Gebruik een logger per module en de gedeelde helper:

```python
import logging

from backend.core.error_logging import log_unexpected_error

logger = logging.getLogger(__name__)

try:
    perform_operation()
except Exception as error:
    log_unexpected_error(logger, "Operation failed", error)
    # Handle the failure here.
```

De beschrijving is vaste tekst. Gebruik hiervoor geen `str(error)`, payload of ontvangen waarde.

De helper bewaart de foutlocaties en het fouttype, maar neemt de oorspronkelijke exceptiontekst en lokale waarden niet over.

Voeg geen brede `except Exception` toe alleen om te loggen en dezelfde fout daarna opnieuw door te geven aan een laag die hem ook registreert.

## Antwoorden naar de frontend

De frontend krijgt een vaste, herkenbare foutmelding zonder interne details.

- Verwachte API-fouten behouden hun bestaande statuscode en antwoord.
- Onverwachte HTTP-fouten geven een generiek 500-antwoord.
- Simulatie- en digital-twin-fouten gebruiken de afgesproken foutberichten.
- Een fout in het versturen van een foutbericht veroorzaakt niet nog een tweede log voor hetzelfde incident.

Een backendfoutbericht betekent niet automatisch dat de frontend het al zichtbaar toont. Ondersteuning voor nieuwe fouttypes moet ook in de frontend worden gecontroleerd.

## Herstel en opruimen

Na een fout moet duidelijk zijn wat er met de uitvoering gebeurt:

- Een mislukte simulatiestap stopt de simulatielus.
- Een mislukte MQTT-start maakt de clientreferentie leeg, zodat opnieuw starten mogelijk blijft.
- Een fout bij het opruimen mag de oorspronkelijke fout niet vervangen.
- Een mislukte listener of verbinding mag andere listeners of verbindingen niet onnodig blokkeren.
- Fouten worden niet stil ingeslikt, behalve wanneer dit bewust onderdeel is van de afhandeling, zoals een al verbroken verbinding tijdens een foutantwoord.

## Tests

Bij een nieuwe of aangepaste foutafhandeling controleren we waar relevant:

- Of de fout wordt geregistreerd.
- Of dezelfde fout niet meerdere keren wordt gelogd.
- Of gevoelige testwaarden ontbreken in logs en antwoorden.
- Of stoppen, rollback of herstel correct werkt.
- Of verwachte fouten geen onnodige foutlogs opleveren.
- Of de bestaande functionaliteit blijft werken.

## Beperking

De gedeelde helper beschermt de foutmeldingen die de applicatie ermee registreert. Het is geen automatisch filter voor alle uitvoer van Uvicorn of externe libraries.

Nieuwe logregels moeten daarom altijd op noodzaak en gevoelige gegevens worden gecontroleerd.