export const TILE_HOUSES = {
    straight: {
        houses: [
            {
                id: 'house-blue',
                supportedLanes: [
                    { from: 'E', to: 'W' },
                ],
                labelCoords: { x: 0.27, y: 0.1 },
                roadCoords: { x: 0.37, y: 0.35 },
            }
        ]
    },
    curve: {
        houses: [
            {
                id: 'house-pool',
                supportedLanes: [
                    { from: 'S', to: 'W' },
                ],
                labelCoords: { x: 0.7, y: 0.29 },
                roadCoords: { x: 0.48, y: 0.53 },
            }
        ]
    },
    t_split: {
        houses: [
            {
                id: 'house-green',
                supportedLanes: [
                    { from: 'W', to: 'E' },
                ],
                labelCoords: { x: 0.3, y: 0.88 },
                roadCoords: { x: 0.09, y: 0.64 },
            }
        ]
    },
    cross_split: {
        houses: []
    },
    roundabout: {
        houses: []
    },
    depot: {
        houses: [
            {
                id: 'depot',
                supportedLanes: [
                    { from: 'S', to: 'E' },
                    { from: 'N', to: 'E' },
                ],
                labelCoords: { x: 0.94, y: 0.49 },
                roadCoords: { x: 0.87, y: 0.62 },
            }
        ]
    }
}