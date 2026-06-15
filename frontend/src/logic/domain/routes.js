import { DEPOT_ENTRANCE, DEPOT_EXIT } from "../../constants/constants";

/**
 * routes are pre-defined sequences of tiles
 *
 * rules:
 * - first tile is depot
 * - last tile is depot
 * - connecting tiles form the route
 * - for a connection to be valid it must be a direct neighbor (N,E,S,W) of the previous tile and have a lane connecting them
 */
export const ROUTES_TILES = {
    inactive: {
        label: 'inactive',
        tiles: []
    },
    short_1: {
        label: 'short_1',
        tiles: [
            DEPOT_EXIT,
            { x: 6, y: 3 },
            { x: 6, y: 2 },
            { x: 6, y: 1 },
            { x: 6, y: 0 },
            { x: 5, y: 0 },
            { x: 4, y: 0 },
            { x: 3, y: 0 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
            { x: 3, y: 3 },
            { x: 3, y: 4 },
            { x: 3, y: 5 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE
        ],
    },
    short_2: {
        label: 'short_2',
        tiles: [
            DEPOT_EXIT,
            { x: 6, y: 3 },
            { x: 6, y: 2 },
            { x: 6, y: 1 },
            { x: 5, y: 1 },
            { x: 4, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
            { x: 3, y: 3 },
            { x: 3, y: 4 },
            { x: 3, y: 5 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE
        ],
    },
    short_3: {
        label: 'short_3',
        tiles: [
            DEPOT_EXIT,
            { x: 6, y: 3 },
            { x: 6, y: 2 },
            { x: 5, y: 2 },
            { x: 4, y: 2 },
            { x: 4, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
            { x: 3, y: 3 },
            { x: 3, y: 4 },
            { x: 3, y: 5 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE
        ],
    },
    short_4: {
        label: 'short_4',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 5 },
            { x: 3, y: 5 },
            { x: 3, y: 4 },
            { x: 2, y: 4 },
            { x: 1, y: 4 },
            { x: 1, y: 5 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            DEPOT_ENTRANCE
        ],
    },
    short_5: {
        label: 'short_5',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 5 },
            { x: 3, y: 5 },
            { x: 2, y: 5 },
            { x: 1, y: 5 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            DEPOT_ENTRANCE
        ],
    },
    short_6: {
        label: 'short_6',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE,
            { x: 3, y: 6 },
            { x: 2, y: 6 },
            { x: 1, y: 6 },
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE
        ],
    },
    medium_1: {
        label: 'medium_1',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 5, y: 3 },
            { x: 4, y: 3 },
            { x: 3, y: 3 },
            { x: 3, y: 2 },
            { x: 2, y: 2 },
            { x: 1, y: 2 },
            { x: 1, y: 1 },
            { x: 1, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
            { x: 0, y: 3 },
            { x: 0, y: 4 },
            { x: 0, y: 5 },
            { x: 0, y: 6 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            DEPOT_ENTRANCE
        ],
    },
    medium_2: {
        label: 'medium_2',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 5 },
            { x: 3, y: 5 },
            { x: 2, y: 5 },
            { x: 1, y: 5 },
            { x: 1, y: 4 },
            { x: 2, y: 4 },
            { x: 2, y: 3 },
            { x: 1, y: 3 },
            { x: 1, y: 4 },
            { x: 0, y: 4 },
            { x: 0, y: 5 },
            { x: 0, y: 6 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            DEPOT_ENTRANCE
        ],
    },
    long_1: {
        label: 'long_1',
        tiles: [
            DEPOT_EXIT,
            { x: 5, y: 4 },
            { x: 4, y: 4 },
            { x: 4, y: 5 },
            DEPOT_ENTRANCE,
            { x: 3, y: 6 },
            { x: 2, y: 6 },
            { x: 1, y: 6 },
            { x: 0, y: 6 },
            { x: 0, y: 5 },
            { x: 0, y: 4 },
            { x: 1, y: 4 },
            { x: 1, y: 5 },
            { x: 2, y: 5 },
            { x: 3, y: 5 },
            { x: 3, y: 4 },
            { x: 2, y: 4 },
            { x: 1, y: 4 },
            { x: 0, y: 4 },
            { x: 0, y: 5 },
            { x: 0, y: 6 },
            { x: 1, y: 6 },
            { x: 2, y: 6 },
            { x: 3, y: 6 },
            DEPOT_ENTRANCE
        ],
    },
};

export const ROUTE_OPTIONS = Object.keys(ROUTES_TILES).map((routeName) => ({
    value: routeName,
    label: ROUTES_TILES[routeName].label,
}));
