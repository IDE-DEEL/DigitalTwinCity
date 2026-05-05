import { getWaypointRouteByName } from "./routeService";

/**
 * Returns enriched car settings including the built waypoint route.
 *
 * @param {Array<Object>} cars - Array of car objects, each with id, maxPackages, route, and routeVisibility properties.
 * @returns {Array<Object>} An array of car objects, each enriched with a routeWaypoints property containing the built route.
 */
export function buildCarsWithRoutes(cars) {
  return cars.map((car) => ({
    ...car,
    routeWaypoints: getWaypointRouteByName(car.routeName),
  }));
}
