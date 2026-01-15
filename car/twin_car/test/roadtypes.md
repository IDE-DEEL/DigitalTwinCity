Below are the different road types. Assuming that the assets of the corresponding files are used, the orientation of the road pieces is the same as shown in the tables.

The numbers in the tables correspond to the binding indices of the road pieces in the twin car environment.

If a road piece has multiple binding indices (e.g., 2a and 2b), the car asset should be drawn in between these two indices.

## Roundabout (roundabout.JPG)

| 0 | 1 | 2 | 0 |
|---|---|---|---|
| 3 | 4 | 5 | 6 |
| 7 | 8 | 9 | 10 |
| 0 | 11 | 12 | 0 |

## Crossroad (cross_split.JPG)

| 0 | 1 | 2 | 0 |
|---|---|---|---|
| 3 | 4 | 5 | 6 |
| 7 | 8 | 9 | 10 |
| 0 | 11 | 12 | 0 |


## Straight (straight.JPG)

| 0 | 0 | 0 | 0 |
|---|---|---|---|
| 1 | 2a | 2b | 3 |
| 4 | 5a | 5b | 6 |
| 0 | 0 | 0 | 0 |

## Curve (curve.JPG)

| 0 | 0 | 0 | 0 |
|---|---|---|---|
| 1 | 2a | 0 | 0 |
| 4 | 5 | 2b | 0 |
| 0 | 6 | 3 | 0 |

## T-junction (t_split.JPG)

| 0 | 7 | 8 | 0 |
|---|---|---|---|
| 4 | 5a | 5b | 6 |
| 1 | 2a | 2b | 3 |
| 0 | 0 | 0 | 0 |

## Start (straight.JPG)

| 0 | 1 | 2 | 0 |
|---|---|---|---|
| 0 | 3 | 4 | 0 |
| 0 | 5 | 6 | 0 |
| 0 | 7 | 8 | 0 |

### Map layout


| 20 | 16 | 12 | 8 | 4 |
|----|----|----|---|---|
| 19 | 15 | 11 | 7 | 3 |
| 18 | 14 | 10 | 6 | 2 |
| 17 | 13 | 9  | 5 | 1 |

## middle lines (straight.JPG)

| 0 | { x: 0.305, y: 0.155 } | { x: 0.545, y: 0.155 } | 0 |
|---|---|---|---|
| { x: 0.125, y: 0.435 } | 0 | 0 | { x: 0.985, y: 0.435 } |
| { x: 0.125, y: 0.695 } | 0 | 0 | { x: 0.985, y: 0.695 } |
| 0 | 0 | 0 | 0 |
