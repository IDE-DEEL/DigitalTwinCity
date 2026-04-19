import { ROUTES_TILES } from '../domain/routes.js';
import { buildWaypointRouteFromTilePath } from './routeBuilder.js';

/**
 * Retrieves a route by name and converts it to a list of waypoints.
 *
 * @param {string} routeName - The name of the route to retrieve.
 * @param {Array<Object>} mapData - Array of all map tile objects, each with x and y properties.
 * @returns {Array<Object>} An array of waypoint objects, each with x and y properties, representing the route.
 * @throws {Error} If the route name is unknown.
 */
export function getWaypointRouteByName(routeName, mapData) {
  const tilePath = ROUTES_TILES[routeName];

  if (!tilePath) {
    throw new Error(`Unknown route "${routeName}".`);
  }

  return buildWaypointRouteFromTilePath(tilePath, mapData);
}