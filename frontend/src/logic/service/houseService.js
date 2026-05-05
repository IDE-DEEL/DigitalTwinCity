import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { getTileMetadata, getRotatedHouseCoordinatesForTile } from "./houseBuilder";
import { findRoutesForHouse } from "./houseRouteMatchingService";

/**
 * Builds necessary house data for the simulation payload and package overlay based on the selected scenario and map data.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @returns {Array<Object>} An array of house objects with coordinates and package counts for the simulation.
 */
export function getHousesByScenarioKey(scenarioKey) {
    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, packageCount]) => {
        const instance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);
        const tileMetadata = getTileMetadata(instance.tileX, instance.tileY);
        
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
 * @returns {Array<Object>} An array of house objects with coordinates, package counts, and route names.
 */
export function getHousesLinkedToRoutesByScenarioKey(scenarioKey) {
    const houses = getHousesByScenarioKey(scenarioKey);

    return houses.map(house => ({
        ...house,
        routeNames: findRoutesForHouse(house),
    }));
}
