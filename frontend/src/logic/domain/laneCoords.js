/*
    Definieert de lane structuur voor de map componenten.
    Elke tile type heeft zijn eigen lane configuratie.
    De coördinaten zijn genormaliseerd tussen 0 en 1.
    IMPORTANT:
    Deze coordinaten zijn gebaseerd op hoe de tile standaard als png in assets zit.
    Als de plaatjes worden veranderd en de ligging ligt anders, moet dit hier bijgwerkt worden.
*/
const TOP = 0.45;
const BOTTOM = 0.55;

export const TILE_LANES = {
  straight: {
    lanes: [
      {
        from: 'W',
        to: 'E',
        points: [
          { x: 0.0, y: TOP },
          { x: 1.0, y: TOP },
        ],
      },
      {
        from: 'E',
        to: 'W',
        points: [
          { x: 1.0, y: BOTTOM },
          { x: 0.0, y: BOTTOM },
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
}