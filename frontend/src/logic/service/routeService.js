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

/**
 * Returns enriched car settings including the built waypoint route.
 *
 * @param {Array<Object>} cars - Array of car objects, each with id, packageCount, route, and routeVisibility properties.
 * @param {Array<Object>} mapData - Array of all map tile objects, each with x and y properties.
 * @returns {Array<Object>} An array of car objects, each enriched with a waypoints property containing the built route.
 */
export function buildCarsWithRoutes(cars, mapData) {
  return cars.map((car) => ({
    id: car.id,
    packageCount: car.packageCount,
    route: car.route,
    routeVisibility: car.routeVisibility,
    waypoints: getWaypointRouteByName(car.route, mapData),
  }));
}