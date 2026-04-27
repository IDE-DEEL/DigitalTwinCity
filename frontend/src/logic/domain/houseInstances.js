import { HOUSE_ID_STRAIGHT, HOUSE_ID_CURVE, HOUSE_ID_T_SPLIT, HOUSE_ID_DEPOT } from "../../constants/mapConstants"

export const HOUSE_INSTANCES = [
    // first/top row of the map, from left to right
    {
        id: 'curve-0-0',
        tileX: 0,
        tileY: 0,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
    {
        id: 'tsplit-1-0',
        tileX: 1,
        tileY: 0,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },
    {
        id: 'straight-2-0',
        tileX: 2,
        tileY: 0,
        tileType: 'straight',
        houseId: HOUSE_ID_STRAIGHT
    },
    {
        id: 'straight-3-0',
        tileX: 3,
        tileY: 0,
        tileType: 'straight',
        houseId: HOUSE_ID_STRAIGHT
    },
    {
        id: 'curve-4-0',
        tileX: 4,
        tileY: 0,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },

    // second row of the map, from left to right
    {
        id: 'tsplit-0-1',
        tileX: 0,
        tileY: 1,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },
    {
        id: 'curve-2-1',
        tileX: 2,
        tileY: 1,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
    {
        id: 'curve-3-1',
        tileX: 3,
        tileY: 1,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
    {
        id: 'tsplit-4-1',
        tileX: 4,
        tileY: 1,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },

    // third row of the map, from left to right
    {
        id: 'straight-0-2',
        tileX: 0,
        tileY: 2,
        tileType: 'straight',
        houseId: HOUSE_ID_STRAIGHT
    },
    {
        id: 'curve-1-2',
        tileX: 1,
        tileY: 2,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
    {
        id: 'tsplit-3-2',
        tileX: 3,
        tileY: 2,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },
    {
        id: 'depot-4-2',
        tileX: 4,
        tileY: 2,
        tileType: 'depot',
        houseId: HOUSE_ID_DEPOT
    },

    // fourth/bottom row of the map, from left to right
    {
        id: 'curve-0-3',
        tileX: 0,
        tileY: 3,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
    {
        id: 'straight-1-3',
        tileX: 1,
        tileY: 3,
        tileType: 'straight',
        houseId: HOUSE_ID_STRAIGHT
    },
    {
        id: 'tsplit-2-3',
        tileX: 2,
        tileY: 3,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },
    {
        id: 'tsplit-3-3',
        tileX: 3,
        tileY: 3,
        tileType: 't_split',
        houseId: HOUSE_ID_T_SPLIT
    },
    {
        id: 'curve-4-3',
        tileX: 4,
        tileY: 3,
        tileType: 'curve',
        houseId: HOUSE_ID_CURVE
    },
]