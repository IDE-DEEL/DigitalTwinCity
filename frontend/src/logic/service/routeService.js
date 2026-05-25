import { ROUTES_TILES } from '../domain/routes.js';
import { buildWaypointRouteFromTilePath } from './routeBuilder.js';

/**
 * Retrieves a route by name and converts it to a list of waypoints.
 *
 * @param {string} routeName - The name of the route to retrieve.
 * @returns {Array<Object>} An array of waypoint objects, each with x and y properties, representing the route.
 * @throws {Error} If the route name is unknown.
 */
export function getWaypointRouteByName(routeName) {
  const route = ROUTES_TILES[routeName];

  if (!route) {
    throw new Error(`Unknown route "${routeName}".`);
  }

  return buildWaypointRouteFromTilePath(route.tiles);
}
