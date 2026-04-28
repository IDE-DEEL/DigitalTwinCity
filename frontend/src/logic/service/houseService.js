import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { ROUTES_TILES } from "../domain/routes.js";
import { getTileMetadata, getRotatedHouseCoordinatesForTile } from "./houseBuilder.js";
import { buildLaneSequenceFromTilePath } from "./routeBuilder";
import { normalizeDegree, rotateCardinalDirection } from "../utils/rotation.js";

/**
 * Builds necessary house data for the simulation payload and package overlay based on the selected scenario and map data.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @returns {Array<Object>} An array of house objects with coordinates and package counts for the simulation.
 */
export function getHousesByScenarioKey(scenarioKey, mapData) {
    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, packageCount]) => {
        const instance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);
        const tileMetadata = getTileMetadata(mapData, instance.tileX, instance.tileY);
        
        const coordinates = getRotatedHouseCoordinatesForTile(
            tileMetadata.type,
            tileMetadata.rotation,
            instance.tileX,
            instance.tileY
        );

        return {
            houseInstanceId,
            tileX: instance.tileX,
            tileY: instance.tileY,
            packageCount,
            roadCoords: coordinates.roadCoords,
            labelCoords: coordinates.labelCoords,
            supportedLanes: coordinates.supportedLanes,
        };
    });
}

/**
 * Builds house data for the simulation payload including the routes that pass through each house.
 * This is the extended version used when actually starting the simulation.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @returns {Array<Object>} An array of house objects with coordinates, package counts, and route names.
 */
export function getHousesLinkedToRoutesByScenarioKey(scenarioKey, mapData) {
    const houses = getHousesByScenarioKey(scenarioKey, mapData);

    return houses.map(house => ({
        ...house,
        routeNames: findRoutesForHouse(house, mapData),
    }));
}

/**
 * Determines which routes pass through the tile where a house is located.
 * A house is matched to a route if the house's tile is part of the route's tile path and
 * the house's supported lanes align with the route's lanes.
*
 * @param {Object} house - A house object with tileX and tileY properties.
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @returns {Array<string>} An array of route names that pass through the house's tile.
 */
function findRoutesForHouse(house, mapData) {
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
    const tile = mapData.find(t => t.x === house.tileX && t.y === house.tileY);
    const rotation = normalizeDegree(tile.rotation || 0);

    return house.supportedLanes.map(lane => ({
        from: rotateCardinalDirection(lane.from, rotation),
        to: rotateCardinalDirection(lane.to, rotation),
    }));
}