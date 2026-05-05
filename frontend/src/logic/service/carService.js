import { getWaypointRouteByName } from "./routeService";

/**
 * Returns enriched car settings including the built waypoint route.
 *
 * @param {Array<Object>} cars - Array of car objects, each with id, maxPackages, route, and routeVisibility properties.
 * @returns {Array<Object>} An array of car objects, each enriched with a waypoints property containing the built route.
 */
export function buildCarsWithRoutes(cars) {
  return cars.map((car) => ({
    id: car.id,
    maxPackages: car.maxPackages,
    route: car.route,
    routeVisibility: car.routeVisibility,
    waypoints: getWaypointRouteByName(car.route),
  }));
}
