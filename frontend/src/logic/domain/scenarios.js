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
            // row 1
            'flat-4-0': 3,
            'detached-6-0': 1,
            // row 2
            'detached-0-1': 1,
            'flat-2-1': 5,
            'flat-5-1': 3,
            // row 3
            'terraced-2-2': 2,
            'flat-4-2': 3,
            // row 4
            'terraced1-0-3': 3,
            'flat-2-3': 4,
            // row 5
            'terraced-2-4': 1,
            'mixed-3-4': 2,
            // row 6
            'semiDetached-0-5': 1,
            'detached-3-5': 1,
            // row 7
            'detached-0-6': 2,
            'semiDetached-2-6': 1,
        }
    },
    gemiddeld: {
        label: 'Gemiddeld',
        houses: {
            // row 1
            'detached-0-0': 1,
            'flat-3-0': 6,
            'flat-4-0': 2,
            'detached-6-0': 1,
            // row 2
            'detached-0-1': 1,
            'flat-2-1': 9,
            'flat-5-1': 7,
            // row 3
            'terraced-0-2': 6,
            'mixed-2-2': 3,
            'terraced-2-2': 2,
            'flat-4-2': 14,
            'flat-5-2': 7,
            // row 4
            'terraced1-0-3': 3,
            'flat-2-3': 12,
            'terraced-3-3': 2,
            // row 5
            'terraced-2-4': 5,
            'mixed-3-4': 2,
            // row 6
            'semiDetached-0-5': 3,
            'detached-1-5': 1,
            'semiDetached2-2-5': 2,
            // row 7
            'semiDetached-2-6': 2,
            'semiDetached-3-6': 1,
        }
    },
    druk: {
        label: 'Druk',
        houses: {
            // row 1
            'detached-0-0': 4,
            'detached-2-0': 2,
            'flat-3-0': 20,
            'flat-4-0': 11,
            'detached-6-0': 1,
            // row 2
            'detached-0-1': 3,
            'detached-1-1': 2,
            'flat-2-1': 16,
            'flat-5-1': 22,
            // row 3
            'terraced-0-2': 10,
            'mixed-2-2': 9,
            'terraced-2-2': 6,
            'terraced-3-2': 15,
            'flat-4-2': 10,
            'flat-5-2': 19,
            // row 4
            'terraced1-0-3': 12,
            'terraced2-0-3': 8,
            'terraced-1-3': 5,
            'flat-2-3': 24,
            'terraced-3-3': 7,
            // row 5
            'terraced-2-4': 5,
            'mixed-3-4': 13,
            // row 6
            'semiDetached-0-5': 1,
            'detached-1-5': 2,
            'semiDetached1-2-5': 3,
            'semiDetached2-2-5': 7,
            'detached-3-5': 1,
            // row 7
            'detached-0-6': 3,
            'terraced-2-6': 14,
            'semiDetached-2-6': 4,
            'semiDetached-3-6': 3,
        }
    },
};

export const SCENARIO_OPTIONS = Object.keys(SCENARIOS).map((scenarioKey) => ({
    value: scenarioKey,
    label: SCENARIOS[scenarioKey].label,
}));

export function getHousesForScenarioByValue(scenarioKey) {
    return SCENARIOS[scenarioKey]?.houses || {};
}