import { HOUSE_INSTANCES } from "./houseInstances";

/**
 * All houses are defined in houseInstances.js.
 * House ID's are linked to their tile type plus x-y coordinates, for example: 'curve-0-0' or 'tsplit-1-0'.
 * 
 * Use the coordinate overlay devtool to quickly find the tiles (X,Y) as well as tile types to add houses to the scenario.
 */
const SCENARIOS = {
    rustig: {
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
        label: 'Gemiddeld',
        houses: {
            'tsplit-4-1': 2,
            'curve-3-1': 2,
            'tsplit-2-3': 3,
            'tsplit-3-3': 1,
            'curve-0-0': 5,
            'tsplit-0-1': 2,
            'straight-2-0': 3,
        }
    },
    druk: {
        label: 'Druk',
        houses: {
            'curve-0-0': 2,
            'tsplit-1-0': 4,
            'straight-2-0': 3,
            'straight-3-0': 7,
            'curve-4-0': 1,
            'tsplit-0-1': 5,
            'curve-2-1': 3,
            'curve-3-1': 2,
            'straight-0-2': 3,
            'curve-1-2': 5,
            'tsplit-3-2': 3,
            'curve-0-3': 6,
            'tsplit-2-3': 2,
            'tsplit-3-3': 9,
            'curve-4-3': 4, 
        }
    },
}

export const SCENARIO_OPTIONS = Object.keys(SCENARIOS).map((scenarioKey) => ({
    value: scenarioKey,
    label: SCENARIOS[scenarioKey].label,
}));

export function getHousesForScenarioByValue(scenarioKey) {
    return SCENARIOS[scenarioKey]?.houses || {};
}