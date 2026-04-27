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
 * retrieves the local coordinates for a house on a tile based on the tile type.
 */
function getLocalHouseCoordinates(tileType) {
    const tileHouses = TILE_HOUSES[tileType];
    if (!tileHouses || !tileHouses.houses[0]) { // TODO: update this index later with the house id
        throw new Error(`No house coordinates found for tile type "${tileType}".`);
    }

    const house = tileHouses.houses[0]; // TODO: update this index later with the house id
    return {
        roadCoords: house.roadCoords,
        labelCoords: house.labelCoords,
        supportedLanes: house.supportedLanes
    };
}

/**
 * Transforms local coordinates to global coordinates based on tile position.
 */
function localToGlobalCoords(labelCoords, tileX, tileY) {
    return {
        x: tileX + labelCoords.x,
        y: tileY + labelCoords.y,
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

        const localCoords = getLocalHouseCoordinates(tileMetadata.type);
        // TODO: ensure rotation is applied correctly to keep label/road-coords accurate
        const globalRoadCoords = localToGlobalCoords(localCoords.roadCoords, instance.tileX, instance.tileY);
        const globalLabelCoords = localToGlobalCoords(localCoords.labelCoords, instance.tileX, instance.tileY);

        return {
            houseInstanceId,
            tileX: instance.tileX,
            tileY: instance.tileY,
            packageCount,
            roadCoords: globalRoadCoords,
            labelCoords: globalLabelCoords,
        };
    });
}