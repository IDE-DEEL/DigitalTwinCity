import { ROUTES_TILES } from "../domain/routes";
import { buildLaneSequenceFromTilePath } from "./routeBuilder";

/**
 * Determines which routes pass through the tile where a house is located.
 * A house is matched to a route if the house's tile is part of the route's tile path and
 * the house's supported lanes align with the route's lanes.
*
 * @param {Object} house - A house object with tileX and tileY properties.
 * @returns {Array<string>} An array of route names that pass through the house's tile.
 */
export function findRoutesForHouse(house) {
    const matchingRoutes = [];

    for (const [routeName, route] of Object.entries(ROUTES_TILES)) {
        if (routeName === "inactive") {
            continue; // Skip inactive routes (e.g., 'inactive' route)
        }

        const laneSequence = buildLaneSequenceFromTilePath(route.tiles);

        const hasMatchingLane = laneSequence.some(lane => {
            const sameTile =
                lane.tileX === house.tileX &&
                lane.tileY === house.tileY;
                
            if (!sameTile) return false;

            return house.supportedLanes.some(supported =>
                supported.from === lane.from &&
                supported.to === lane.to
            );
        });

        if (hasMatchingLane) {
            matchingRoutes.push(routeName);
        }
    }

    return matchingRoutes;
}

/**
 * Finds all houses that a route passes through, in the order they appear on the route.
 * The route's tile path determines the order of houses.
 * 
 * @param {string} routeName - The name of the route to find houses for.
 * @param {Array<Object>} allHouses - Array of all house objects available.
 * @returns {Array<Object>} An array of house objects that lie on the route, in route order.
 */
export function findHousesForRoute(routeName, allHouses) {
    const route = ROUTES_TILES[routeName];
    if (!route || routeName === "inactive") {
        return []; // No houses for unknown or inactive routes (e.g., 'inactive' route)
    }

    const laneSequence = buildLaneSequenceFromTilePath(route.tiles);
    const housesOnRoute = [];

    // For each tile in the route, find all houses on that tile
    // This preserves the route's tile order
    for (const lane of laneSequence) {
        // Find all houses on this tile that match this lane
        const housesOnTile = allHouses.filter(house => {
            const onSameTile = house.tileX === lane.tileX && house.tileY === lane.tileY;
            if (!onSameTile) return false;

            return house.supportedLanes.some(supported =>
                supported.from === lane.from &&
                supported.to === lane.to
            );
        });

        // Add houses to result (avoiding duplicates)
        for (const house of housesOnTile) {
            if (!housesOnRoute.find(h => h.houseInstanceId === house.houseInstanceId)) {
                housesOnRoute.push(house.houseInstanceId);
            }
        }
    }

    return housesOnRoute;
}
