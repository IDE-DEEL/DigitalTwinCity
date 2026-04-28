import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { getTileMetadata, getRotatedHouseCoordinatesForTile } from "./houseBuilder.js";

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
        };
    });
}