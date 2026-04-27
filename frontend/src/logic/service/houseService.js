import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { TILE_HOUSES } from "../domain/houseCoords";

/**
 * Retrieves the metadata for a tile based on its coordinates from the map data.
 */
function getTileMetadata(mapData, tileX, tileY) {
    const tile = mapData.find(t => t.x === tileX && t.y === tileY);

    if (!tile) {
        throw new Error(`Tile not found at coordinates (${tileX}, ${tileY})`);
    }

    return {
        type: tile.type,
        rotation: tile.rotation || 0,
    };
}

/**
 * Builds necessary house data for the simulation payload based on the selected scenario and map data.
 */
export function getScenarioPayload(scenarioKey, mapData) {
    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, packageCount]) => {
        const instance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);
        const tileMetadata = getTileMetadata(mapData, instance.tileX, instance.tileY);
        // const coords = TILE_HOUSES[instance.tileType].roadCoords;

        return {
            houseInstanceId,
            tileX: instance.tileX,
            tileY: instance.tileY,
            packageCount,
            // roadCoords: coords,
            packageCount
        };
    });
}