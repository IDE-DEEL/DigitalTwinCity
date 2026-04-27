import { HOUSE_INSTANCES } from "./houseInstances";

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
        houses: {
            'straight-3-0': 2,
            'tsplit-1-0': 1,
            'straight-0-2': 1,
            'tsplit-2-3': 1,
            'curve-4-3': 2,
        }
    },
    gemiddeld: {
        value: 'gemiddeld',
        label: 'Gemiddeld',
        houses: {
            'straight-3-0': 9,
            'tsplit-1-0': 9,
            'straight-0-2': 9,
            'tsplit-2-3': 9,
            'curve-4-3': 9,
        }
    },
}

export const SCENARIO_OPTIONS = Object.keys(SCENARIOS).map((scenarioKey) => ({
    value: SCENARIOS[scenarioKey].value,
    label: SCENARIOS[scenarioKey].label,
}));

export function getHousesForScenarioByValue(scenarioKey) {
    return SCENARIOS[scenarioKey]?.houses || {};
}