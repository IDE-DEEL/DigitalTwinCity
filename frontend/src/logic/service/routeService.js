import { ROUTES_TILES } from '../domain/routes.js';
import { buildWaypointRouteFromTilePath } from './routeBuilder.js';

/**
 * Retrieves a route by name and converts it to a list of waypoints.
 *
 * @param {string} routeName - The name of the route to retrieve.
 * @returns {Array<Object>} An array of waypoint objects, each with x and y properties, representing the full route.
 * @throws {Error} If the route name is unknown.
 */
export function getWaypointRouteByName(routeName) {
    const route = ROUTES_TILES[routeName];

    if (!route) {
        throw new Error(`Unknown route "${routeName}".`);
    }
    // if (routeName === "inactive") {
    //     return []; // Skip inactive route as the car won't be driving
    // }

    const allowIncompleteRoute = false;
    return buildWaypointRouteFromTilePath(route.tiles, allowIncompleteRoute);
}

/**
 * Build waypoint preview for use in the route builder.
 * Excludes the final tile because its outgoing lane is not known yet.
 * 
 * @param {Array<Object>} tilePath - Array of tile objects representing the route, each with x and y properties.
 * @returns {Array<Object>} An array of waypoint objects, each with x and y properties, representing the route preview.
 */
export function getWaypointPreviewFromTilePath(tilePath) {
    const allowIncompleteRoute = true;
    return buildWaypointRouteFromTilePath(tilePath, allowIncompleteRoute);
}
