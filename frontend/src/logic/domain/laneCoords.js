/*
    Definieert de lane structuur voor de map componenten.
    Elke tile type heeft zijn eigen lane configuratie.
    De coördinaten zijn genormaliseerd tussen 0 en 1.
    IMPORTANT:
    Deze coordinaten zijn gebaseerd op hoe de tile standaard als png in assets zit.
    Als de plaatjes worden veranderd en de ligging ligt anders, moet dit hier bijgwerkt worden.
*/

const NORTHBOUND_LANE_CENTER = 0.625;
const SOUTHBOUND_LANE_CENTER = 0.375;
const WESTBOUND_LANE_CENTER = 0.375;
const EASTBOUND_LANE_CENTER = 0.625;
const EDGE_OFFSET_LOWER = 0.1;
const EDGE_OFFSET_UPPER = 0.9;

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
          { x: EDGE_OFFSET_LOWER, y: EASTBOUND_LANE_CENTER },
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_LANE_CENTER },
        ],
      },
      {
        from: 'E',
        to: 'W',
        points: [
          { x: EDGE_OFFSET_UPPER, y: WESTBOUND_LANE_CENTER },
          { x: EDGE_OFFSET_LOWER, y: WESTBOUND_LANE_CENTER },
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
          { x: 0.45, y: 1.0 },
          { x: 0.65, y: 0.85 },
          { x: 0.15, y: 0.45 },
          { x: 0.0, y: 0.45 },
        ],
      },

      {
        from: 'E',
        to: 'S',
        points: [
          { x: 0.0, y: 0.55 }, 
          { x: 0.15, y: 0.55 },
          { x: 0.45, y: 0.85 },
          { x: 0.55, y: 1.0 },
        ],
      },
    ],
  },


  t_split: {
    lanes: [

      {
        from: 'N',
        to: 'E',
        points: [
          { x: 0.5, y: 0.0 },
          { x: 0.5, y: 0.35 },
          { x: 0.85, y: 0.5 },
          { x: 1.0, y: 0.5 },
        ],
      },

      {
        from: 'N',
        to: 'W',
        points: [
          { x: 0.5, y: 0.0 },
          { x: 0.5, y: 0.35 },
          { x: 0.15, y: 0.5 },
          { x: 0.0, y: 0.5 },
        ],
      },

      {
        from: 'E',
        to: 'W',
        points: [
          { x: 1.0, y: 0.55 },
          { x: 0.0, y: 0.55 },
        ],
      },

      {
        from: 'W',
        to: 'E',
        points: [
          { x: 0.0, y: 0.45 },
          { x: 1.0, y: 0.45 },
        ],
      },
    ],
  },

  cross_split: {
    lanes: [
    
      {
        from: 'N',
        to: 'S',
        points: [
          { x: 0.5, y: 0.0 },
          { x: 0.5, y: 1.0 },
        ],
      },
    
      {
        from: 'S',
        to: 'N',
        points: [
          { x: 0.55, y: 1.0 },
          { x: 0.55, y: 0.0 },
        ],
      },
    
      {
        from: 'E',
        to: 'W',
        points: [
          { x: 1.0, y: 0.45 },
          { x: 0.0, y: 0.45 },
        ],
      },

      {
        from: 'W',
        to: 'E',
        points: [
          { x: 0.0, y: 0.55 },
          { x: 1.0, y: 0.55 },
        ],
      },

      {
        from: 'N',
        to: 'E',
        points: [
          { x: 0.45, y: 0.0 },
          { x: 0.45, y: 0.35 },
          { x: 0.8,  y: 0.45 },
          { x: 1.0,  y: 0.5 },
        ],
      },
      {
        from: 'N',
        to: 'W',
        points: [
          { x: 0.55, y: 0.0 },
          { x: 0.55, y: 0.35 },
          { x: 0.2,  y: 0.45 },
          { x: 0.0,  y: 0.5 },
        ],
      },
    ],
  },
  roundabout: {
    lanes: [
      // Loop
      {
        from: 'LOOP',
        to: 'LOOP',
        isLoop: true,
        points: [
          { x: 0.3,  y: 0.5 },
          { x: 0.35, y: 0.35 },
          { x: 0.5,  y: 0.3 },
          { x: 0.65, y: 0.35 },
          { x: 0.7,  y: 0.5 },
          { x: 0.65, y: 0.65 },
          { x: 0.5,  y: 0.7 },
          { x: 0.35, y: 0.65 },
          { x: 0.3,  y: 0.5 }, 
        ],
      },
      // Entries
      {
        from: 'N',
        to: 'LOOP',
        points: [
          { x: 0.55, y: 0.0 },
          { x: 0.55, y: 0.2 },
          { x: 0.52,  y: 0.28 },
          { x: 0.5,  y: 0.3 },
        ]
      },
      {
        from: 'E',
        to: 'LOOP',
        points: [
          { x: 1.0,  y: 0.55 }, 
          { x: 0.8,  y: 0.55 },  
          { x: 0.72, y: 0.52 }, 
          { x: 0.7,  y: 0.5 },   
        ],
      },
      {
        from: 'S',
        to: 'LOOP',
        points: [
          { x: 0.45, y: 1.0 },   
          { x: 0.45, y: 0.8 },   
          { x: 0.48, y: 0.72 },  
          { x: 0.5,  y: 0.7 },  
        ],
      },
      {
        from: 'W',
        to: 'LOOP',
        points: [
          { x: 0.0,  y: 0.45 },  
          { x: 0.2,  y: 0.45 }, 
          { x: 0.28, y: 0.48 },  
          { x: 0.3,  y: 0.5 },   
        ],
      },

      // Exits

      {
        from: 'LOOP',
        to: 'N',
        points: [
          { x: 0.5,  y: 0.3 },   
          { x: 0.48, y: 0.22 },  
          { x: 0.45, y: 0.15 },  
          { x: 0.45, y: 0.0 },   
        ],
      },
      {
        from: 'LOOP',
        to: 'E',
        points: [
          { x: 0.7,  y: 0.5 },  
          { x: 0.78, y: 0.48 },  
          { x: 0.85, y: 0.45 }, 
          { x: 1.0,  y: 0.45 },  
        ],
      },
      {
        from: 'LOOP',
        to: 'S',
        points: [
          { x: 0.5,  y: 0.7 },   
          { x: 0.52, y: 0.78 },  
          { x: 0.55, y: 0.85 },  
          { x: 0.55, y: 1.0 },   
        ],
      },
      {
        from: 'LOOP',
        to: 'W',
        points: [
          { x: 0.3,  y: 0.5 },   
          { x: 0.22, y: 0.52 },  
          { x: 0.15, y: 0.55 },  
          { x: 0.0,  y: 0.55 },  
        ],
      },
    ],
  },
  depot: {
    lanes: [
      {
        from: 'N',
        to: 'S',
        points: [
          { x: SOUTHBOUND_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          { x: SOUTHBOUND_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ],
      },
      {
        from: 'S',
        to: 'N',
        points: [
          { x: NORTHBOUND_LANE_CENTER, y: EDGE_OFFSET_UPPER },
          { x: NORTHBOUND_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ],
      },
      {
        from: 'N',
        to: 'E',
        points: [
          { x: SOUTHBOUND_LANE_CENTER, y: EDGE_OFFSET_LOWER },
          { x: 0.38, y: 0.28 },
          { x: 0.44, y: 0.4 },
          { x: 0.52, y: 0.5 },
          { x: 0.63, y: 0.58 },
          { x: 0.75, y: 0.62 },
          { x: EDGE_OFFSET_UPPER, y: EASTBOUND_LANE_CENTER },
        ],
      },
      {
        from: 'S',
        to: 'E',
        points: [
            { x: NORTHBOUND_LANE_CENTER, y: EDGE_OFFSET_UPPER },
            { x: 0.63, y: 0.76 },
            { x: 0.7, y: 0.67 },
            { x: 0.79, y: 0.63 },
            { x: EDGE_OFFSET_UPPER, y: EASTBOUND_LANE_CENTER },
        ],
      },
      {
        from: 'E',
        to: 'N',
        points: [
            { x: EDGE_OFFSET_UPPER, y: WESTBOUND_LANE_CENTER },
            { x: 0.76, y: 0.36 },
            { x: 0.67, y: 0.29 },
            { x: 0.63, y: 0.2 },
            { x: NORTHBOUND_LANE_CENTER, y: EDGE_OFFSET_LOWER },
        ],
      },
      {
        from: 'E',
        to: 'S',
        points: [
            { x: EDGE_OFFSET_UPPER, y: WESTBOUND_LANE_CENTER },
            { x: 0.75, y: 0.36 },
            { x: 0.65, y: 0.39 },
            { x: 0.55, y: 0.45 },
            { x: 0.44, y: 0.56 },
            { x: 0.38, y: 0.7 },
            { x: SOUTHBOUND_LANE_CENTER, y: EDGE_OFFSET_UPPER },
        ],
      }
    ],
  }
}