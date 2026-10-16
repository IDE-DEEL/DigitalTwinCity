# Afzonderlijke test voor beweging

## Wat ik heb toegevoegd

De test staat in `backend/tests/test_movement_controller.py`:

`MovementControllerTests.test_one_step_moves_car_forward_and_updates_distance`

Ik maak een bewegingscontroller aan met een rechte route van `(1, 2)` naar `(11, 2)`. De snelheid is `0.5` kaarteenheid per seconde en de tijdstap is `0.2` seconde. Na één stap verwacht ik dus een verplaatsing van `0.1` kaarteenheid in de x-richting.

De test bewaart de positie vóór de stap als een afzonderlijke kopie en vergelijkt die met de positie na `update()`.

De controles zijn:

- De positie is veranderd.
- De x-positie is met `0.1` toegenomen.
- De y-positie is gelijk gebleven.
- De afgelegde afstand is met `0.1` toegenomen.
- De auto heeft het route-einde nog niet bereikt.

De test gebruikt de echte controller en PID-berekening. Er worden geen bewegingsfuncties nagebootst. Iedere uitvoering maakt een eigen controller aan. Voor deze taak is geen applicatiecode aangepast.

Dit controleert één rechte bewegingsstap. Bochten, obstakels en de hele route worden hiermee niet afzonderlijk getest.

## Overnemen en uitvoeren

Voeg de twee bestanden uit de zip toe aan de bestaande projectmap. De eerder toegevoegde pauze/hervattests blijven staan.

Voer vanuit de projectmap alleen de bewegingstest uit:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_movement_controller.py" -v
```

Voor alle tests:

```powershell
uv run --project backend python -m unittest discover -s backend/tests -p "test_*.py" -v
```
