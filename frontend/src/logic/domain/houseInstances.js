export const HOUSE_INSTANCES = [
    // first/top row of the map, from left to right
    {
        id: 'detached-0-0',
        tileX: 0,
        tileY: 0,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.33, y: 0.34 },
        roadCenter: { x: 0.56, y: 0.55 },
    },
    {
        id: 'detached-2-0',
        tileX: 2,
        tileY: 0,

        supportedLanes: [
            { from: 'S', to: 'W' },
        ],
        labelCoords: { x: 0.65, y: 0.35 },
        roadCenter: { x: 0.45, y: 0.53 },
    },
    {
        id: 'flat-3-0',
        tileX: 3,
        tileY: 0,

        supportedLanes: [
            { from: 'E', to: 'S' },
        ],
        labelCoords: { x: 0.24, y: 0.25 },
        roadCenter: { x: 0.57, y: 0.56 },
    },
    {
        id: 'flat-4-0',
        tileX: 4,
        tileY: 0,

        supportedLanes: [
            { from: 'W', to: 'E' },
        ],
        labelCoords: { x: 0.49, y: 0.86 },
        roadCenter: { x: 0.15, y: 0.61 },   
    },
    {
        id: 'detached-6-0',
        tileX: 6,
        tileY: 0,

        supportedLanes: [
            { from: 'S', to: 'W' },
        ],
        labelCoords: { x: 0.76, y: 0.24 },
        roadCenter: { x: 0.45, y: 0.57 },
    },

    // second row of the map, from left to right
    {
        id: 'detached-0-1',
        tileX: 0,
        tileY: 1,

        supportedLanes: [
            { from: 'S', to: 'N' },
        ],
        labelCoords: { x: 0.92, y: 0.72 },
        roadCenter: { x: 0.65, y: 0.79 },
    },
    {
        id: 'detached-1-1',
        tileX: 1,
        tileY: 1,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.13, y: 0.26 },
        roadCenter: { x: 0.34, y: 0.21 },
    },
    {
        id: 'flat-2-1',
        tileX: 2,
        tileY: 1,

        supportedLanes: [
            { from: 'N', to: 'E' },
        ],
        labelCoords: { x: 0.25, y: 0.74 },
        roadCenter: { x: 0.54, y: 0.44 },
    },
    {
        id: 'flat-5-1',
        tileX: 5,
        tileY: 1,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.5, y: 0.07 },
        roadCenter: { x: 0.83, y: 0.38 },
    },

    // third row of the map, from left to right
    {
        id: 'terraced-0-2',
        tileX: 0,
        tileY: 2,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.14, y: 0.49 },
        roadCenter: { x: 0.38, y: 0.5 },
    },
    {
        id: 'mixed-2-2',
        tileX: 2,
        tileY: 2,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.5, y: 0.11 },
        roadCenter: { x: 0.5, y: 0.36 },
    },
    {
        id: 'terraced-2-2',
        tileX: 2,
        tileY: 2,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.5, y: 0.85 },
        roadCenter: { x: 0.5, y: 0.61 },
    },
    {
        id: 'terraced-3-2',
        tileX: 3,
        tileY: 2,

        supportedLanes: [
            { from: 'S', to: 'N' },
        ],
        labelCoords: { x: 0.86, y: 0.48 },
        roadCenter: { x: 0.63, y: 0.48 },
    },
    {
        id: 'flat-4-2',
        tileX: 4,
        tileY: 2,

        supportedLanes: [
            { from: 'N', to: 'E' },
        ],
        labelCoords: { x: 0.23, y: 0.76 },
        roadCenter: { x: 0.55, y: 0.43 },
    },
    {
        id: 'flat-5-2',
        tileX: 5,
        tileY: 2,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.48, y: 0.07 },
        roadCenter: { x: 0.83, y: 0.37 },
    },

    // fourth row of the map, from left to right
    {
        id: 'terraced1-0-3',
        tileX: 0,
        tileY: 3,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.14, y: 0.64 },
        roadCenter: { x: 0.34, y: 0.63 },
    },
    {
        id: 'terraced2-0-3',
        tileX: 0,
        tileY: 3,

        supportedLanes: [
            { from: 'S', to: 'N' },
        ],
        labelCoords: { x: 0.85, y: 0.47 },
        roadCenter: { x: 0.63, y: 0.49 },
    },
    {
        id: 'terraced-1-3',
        tileX: 1,
        tileY: 3,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.15, y: 0.5 },
        roadCenter: { x: 0.37, y: 0.51 },
    },
    {
        id: 'flat-2-3',
        tileX: 2,
        tileY: 3,

        supportedLanes: [
            { from: 'S', to: 'W' },
        ],
        labelCoords: { x: 0.68, y: 0.31 },
        roadCenter: { x: 0.45, y: 0.56 },
    },
    {
        id: 'terraced-3-3',
        tileX: 3,
        tileY: 3,

        supportedLanes: [
            { from: 'N', to: 'S' },
        ],
        labelCoords: { x: 0.14, y: 0.49 },
        roadCenter: { x: 0.37, y: 0.49 },
    },

    // fifth row of the map, from left to right
    {
        id: 'terraced-2-4',
        tileX: 2,
        tileY: 4,

        supportedLanes: [
            { from: 'W', to: 'E' },
            { from: 'W', to: 'N' },
        ],
        labelCoords: { x: 0.25, y: 0.85 },
        roadCenter: { x: 0.24, y: 0.63 },
    },
    {
        id: 'mixed-3-4',
        tileX: 3,
        tileY: 4,

        supportedLanes: [
            { from: 'S', to: 'N' },
        ],
        labelCoords: { x: 0.86, y: 0.51 },
        roadCenter: { x: 0.64, y: 0.5 },
    },

    // sixth row of the map, from left to right
    {
        id: 'semiDetached-0-5',
        tileX: 0,
        tileY: 5,

        supportedLanes: [
            { from: 'S', to: 'N' },
        ],
        labelCoords: { x: 0.88, y: 0.26 },
        roadCenter: { x: 0.63, y: 0.25 },
    },
    {
        id: 'detached-1-5',
        tileX: 1,
        tileY: 5,

        supportedLanes: [
            { from: 'N', to: 'S' },
            { from: 'E', to: 'S' },
        ],
        labelCoords: { x: 0.09, y: 0.78 },
        roadCenter: { x: 0.36, y: 0.74 },
    },
    {
        id: 'semiDetached1-2-5',
        tileX: 2,
        tileY: 5,

        supportedLanes: [
            { from: 'W', to: 'E' },
        ],
        labelCoords: { x: 0.25, y: 0.94 },
        roadCenter: { x: 0.25, y: 0.64 },
    },
    {
        id: 'semiDetached2-2-5',
        tileX: 2,
        tileY: 5,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.75, y: 0.07 },
        roadCenter: { x: 0.74, y: 0.38 },
    },
    {
        id: 'detached-3-5',
        tileX: 3,
        tileY: 5,

        supportedLanes: [
            { from: 'W', to: 'N' },
            {from: 'W', to: 'E' },
        ],
        labelCoords: { x: 0.23, y: 0.96 },
        roadCenter: { x: 0.29, y: 0.63 },
    },

    // seventh row of the map, from left to right
    {
        id: 'detached-0-6',
        tileX: 0,
        tileY: 6,

        supportedLanes: [
            { from: 'N', to: 'E' },
        ],
        labelCoords: { x: 0.34, y: 0.65 },
        roadCenter: { x: 0.55, y: 0.42 },
    },
    {
        id: 'terraced-2-6',
        tileX: 2,
        tileY: 6,

        supportedLanes: [
            { from: 'W', to: 'E' },
        ],
        labelCoords: { x: 0.12, y: 0.87 },
        roadCenter: { x: 0.12, y: 0.63 },
    },
    {
        id: 'semiDetached-2-6',
        tileX: 2,
        tileY: 6,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.75, y: 0.07 },
        roadCenter: { x: 0.75, y: 0.36 },
    },
    {
        id: 'semiDetached-3-6',
        tileX: 3,
        tileY: 6,

        supportedLanes: [
            { from: 'E', to: 'W' },
        ],
        labelCoords: { x: 0.76, y: 0.06 },
        roadCenter: { x: 0.75, y: 0.36 },
    },
];