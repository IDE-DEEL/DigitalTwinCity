/*
    Definieert de lane structuur voor de map componenten.
    Elke tile type heeft zijn eigen lane configuratie.
    De coördinaten zijn genormaliseerd tussen 0 en 1.
    IMPORTANT:
    Deze coordinaten zijn gebaseerd op hoe de tile standaard als png in assets zit.
    Als de plaatjes worden veranderd en de ligging ligt anders, moet dit hier bijgwerkt worden.
*/

const NORTHBOUND_X_LANE_CENTER = 0.625;
const SOUTHBOUND_X_LANE_CENTER = 0.375;
const WESTBOUND_Y_LANE_CENTER = 0.375;
const EASTBOUND_Y_LANE_CENTER = 0.625;
const EDGE_OFFSET_LOWER = 0.1;
const EDGE_OFFSET_UPPER = 0.9;

const ROUNDABOUT_POINTS = {
    N: { x: 0.5, y: 0.17 },
    NNE: { x: 0.62, y: 0.19 },
    NE: { x: 0.74, y: 0.27 },
    ENE: { x: 0.81, y: 0.36 },
    E: { x: 0.83, y: 0.5 },
    ESE: { x: 0.81, y: 0.62 },
    SE: { x: 0.74, y: 0.73 },
    SSE: { x: 0.64, y: 0.81 },
    S: { x: 0.5, y: 0.83 },
    SSW: { x: 0.38, y: 0.81 },
    SW: { x: 0.27, y: 0.74 },
    WSW: { x: 0.19, y: 0.64 },
    W: { x: 0.17, y: 0.5 },
    WNW: { x: 0.19, y: 0.38 },
    NW: { x: 0.26, y: 0.27 },
    NNW: { x: 0.36, y: 0.19 },
    N_EXIT: { x: 0.67, y: 0.2 },
    E_EXIT: { x: 0.8, y: 0.67 },
    S_EXIT: { x: 0.33, y: 0.8 },
    W_EXIT: { x: 0.2, y: 0.33 },
};

const CAR_1 = 1;
const CAR_2 = 2;
const CAR_3 = 3;
const CAR_4 = 4;
const CAR_5 = 5;

/*
    SVG goes:
    x = horizontal: higher x → more to the right
    y = vertical: higher y → more downwards

    (0,0)           (1,0)
      +---------------+
      |               |
      |               |
      |               |
      |               |
      +---------------+
    (0,1)           (1,1)
*/
export const TILE_LANES = {
    straight: {
        lanes: [
            {
                from: 'W',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'E',
                to: 'W',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
        ],
    },

    curve: {
        lanes: [
            {
                from: 'S',
                to: 'W',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    { x: 0.61, y: 0.78 },
                    { x: 0.55, y: 0.64 },
                    { x: 0.47, y: 0.54 },
                    { x: 0.37, y: 0.45 },
                    { x: 0.25, y: 0.4 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'W',
                to: 'S',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.2, y: 0.67 },
                    { x: 0.29, y: 0.73 },
                    { x: 0.34, y: 0.81 },
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ],
            },
        ],
    },

    t_split: {
        lanes: [
            {
                from: 'W',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'E',
                to: 'W',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'W',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.26, y: 0.62 },
                    { x: 0.4, y: 0.57 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.58, y: 0.38 },
                    { x: 0.62, y: 0.26 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'E',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: 0.78, y: 0.36 },
                    { x: 0.68, y: 0.33 },
                    { x: 0.64, y: 0.25 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'N',
                to: 'W',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.36, y: 0.24 },
                    { x: 0.31, y: 0.32 },
                    { x: 0.22, y: 0.36 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'N',
                to: 'E',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.37, y: 0.26 },
                    { x: 0.41, y: 0.38 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.6, y: 0.57 },
                    { x: 0.74, y: 0.61 },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
        ],
    },

    cross_split: {
        lanes: [
            {
                from: 'S',
                to: 'N',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'S',
                to: 'E',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    { x: 0.63, y: 0.76 },
                    { x: 0.68, y: 0.66 },
                    { x: 0.78, y: 0.63 },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'S',
                to: 'W',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    { x: 0.61, y: 0.73 },
                    { x: 0.57, y: 0.61 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.4, y: 0.41 },
                    { x: 0.26, y: 0.38 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'E',
                to: 'W',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'E',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: 0.78, y: 0.36 },
                    { x: 0.68, y: 0.31 },
                    { x: 0.64, y: 0.22 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'E',
                to: 'S',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    { x: 0.74, y: 0.38 },
                    { x: 0.61, y: 0.42 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.43, y: 0.59 },
                    { x: 0.38, y: 0.73 },
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ],
            },
            {
                from: 'N',
                to: 'S',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ],
            },
            {
                from: 'N',
                to: 'W',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.36, y: 0.22 },
                    { x: 0.3, y: 0.32 },
                    { x: 0.22, y: 0.36 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'N',
                to: 'E',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.38, y: 0.27 },
                    { x: 0.42, y: 0.4 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.61, y: 0.58 },
                    { x: 0.74, y: 0.62 },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'W',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'W',
                to: 'S',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.22, y: 0.64 },
                    { x: 0.33, y: 0.69 },
                    { x: 0.36, y: 0.78 },
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ],
            },
            {
                from: 'W',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.28, y: 0.61 },
                    { x: 0.4, y: 0.57 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.58, y: 0.4 },
                    { x: 0.62, y: 0.27 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
        ],
    },
    roundabout: {
        lanes: [
            {
                from: 'N',
                to: 'W',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.W_EXIT,
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'N',
                to: 'S',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.S_EXIT,
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ]
            },
            {
                from: 'N',
                to: 'E',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.E_EXIT,
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'N',
                to: 'N',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.N_EXIT,
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ]
            },
            {
                from: 'W',
                to: 'S',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.S_EXIT,
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ]
            },
            {
                from: 'W',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.E_EXIT,
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'W',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.N_EXIT,
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ]
            },
            {
                from: 'W',
                to: 'W',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.W_EXIT,
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'S',
                to: 'E',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.E_EXIT,
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'S',
                to: 'N',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.N_EXIT,
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ]
            },
            {
                from: 'S',
                to: 'W',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.W_EXIT,
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'S',
                to: 'S',
                points: [
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.ESE,
                    ROUNDABOUT_POINTS.E,
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.S_EXIT,
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ]
            },
            {
                from: 'E',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.N_EXIT,
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ]
            },
            {
                from: 'E',
                to: 'W',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.W_EXIT,
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ]
            },
            {
                from: 'E',
                to: 'S',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.S_EXIT,
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
                ]
            },
            {
                from: 'E',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
                    ROUNDABOUT_POINTS.ENE,
                    ROUNDABOUT_POINTS.NE,
                    ROUNDABOUT_POINTS.NNE,
                    ROUNDABOUT_POINTS.N,
                    ROUNDABOUT_POINTS.NNW,
                    ROUNDABOUT_POINTS.NW,
                    ROUNDABOUT_POINTS.WNW,
                    ROUNDABOUT_POINTS.W,
                    ROUNDABOUT_POINTS.WSW,
                    ROUNDABOUT_POINTS.SW,
                    ROUNDABOUT_POINTS.SSW,
                    ROUNDABOUT_POINTS.S,
                    ROUNDABOUT_POINTS.SSE,
                    ROUNDABOUT_POINTS.SE,
                    ROUNDABOUT_POINTS.E_EXIT,
                    { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
                ]
            },
        ],
    },
    t_split_out: {
        lanes: [
            {
                from: 'S',
                to: 'N',
                points: [
                    { x: 0.63, y: EDGE_OFFSET_UPPER },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'S',
                to: 'W',
                points: [
                    { x: 0.63, y: EDGE_OFFSET_UPPER },
                    { x: 0.61, y: 0.71 },
                    { x: 0.54, y: 0.6 },
                    { x: 0.47, y: 0.5 },
                    { x: 0.37, y: 0.43 },
                    { x: 0.25, y: 0.4 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
            {
                from: 'W',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.26, y: 0.62 },
                    { x: 0.4, y: 0.57 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.58, y: 0.38 },
                    { x: 0.62, y: 0.26 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'N',
                to: 'W',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.36, y: 0.24 },
                    { x: 0.31, y: 0.32 },
                    { x: 0.22, y: 0.36 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
        ]
    },
    t_split_in: {
        lanes: [
            {
                from: 'W',
                to: 'E',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: EDGE_OFFSET_UPPER, y: 0.63 },
                ],
            },
            {
                from: 'N',
                to: 'E',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.38, y: 0.26 },
                    { x: 0.42, y: 0.43 },
                    { x: 0.48, y: 0.52 },
                    { x: 0.57, y: 0.58 },
                    { x: 0.7, y: 0.61 },
                    { x: EDGE_OFFSET_UPPER, y: 0.63 },
                ],
            },
            {
                from: 'W',
                to: 'N',
                points: [
                    { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
                    { x: 0.26, y: 0.62 },
                    { x: 0.4, y: 0.57 },
                    { x: 0.5, y: 0.5 },
                    { x: 0.58, y: 0.38 },
                    { x: 0.62, y: 0.26 },
                    { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'N',
                to: 'W',
                points: [
                    { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
                    { x: 0.36, y: 0.24 },
                    { x: 0.31, y: 0.32 },
                    { x: 0.22, y: 0.36 },
                    { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
                ],
            },
        ]
    },
    depot_down: {
        lanes: [
            {
                from: 'W',
                to: 'N',
                carId: [CAR_1, CAR_2],
                route: "end",
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.63 },
                    { x: 0.19, y: 0.56 },
                    { x: 0.26, y: 0.47 },
                    { x: 0.29, y: 0.35 },
                    { x: 0.3, y: 0.23 },
                    { x: 0.3, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'W',
                to: 'N',
                carId: [CAR_3],
                route: "end",
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.63 },
                    { x: 0.19, y: 0.56 },
                    { x: 0.26, y: 0.47 },
                    { x: 0.29, y: 0.35 },
                    { x: 0.3, y: 0.23 },
                    { x: 0.32, y: 0.13 },
                    { x: 0.36, y: 0.04 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_4],
                route: "end",
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.63 },
                    { x: 0.19, y: 0.56 },
                    { x: 0.26, y: 0.47 },
                    { x: 0.29, y: 0.35 },
                    { x: 0.41, y: 0.26 },
                    { x: 0.61, y: 0.23 },
                    { x: EDGE_OFFSET_UPPER, y: 0.23 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_5],
                route: "end",
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.63 },
                    { x: EDGE_OFFSET_UPPER, y: 0.63 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_4],
                route: "start",
                points: [
                    { x: EDGE_OFFSET_UPPER, y: 0.23 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_5],
                route: "start",
                points: [
                    { x: EDGE_OFFSET_UPPER, y: 0.63 },
                ],
            },
        ],
    },
    depot_middle: {
        lanes: [
            {
                from: 'S',
                to: 'E',
                carId: [CAR_1],
                route: "end",
                points: [
                    { x: 0.3, y: EDGE_OFFSET_UPPER },
                    { x: 0.30, y: 0.57 },
                    { x: 0.34, y: 0.46 },
                    { x: 0.4, y: 0.37 },
                    { x: 0.49, y: 0.32 },
                    { x: 0.61, y: 0.31 },
                    { x: EDGE_OFFSET_UPPER, y: 0.31 },
                ],
            },
            {
                from: 'S',
                to: 'E',
                carId: [CAR_2],
                route: "end",
                points: [
                    { x: 0.3, y: EDGE_OFFSET_UPPER },
                    { x: 0.31, y: 0.8 },
                    { x: 0.37, y: 0.71 },
                    { x: 0.46, y: 0.64 },
                    { x: 0.57, y: 0.61 },
                    { x: EDGE_OFFSET_UPPER, y: 0.61 },
                ],
            },
            {
                from: 'S',
                to: 'E',
                carId: [CAR_3],
                route: "end",
                points: [
                    { x: 0.42, y: 0.98 },
                    { x: 0.49, y: 0.93 },
                    { x: 0.58, y: 0.91 },
                    { x: EDGE_OFFSET_UPPER, y: 0.91 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_1],
                route: "start",
                points: [
                    { x: EDGE_OFFSET_UPPER, y: 0.31 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_2],
                route: "start",
                points: [
                    { x: EDGE_OFFSET_UPPER, y: 0.61 },
                ],
            },
            {
                from: 'W',
                to: 'E',
                carId: [CAR_3],
                route: "start",
                points: [
                    { x: EDGE_OFFSET_UPPER, y: 0.91 },
                ],
            },
        ],
    },
    depot_corner: {
        lanes: [
            {
                from: 'W',
                to: 'N',
                carId: [CAR_4],
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.23 },
                    { x: 0.34, y: 0.23 },
                    { x: 0.45, y: 0.2 },
                    { x: 0.53, y: 0.14 },
                    { x: 0.6, y: 0.04 },
                ],
            },
            {
                from: 'W',
                to: 'N',
                carId: [CAR_5],
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.63 },
                    { x: 0.34, y: 0.63 },
                    { x: 0.49, y: 0.58 },
                    { x: 0.56, y: 0.5 },
                    { x: 0.61, y: 0.41 },
                    { x: 0.63, y: 0.3 },
                    { x: 0.63, y: EDGE_OFFSET_LOWER },
                ],
            },
        ],
    },
    depot_right: {
        lanes: [
            {
                from: 'W',
                to: 'N',
                carId: [CAR_1],
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.31 },
                    { x: 0.34, y: 0.31 },
                    { x: 0.46, y: 0.27 },
                    { x: 0.55, y: 0.19 },
                    { x: 0.63, y: 0.06 },
                ],
            },
            {
                from: 'W',
                to: 'N',
                carId: [CAR_2],
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.61 },
                    { x: 0.34, y: 0.61 },
                    { x: 0.48, y: 0.57 },
                    { x: 0.57, y: 0.49 },
                    { x: 0.63, y: 0.37 },
                    { x: 0.63, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'W',
                to: 'N',
                carId: [CAR_3],
                points: [
                    { x: EDGE_OFFSET_LOWER, y: 0.91 },
                    { x: 0.34, y: 0.91 },
                    { x: 0.48, y: 0.87 },
                    { x: 0.57, y: 0.79 },
                    { x: 0.63, y: 0.67 },
                    { x: 0.63, y: EDGE_OFFSET_LOWER },
                ],
            },
            {
                from: 'S',
                to: 'N',
                carId: [CAR_4, CAR_5],
                points: [
                    { x: 0.63, y: EDGE_OFFSET_UPPER },
                    { x: 0.63, y: EDGE_OFFSET_LOWER },
                ],
            },
        ],
    },
};

/**
 * Defines the sequence of depot tiles that each car must traverse when
 * starting (leaving) and ending (entering) a route.
 * This ensures cars follow the correct path through the depot.
 */
export const DEPOT_ROUTE_SEQUENCES = {
    1: {
        start: ['depot_middle', 'depot_right'],
        end: ['depot_down', 'depot_middle'],
    },
    2: {
        start: ['depot_middle', 'depot_right'],
        end: ['depot_down', 'depot_middle'],
    },
    3: {
        start: ['depot_middle', 'depot_right'],
        end: ['depot_down', 'depot_middle'],
    },
    4: {
        start: ['depot_down', 'depot_corner', 'depot_right'],
        end: ['depot_down'],
    },
    5: {
        start: ['depot_down', 'depot_corner', 'depot_right'],
        end: ['depot_down'],
    },
};