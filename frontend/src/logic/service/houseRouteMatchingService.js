import { ROUTES_TILES } from "../domain/routes";
import { buildLaneSequenceFromTilePath } from "./routeBuilder";
import { useMapStore } from "../../stores/mapStore";
import { normalizeDegree } from "../utils/rotation";

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

    const rotatedSupportedLanes = getRotatedSupportedLanes(house);

    for (const [routeName, route] of Object.entries(ROUTES_TILES)) {
        const laneSequence = buildLaneSequenceFromTilePath(route.tiles);

        const hasMatchingLane = laneSequence.some(lane => {
            const sameTile =
                lane.tileX === house.tileX &&
                lane.tileY === house.tileY;
                
            if (!sameTile) return false;

            return rotatedSupportedLanes.some(supported =>
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
    if (!route) {
        return [];
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

            const rotatedSupportedLanes = getRotatedSupportedLanes(house);
            return rotatedSupportedLanes.some(supported =>
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

/**
 * Rotates the supported lanes of a house based on the rotation of its tile.
 * 
 * @param {Object} house - A house object with tileX and tileY properties.
 * @returns {Array<Object>} An array of rotated lane objects.
 */
function getRotatedSupportedLanes(house) {
    if (!house.supportedLanes) {
        throw new Error(
            `House ${house.houseInstanceId} missing supportedLanes`
        );
    }

    const mapStore = useMapStore();

    const tile = mapStore.mapData.find(t => t.x === house.tileX && t.y === house.tileY);
    normalizeDegree(tile.rotation || 0);

    return house.supportedLanes;

    // TODO:
    // find out why this return works but:
    // using house.supportedLanes in main function doesn't and
    // this also doesnt work:
    /**
     * return house.supportedLanes.map(lane => ({
        from: rotateCardinalDirection(lane.from, rotation),
        to: rotateCardinalDirection(lane.to, rotation),
    }));
     */
}