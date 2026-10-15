# #1013 — Democonfiguratie in het simulatiemodel

## Wat ik heb aangepast

`demo_mode` en `demo_routes` worden nu meegegeven bij het aanmaken van `CarModel`. Het model bewaart deze instellingen en controleert in demo-modus of iedere auto minimaal één demoroute heeft.

De service zet de routes nog steeds om van SVG-coördinaten naar simulatiecoördinaten. Daarna geeft de service de complete configuratie door aan het model. De instellingen worden niet meer achteraf op het model gezet. Ook is de dubbele toewijzing van `demo_mode` verwijderd.

De agent en de service kunnen `model.demo_mode` nu direct gebruiken. Een controle met `getattr()` is niet meer nodig, omdat ieder `CarModel` deze instelling heeft.

## Aangepaste bestanden

- `digital_sim/domain/car_model.py`
- `digital_sim/domain/car_agent.py`
- `digital_sim/service/simulation_service.py`

Daarnaast zijn zes tests toegevoegd in `tests/test_demo_configuration.py`.

De nieuwe constructorparameters zijn optioneel en moeten met hun naam worden meegegeven. De bestaande positie van `rng` blijft behouden. Zonder democonfiguratie start het model in normale modus met een eigen lege verzameling demoroutes.

## Controle

De zes tests zijn geslaagd:

- Een direct aangemaakt model heeft de standaardinstellingen voor normale modus. De lege routeverzameling wordt niet gedeeld met andere modellen.
- Het model weigert demo-modus als een auto geen demoroutes heeft.
- De service geeft de demoroutes door met de juiste coördinaten.
- De normale modus bezorgt twee pakketten in twee laadbeurten en eindigt. CSV-export blijft beschikbaar.
- Een onbereikbare afleverzone leidt nog steeds tot deadlock.
- De demo wisselt meerdere keren van route, behoudt de opgebouwde afstand en blijft draaien. Na opnieuw starten in normale modus zijn de demo-instellingen verdwenen.

Daarnaast heb ik de volledige stapresultaten en CSV-uitvoer vóór en na de wijziging vergeleken met dezelfde willekeurige seed:

| Scenario | Stappen | Resultaat |
|---|---:|---|
| Normale bezorging | 142 | Gelijk; simulatie voltooid |
| Onbereikbare afleverzone | 59 | Gelijk; deadlock |
| Doorlopende demo | 500 | Gelijk; simulatie blijft draaien |

Voer vanuit de projectmap met de geïnstalleerde backendafhankelijkheden uit:

```bash
python -m unittest discover -s backend/tests -p "test_demo_configuration.py" -v
```
