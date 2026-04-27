import { HOUSE_ID_STRAIGHT, HOUSE_ID_CURVE, HOUSE_ID_T_SPLIT, HOUSE_ID_DEPOT } from "../../constants/mapConstants"

/**
 * Possible tiles that contain houses:
 * - tileType   - # of houses   - houseIDs
 * - straight   - 1 house       - HOUSE_ID_STRAIGHT,
 * - curve      - 1 house       - HOUSE_ID_CURVE,
 * - t_split    - 1 house       - HOUSE_ID_T_SPLIT,
 * - depot      - 1 house       - HOUSE_ID_DEPOT,
 * 
 * Tiles without houses (DO NOT USE THESE):
 * - cross_split
 * - roundabout
 * 
 * Use the coordinate overlay devtool to quickly find the tiles (X,Y) as well as tile types to add houses to the scenario.
 */
const SCENARIOS = {
    rustig: {
        value: 'rustig',
        label: 'Rustig',
        houses: [
            {
                tileX: 3,
                tileY: 0,
                tileType: 'straight',
                houseId: HOUSE_ID_STRAIGHT,
                packageCount: 2
            },
            {
                tileX: 1,
                tileY: 0,
                tileType: 't_split',
                houseId: HOUSE_ID_T_SPLIT,
                packageCount: 1
            },
            {
                tileX: 0,
                tileY: 2,
                tileType: 'straight',
                houseId: HOUSE_ID_STRAIGHT,
                packageCount: 1
            },
            {
                tileX: 2,
                tileY: 3,
                tileType: 't_split',
                houseId: HOUSE_ID_T_SPLIT,
                packageCount: 1
            },
            {
                tileX: 4,
                tileY: 3,
                tileType: 'curve',
                houseId: HOUSE_ID_CURVE,
                packageCount: 2
            },
        ]
    },
    gemiddeld: {
        value: 'gemiddeld',
        label: 'Gemiddeld',
        houses: [
            {
                tileX: 3,
                tileY: 0,
                tileType: 'straight',
                houseId: HOUSE_ID_STRAIGHT,
                packageCount: 9
            },
            {
                tileX: 1,
                tileY: 0,
                tileType: 't_split',
                houseId: HOUSE_ID_T_SPLIT,
                packageCount: 9
            },
            {
                tileX: 0,
                tileY: 2,
                tileType: 'straight',
                houseId: HOUSE_ID_STRAIGHT,
                packageCount: 9
            },
            {
                tileX: 2,
                tileY: 3,
                tileType: 't_split',
                houseId: HOUSE_ID_T_SPLIT,
                packageCount: 9
            },
            {
                tileX: 4,
                tileY: 3,
                tileType: 'curve',
                houseId: HOUSE_ID_CURVE,
                packageCount: 9
            },
        ]
    },
}

export const SCENARIO_OPTIONS = Object.keys(SCENARIOS).map((scenarioKey) => ({
    value: SCENARIOS[scenarioKey].value,
    label: SCENARIOS[scenarioKey].label,
}));

export function getHousesForScenarioByValue(scenarioKey) {
    return SCENARIOS[scenarioKey]?.houses || [];
}