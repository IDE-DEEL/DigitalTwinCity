import { ROUTES_TILES } from "../domain/routes";
import { buildLaneSequenceFromTilePath } from "./routeBuilder";
import { normalizeDegree, rotateCardinalDirection } from "../utils/rotation";

/**
 * Determines which routes pass through the tile where a house is located.
 * A house is matched to a route if the house's tile is part of the route's tile path and
 * the house's supported lanes align with the route's lanes.
*
 * @param {Object} house - A house object with tileX and tileY properties.
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @returns {Array<string>} An array of route names that pass through the house's tile.
 */
export function findRoutesForHouse(house, mapData) {
    const matchingRoutes = [];

    const rotatedSupportedLanes = getRotatedSupportedLanes(house, mapData);

    for (const [routeName, tilePath] of Object.entries(ROUTES_TILES)) {
        const laneSequence = buildLaneSequenceFromTilePath(tilePath, mapData);

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
 * Rotates the supported lanes of a house based on the rotation of its tile.
 * 
 * @param {Object} house - A house object with tileX and tileY properties.
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @returns {Array<Object>} An array of rotated lane objects.
 */
function getRotatedSupportedLanes(house, mapData) {
    if (!house.supportedLanes) {
        throw new Error(
            `House ${house.houseInstanceId} missing supportedLanes`
        );
    }

    const tile = mapData.find(t => t.x === house.tileX && t.y === house.tileY);
    const rotation = normalizeDegree(tile.rotation || 0);

    return house.supportedLanes.map(lane => ({
        from: rotateCardinalDirection(lane.from, rotation),
        to: rotateCardinalDirection(lane.to, rotation),
    }));
}