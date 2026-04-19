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
    N: { x: 0.5, y: 0.2 },
    NW: { x: 0.29, y: 0.29 },
    W: { x: 0.2, y: 0.5 },
    SW: { x: 0.29, y: 0.71 },
    S: { x: 0.5, y: 0.8 },
    SE: { x: 0.71, y: 0.71 },
    E: { x: 0.8, y: 0.5 },
    NE: { x: 0.71, y: 0.29 },
}

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
//   replaced loop with similar entry/exit logic as other tiles -- TODO: remove later if not needed
//   roundabout: {
//     lanes: [
//       // Loop
//       {
//         from: 'LOOP',
//         to: 'LOOP',
//         isLoop: true,
//         points: [
//           { x: 0.2, y: 0.5 },
//           { x: 0.29, y: 0.29 },
//           { x: 0.5, y: 0.2 },
//           { x: 0.71, y: 0.29 },
//           { x: 0.8, y: 0.5 },
//           { x: 0.71, y: 0.71 },
//           { x: 0.5, y: 0.8 },
//           { x: 0.29, y: 0.71 },
//           { x: 0.2, y: 0.5 }, 
//         ],
//       },
//       // Entries
//       {
//         from: 'N',
//         to: 'LOOP',
//         points: [
//           { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
//           { x: 0.35, y: 0.21 },
//         ]
//       },
//       {
//         from: 'W',
//         to: 'LOOP',
//         points: [
//           { x: EDGE_OFFSET_LOWER,  y: EASTBOUND_Y_LANE_CENTER }, 
//           { x: 0.22, y: 0.65 },
//         ],
//       },
//       {
//         from: 'S',
//         to: 'LOOP',
//         points: [
//           { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },   
//           { x: 0.66, y: 0.78 },
//         ],
//       },
//       {
//         from: 'E',
//         to: 'LOOP',
//         points: [
//           { x: EDGE_OFFSET_UPPER,  y: WESTBOUND_Y_LANE_CENTER },  
//           { x: 0.79, y: 0.33 },
//         ],
//       },
//       // Exits
//       {
//         from: 'LOOP',
//         to: 'N',
//         points: [
//           { x: 0.65, y: 0.21 }, 
//           { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },   
//         ],
//       },
//       {
//         from: 'LOOP',
//         to: 'W',
//         points: [
//           { x: 0.21, y: 0.35 },
//           { x: EDGE_OFFSET_LOWER,  y: WESTBOUND_Y_LANE_CENTER },  
//         ],
//       },
//       {
//         from: 'LOOP',
//         to: 'S',
//         points: [
//           { x: 0.35, y: 0.79 },
//           { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
//         ],
//       },
//       {
//         from: 'LOOP',
//         to: 'E',
//         points: [
//           { x: 0.79, y: 0.65 },
//           { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
//         ],
//       },
//     ],
//   },
  roundabout: {
    lanes: [
      {
        from: 'N',
        to: 'W',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          ROUNDABOUT_POINTS.NW,
          { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'N',
        to: 'S',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ]
      },
      {
        from: 'N',
        to: 'E',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'N',
        to: 'N',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ]
      },
      {
        from: 'W',
        to: 'S',
        points: [
          { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.SW,
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ]
      },
      {
        from: 'W',
        to: 'E',
        points: [
          { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'W',
        to: 'N',
        points: [
          { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ]
      },
      {
        from: 'W',
        to: 'W',
        points: [
          { x: EDGE_OFFSET_LOWER, y: EASTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'S',
        to: 'E',
        points: [
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          ROUNDABOUT_POINTS.SE,
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'S',
        to: 'N',
        points: [
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ]
      },
      {
        from: 'S',
        to: 'W',
        points: [
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'S',
        to: 'S',
        points: [
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          ROUNDABOUT_POINTS.SE,
          ROUNDABOUT_POINTS.E,
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ]
      },
      {
        from: 'E',
        to: 'N',
        points: [
          { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.NE,
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ]
      },
      {
        from: 'E',
        to: 'W',
        points: [
          { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          { x: EDGE_OFFSET_LOWER, y: WESTBOUND_Y_LANE_CENTER },
        ]
      },
      {
        from: 'E',
        to: 'S',
        points: [
          { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ]
      },
      {
        from: 'E',
        to: 'E',
        points: [
          { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
          ROUNDABOUT_POINTS.NE,
          ROUNDABOUT_POINTS.N,
          ROUNDABOUT_POINTS.NW,
          ROUNDABOUT_POINTS.W,
          ROUNDABOUT_POINTS.SW,
          ROUNDABOUT_POINTS.S,
          ROUNDABOUT_POINTS.SE,
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ]
      },
    ],
  },
  depot: {
    lanes: [
      {
        from: 'N',
        to: 'S',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ],
      },
      {
        from: 'S',
        to: 'N',
        points: [
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ],
      },
      {
        from: 'N',
        to: 'E',
        points: [
          { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          { x: 0.38, y: 0.28 },
          { x: 0.44, y: 0.4 },
          { x: 0.52, y: 0.5 },
          { x: 0.63, y: 0.58 },
          { x: 0.75, y: 0.62 },
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ],
      },
      {
        from: 'S',
        to: 'E',
        points: [
            { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
            { x: 0.63, y: 0.76 },
            { x: 0.7, y: 0.67 },
            { x: 0.79, y: 0.63 },
            { x: EDGE_OFFSET_UPPER, y: EASTBOUND_Y_LANE_CENTER },
        ],
      },
      {
        from: 'E',
        to: 'N',
        points: [
            { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
            { x: 0.76, y: 0.36 },
            { x: 0.67, y: 0.29 },
            { x: 0.63, y: 0.2 },
            { x: NORTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ],
      },
      {
        from: 'E',
        to: 'S',
        points: [
            { x: EDGE_OFFSET_UPPER, y: WESTBOUND_Y_LANE_CENTER },
            { x: 0.75, y: 0.36 },
            { x: 0.65, y: 0.39 },
            { x: 0.55, y: 0.45 },
            { x: 0.44, y: 0.56 },
            { x: 0.38, y: 0.7 },
            { x: SOUTHBOUND_X_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ],
      }
    ],
  }
}