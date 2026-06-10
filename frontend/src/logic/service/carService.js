import { getWaypointRouteByName } from "./routeService";
import { TILE_LANES, DEPOT_ROUTE_SEQUENCES } from "../domain/laneCoords";
import { buildWaypointsFromLaneSequence } from "./routeBuilder";
import { useMapStore } from "../../stores/mapStore.js";
import { convertWaypointFromLocalToGlobal } from "../utils/coordinateConverter.js";

/**
 * Returns enriched car settings including the built waypoint route.
 *
 * @param {Array<Object>} cars - Array of car objects, each with id, maxPackages, route, and routeVisibility properties.
 * @returns {Array<Object>} An array of car objects, each enriched with a routeWaypoints property containing the built route.
 */
export function addWaypointsToCarRoute(cars) {
  return cars.map((car) => ({
    ...car,
    routeWaypoints: injectDepotLanesForCar(getWaypointRouteByName(car.routeName), car.id),
  }));
}

/**
 * Injects depot lane waypoints at the beginning and end of a route based on car ID.
 *
 * @param {Array<Object>} baseWaypoints - The base waypoints from the route tiles.
 * @param {number} carId - The car ID (1-5).
 * @returns {Array<Object>} The complete waypoints including depot entry and exit.
 */
function injectDepotLanesForCar(baseWaypoints, carId) {
  const sequence = DEPOT_ROUTE_SEQUENCES[carId];
  const mapStore = useMapStore();

  if (!sequence) {
    console.warn(`No depot route sequence defined for carId ${carId}, returning base waypoints`);
    return baseWaypoints;
  }

  // Collect start depot lanes
  const startLanes = [];
  for (const depotTileName of sequence.start) {
    const lanes = getDepotLanesForCarAndRoute(depotTileName, carId, 'start');

    const tile = mapStore.mapData.find(
        tile => tile.type === depotTileName
    );

    const globalLanes = lanes.map(lane =>
    convertLaneToGlobal(
        lane,
        tile.x,
        tile.y
    )
    );

    startLanes.push(...globalLanes);
  }

  // Collect end depot lanes
  const endLanes = [];
  for (const depotTileName of sequence.end) {
    const lanes = getDepotLanesForCarAndRoute(depotTileName, carId, 'end');

    const tile = mapStore.mapData.find(
        tile => tile.type === depotTileName
    );

    const globalLanes = lanes.map(lane =>
    convertLaneToGlobal(
        lane,
        tile.x,
        tile.y
    )
    );

    endLanes.push(...globalLanes);
  }

  // Convert lanes to waypoints
  const startWaypoints = buildWaypointsFromLaneSequence(startLanes);
  const endWaypoints = buildWaypointsFromLaneSequence(endLanes);

  return [...startWaypoints, ...baseWaypoints, ...endWaypoints];
}

/**
 * Retrieves depot lanes for a specific car and route type (start or end).
 *
 * @param {string} depotTileName - Name of the depot tile (e.g., 'depot_middle', 'depot_right').
 * @param {number} carId - The car ID (1-5).
 * @param {string} routeType - Either 'start' or 'end'.
 * @returns {Array<Object>} Array of lane objects matching the criteria.
 */
function getDepotLanesForCarAndRoute(depotTileName, carId, routeType) {
  const tileDefinition = TILE_LANES[depotTileName];

  if (!tileDefinition) {
    throw new Error(`Depot tile "${depotTileName}" not found in TILE_LANES.`);
  }

  return tileDefinition.lanes.filter((lane) => {
    const hasCarId = lane.carId && lane.carId.includes(carId);
    const matchesRoute = !lane.route || lane.route === routeType;

    return hasCarId && matchesRoute;
  });
}

function convertLaneToGlobal(lane, tileX, tileY) {
    return {
        ...lane,
        points: lane.points.map(point =>
            convertWaypointFromLocalToGlobal(
                point,
                tileX,
                tileY
            )
        ),
    };
}
