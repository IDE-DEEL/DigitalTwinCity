import { HOUSE_POSITION_FIRST } from "../../constants/constants"

export const TILE_HOUSES = {
    straight: {
        houses: {
            [HOUSE_POSITION_FIRST]: {
                supportedLanes: [
                    { from: 'E', to: 'W' },
                ],
                labelCoords: { x: 0.27, y: 0.1 },
                roadCoords: [
                    { x: 0.11, y: 0.45 },
                    { x: 0.45, y: 0.45 },
                    { x: 0.45, y: 0.28 },
                    { x: 0.11, y: 0.28 },
                ],
            },
        }
    },
    curve: {
        houses: {
            [HOUSE_POSITION_FIRST]: {
                supportedLanes: [
                    { from: 'S', to: 'W' },
                ],
                labelCoords: { x: 0.7, y: 0.29 },
                roadCoords: [
                    { x: 0.5, y: 0.7 },
                    { x: 0.64, y: 0.61 },
                    { x: 0.53, y: 0.46 },
                    { x: 0.4, y: 0.36 },
                    { x: 0.33, y: 0.51 },
                ],
            },
        }
    },
    t_split: {
        houses: {
            [HOUSE_POSITION_FIRST]: {
                supportedLanes: [
                    { from: 'W', to: 'E' },
                    { from: 'W', to: 'N' },
                ],
                labelCoords: { x: 0.3, y: 0.88 },
                roadCoords: [
                    { x: 0.02, y: 0.74 },
                    { x: 0.33, y: 0.74 },
                    { x: 0.33, y: 0.54 },
                    { x: 0.02, y: 0.54 },
                ],
            },
        }
    },
    cross_split: {
        houses: []
    },
    roundabout: {
        houses: []
    },
    depot: {
        houses: {
            [HOUSE_POSITION_FIRST]: {
                supportedLanes: [
                    { from: 'S', to: 'E' },
                    { from: 'N', to: 'E' },
                ],
                labelCoords: { x: 0.94, y: 0.49 },
                roadCoords: [
                    { x: 0.7, y: 0.69 },
                    { x: 0.95, y: 0.69 },
                    { x: 0.95, y: 0.28 },
                    { x: 0.7, y: 0.28 },
                ],
            },
        }
    }
}