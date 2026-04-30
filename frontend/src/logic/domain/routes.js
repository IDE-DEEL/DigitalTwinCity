import { DEPOT_TILE } from "../../constants/constants";

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
    routeA: {
        label: "Route A",
        tiles: [
            DEPOT_TILE,
            { x: 4, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
            { x: 2, y: 2 },
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 4, y: 3 },
            DEPOT_TILE,
        ],
    },
    routeB: {
        label: "Route B",
        tiles: [
            DEPOT_TILE,
            { x: 4, y: 1 },
            { x: 4, y: 0 },
            { x: 3, y: 0 },
            { x: 2, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: 2 },
            { x: 0, y: 3 },
            { x: 1, y: 3 },
            { x: 2, y: 3 },
            { x: 3, y: 3 },
            { x: 4, y: 3 },
            DEPOT_TILE,
        ],
    },
    routeC: {
        label: "Route C",
        tiles: [
            DEPOT_TILE,
            { x: 4, y: 1 },
            { x: 4, y: 0 },
            { x: 3, y: 0 },
            { x: 2, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 0 },
            { x: 0, y: 1 },
            { x: 1, y: 1 },
            { x: 1, y: 2 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 3, y: 3 },
            { x: 2, y: 3 },
            { x: 2, y: 2 },
            { x: 3, y: 2 },
            { x: 3, y: 1 },
            { x: 4, y: 1 },
            DEPOT_TILE,
        ],
    },
};

export const ROUTE_OPTIONS = Object.keys(ROUTES_TILES).map((routeName) => ({
    value: routeName,
    label: ROUTES_TILES[routeName].label,
}));
