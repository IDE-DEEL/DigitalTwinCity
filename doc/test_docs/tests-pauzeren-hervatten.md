# Tests voor pauzeren en hervatten

## Wat ik heb toegevoegd

In `backend/tests/test_simulation_pause_resume.py` staan twee automatische tests:

- `test_pause_resume_preserves_normal_simulation`
- `test_pause_resume_preserves_demo_simulation`

Beide tests starten de echte WebSocket-handler en simulatielus met een echte `SimulationService` en een echt simulatiemodel. De socket is vervangen door wachtrijen voor commando's en antwoorden. Er is geen browser, netwerkverbinding, database of MQTT-broker nodig.

De tests hergebruiken de startinstellingen uit `test_demo_configuration.py`.

## Wat de tests controleren

De simulatie wordt eerst gestart en de auto moet daadwerkelijk bewegen. In normale modus mag de auto daarvoor eerst pakketten laden.

Daarna wordt twee keer gepauzeerd en hervat. Per cyclus controleren de tests:

1. Het pauzecommando geeft `simulation_paused` terug.
2. De simulatie blijft actief, maar staat op pauze.
3. De simulatielus krijgt drie keer de gelegenheid om verder te gaan. Het stapnummer, de simulatietijd, de posities en de overige gegevens uit de modeluitvoer blijven gelijk. Ook de exacte afgelegde afstand blijft gelijk.
4. Er worden tijdens die pauzemomenten geen simulatie-updates verstuurd.
5. Statistieken kunnen tijdens pauze nog worden opgevraagd en tonen hetzelfde stapnummer.
6. Het hervatcommando geeft `simulation_resumed` terug.
7. Dezelfde modelinstantie en dezelfde auto gaan verder. Het stapnummer, de simulatietijd, de positie en de afstand veranderen weer.

Tot slot wordt de simulatie gestopt en de socketverbinding afgesloten. Ook de opruiming van het model wordt gecontroleerd.

## Geen vaste wachttijden

De wachttijd in de simulatielus is vervangen door een gecontroleerde klok. De test bepaalt wanneer de volgende lusronde mag plaatsvinden. Zo hoeft de test niet een aantal seconden te slapen en is de uitkomst niet afhankelijk van de snelheid van de computer.

Er worden wel time-outs gebruikt om te voorkomen dat de test blijft hangen als een verwacht antwoord uitblijft. De vervanging van de klok en de servicefabriek wordt na iedere test hersteld.

## Resultaat

De twee nieuwe tests slagen. Ook de bestaande zestien tests blijven slagen: in totaal achttien tests.

Daarnaast zijn tijdelijk twee fouten nagebootst:

- De pauzecontrole in de simulatielus negeren.
- De pauzestatus bij hervatten niet uitschakelen.

In beide gevallen falen beide nieuwe tests. De fouten zijn niet in de applicatiecode opgeslagen. Er is geen productiecode aangepast voor deze taak.

Deze tests controleren de WebSocket-handler en de simulatie in hetzelfde proces. Ze testen geen echte WebSocket-netwerkverbinding of browserbediening.

## Lokaal uitvoeren

Voer vanuit de projectmap alleen de nieuwe tests uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_simulation_pause_resume.py" -v
```

Voor de volledige testreeks:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```