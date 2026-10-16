# Simulatieservice opsplitsen

## Wat ik heb aangepast

Ik heb de statistieken en de voorbereiding van de scoreberekening uit `SimulationService` gehaald. Deze staan nu in twee aparte bestanden met gewone functies. Ze hebben geen eigen toestand nodig en krijgen het model mee.

| Bestand | Taak |
|---|---|
| `digital_sim/service/simulation_service.py` | De simulatie starten, stappen uitvoeren en stoppen. Roept de functies voor statistieken en scores aan. |
| `digital_sim/service/simulation_statistics.py` | Statistieken per auto en totalen verzamelen. |
| `digital_sim/service/simulation_scoring.py` | De gegevens uit het model verzamelen, `TripData` aanmaken en de bestaande scoreberekening aanroepen. |

De methode `get_current_statistics()` blijft beschikbaar en geeft dezelfde velden terug: `simulation_stats` en `trip_scores`. De API en frontend kunnen deze methode blijven gebruiken.

De bestaande scoreformules blijven in `score/scoreCalculator.py`. De berekeningen, afrondingen en uitvoervelden zijn overgenomen. CSV-export en het verwerken van startinstellingen blijven voorlopig in de service.

De eerdere refactor van de democonfiguratie zit ook in dit pakket.

## Controle

Alle tien tests zijn geslaagd: de zes bestaande tests voor de democonfiguratie en vier nieuwe tests voor statistieken en scores.

De nieuwe tests controleren:

- De uitvoer als er nog geen model is.
- De uitvoer bij een model zonder agents.
- Dat totalen pas worden afgerond nadat de gegevens van alle agents zijn opgeteld.
- Dat de score-invoer de afstanden en tijden optelt, de batterijpercentages middelt en rijbaanafwijkingen van alle agents meeneemt.

Daarnaast heb ik de volledige stapresultaten, inclusief statistieken en scores, en de CSV-uitvoer vergeleken met de versie van vóór deze opsplitsing. Met dezelfde willekeurige seed waren alle resultaten gelijk.

| Scenario | Stappen | Resultaat |
|---|---:|---|
| Normale bezorging met één auto | 142 | Gelijk; simulatie voltooid |
| Onbereikbare afleverzone | 59 | Gelijk; deadlock |
| Demo met één auto | 500 | Gelijk; blijft draaien |
| Normale bezorging met vijf auto's | 71 | Gelijk; simulatie voltooid |
| Demo met vijf auto's | 500 | Gelijk; blijft draaien |

Getest met Python 3.12 en Mesa 3.5.1. De projectconfiguratie vraagt Python 3.14. Een controle met die versie en een controle via de frontend staan nog open, net als peerreview.

## Overnemen

Ten opzichte van de vorige refactor:

- Vervang `digital_sim/service/simulation_service.py`.
- Voeg `digital_sim/service/simulation_statistics.py` toe.
- Voeg `digital_sim/service/simulation_scoring.py` toe.
- Voeg `tests/test_simulation_reporting.py` en dit document toe.

De oude private methodes `_get_simulation_stats()` en `_calculate_trip_scores()` zijn vervangen door de nieuwe functies. In de onderzochte backend werden deze methodes alleen binnen de service gebruikt.

Voer de tests vanuit de projectmap uit in de Python-omgeving waarin de backendafhankelijkheden zijn geïnstalleerd:

```powershell
python -m unittest discover -s backend/tests -p "test_*.py" -v
```

Bij gebruik van uv:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```
