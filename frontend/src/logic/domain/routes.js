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
    route_a: {
        label: 'Route A',
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
};

export const ROUTE_OPTIONS = Object.keys(ROUTES_TILES).map((routeName) => ({
    value: routeName,
    label: ROUTES_TILES[routeName].label,
}));
