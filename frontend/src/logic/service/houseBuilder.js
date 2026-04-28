import { TILE_HOUSES } from "../domain/houseCoords";
import { rotatePointNormalized, normalizeDegree } from "../utils/rotation.js";

/**
 * Retrieves the metadata for a tile based on its coordinates from the map data.
 *
 * @param {Array<Object>} mapData - Array of all map tile objects.
 * @param {number} tileX - The x-coordinate of the tile within the map.
 * @param {number} tileY - The y-coordinate of the tile within the map.
 * @returns {Object} An object with type and rotation properties.
 * @throws {Error} If no tile is found at the given coordinates.
 */
export function getTileMetadata(mapData, tileX, tileY) {
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
 * Retrieves the local coordinates for a house on a tile based on the tile type.
 *
 * @param {string} tileType - The type of tile to get house coordinates for.
 * @returns {Object} An object with roadCoords, labelCoords, and supportedLanes.
 * @throws {Error} If no house coordinates are found for the tile type.
 */
export function getLocalHouseCoordinates(tileType) {
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
 * Rotates local coordinates within a tile based on the tile's rotation.
 * Each coordinate is rotated around the center of the tile (0.5, 0.5).
 *
 * @param {Object} localCoords - Object with roadCoords and labelCoords.
 * @param {number} rotationDegree - The rotation in degrees (0, 90, 180, 270).
 * @returns {Object} An object with rotated roadCoords and labelCoords.
 */
export function rotateLocalCoords(localCoords, rotationDegree) {
    const rotation = normalizeDegree(rotationDegree);

    return {
        roadCoords: rotatePointNormalized(localCoords.roadCoords, rotation),
        labelCoords: rotatePointNormalized(localCoords.labelCoords, rotation),
    };
}

/**
 * Transforms local coordinates to global coordinates based on tile position.
 *
 * @param {Object} rotatedCoords - Coordinates within the tile (0-1 range).
 * @param {number} tileX - The x-coordinate of the tile within the map.
 * @param {number} tileY - The y-coordinate of the tile within the map.
 * @returns {Object} An object with x and y as global coordinates.
 */
export function localToGlobalCoords(rotatedCoords, tileX, tileY) {
    return {
        x: tileX + rotatedCoords.x,
        y: tileY + rotatedCoords.y,
    };
}

/**
 * Gets the house coordinates for a tile, with rotation applied.
 * Combines local coordinate retrieval, tile rotation, and global conversion of coordinates.
 *
 * @param {string} tileType - The type of the tile.
 * @param {number} rotationDegree - The rotation of the tile in degrees.
 * @param {number} tileX - The x-coordinate of the tile within the map.
 * @param {number} tileY - The y-coordinate of the tile within the map.
 * @returns {Object} An object with rotated and translated roadCoords and labelCoords.
 */
export function getRotatedHouseCoordinatesForTile(tileType, rotationDegree, tileX, tileY) {
    const localCoords = getLocalHouseCoordinates(tileType);
    const rotatedCoords = rotateLocalCoords(localCoords, rotationDegree);
    
    return {
        roadCoords: localToGlobalCoords(rotatedCoords.roadCoords, tileX, tileY),
        labelCoords: localToGlobalCoords(rotatedCoords.labelCoords, tileX, tileY),
        supportedLanes: localCoords.supportedLanes,
    };
}
