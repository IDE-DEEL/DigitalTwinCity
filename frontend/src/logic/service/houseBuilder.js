import { TILE_HOUSES } from "../domain/houseCoords";
import { useMapStore } from "../../stores/mapStore.js";
import { rotatePointNormalized, normalizeDegree } from "../utils/rotation.js";

/**
 * Retrieves the metadata for a tile based on its coordinates from the map data.
 *
 * @param {number} tileX - The x-coordinate of the tile within the map.
 * @param {number} tileY - The y-coordinate of the tile within the map.
 * @returns {Object} An object with type and rotation properties.
 * @throws {Error} If no tile is found at the given coordinates.
 */
export function getTileMetadata(tileX, tileY) {
    const mapStore = useMapStore();

    const tile = mapStore.mapData.find(t => t.x === tileX && t.y === tileY);

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
 * @param {string} housePositionId - The identifier for the house position on the tile (e.g., 'A').
 * @returns {Object} An object with roadCoords, labelCoords, and supportedLanes.
 * @throws {Error} If no house coordinates are found for the tile type.
 */
export function getLocalHouseCoordinates(tileType, housePositionId) {
    const tileHouses = TILE_HOUSES[tileType];
    if (!tileHouses || !tileHouses.houses[housePositionId]) {
        throw new Error(`No house coordinates found for tile type "${tileType}" and position "${housePositionId}".`);
    }

    const house = tileHouses.houses[housePositionId];
    return {
        roadCoords: house.roadCoords,
        labelCoords: house.labelCoords,
        supportedLanes: house.supportedLanes
    };
}

/**
 * Helper function to rotate an array of points
 * 
 * @param {Array<Object>} pointsArray - Array of points with x, y properties
 * @param {number} rotation - The rotation in degrees (0, 90, 180, 270)
 * @returns {Array<Object>} Array of rotated points
 */
function rotatePointsArray(pointsArray, rotation) {
    return pointsArray.map(point => rotatePointNormalized(point, rotation));
}

/**
 * Rotates local coordinates within a tile based on the tile's rotation.
 * Each coordinate is rotated around the center of the tile (0.5, 0.5).
 * Handles both single points and arrays of points.
 *
 * @param {Object} localCoords - Object with roadCoords (array or single) and labelCoords (single point).
 * @param {number} rotationDegree - The rotation in degrees (0, 90, 180, 270).
 * @returns {Object} An object with rotated roadCoords and labelCoords.
 */
export function rotateLocalCoords(localCoords, rotationDegree) {
    const rotation = normalizeDegree(rotationDegree);

    // Handle roadCoords as array (new) or single point (legacy)
    let rotatedRoadCoords;
    if (Array.isArray(localCoords.roadCoords)) {
        rotatedRoadCoords = rotatePointsArray(localCoords.roadCoords, rotation);
    } else {
        rotatedRoadCoords = rotatePointNormalized(localCoords.roadCoords, rotation);
    }

    return {
        roadCoords: rotatedRoadCoords,
        labelCoords: rotatePointNormalized(localCoords.labelCoords, rotation),
    };
}

/**
 * Helper function to convert an array of local coordinates to global
 * 
 * @param {Array<Object>} coordsArray - Array of coordinates in tile space (0-1)
 * @param {number} tileX - The x-coordinate of the tile
 * @param {number} tileY - The y-coordinate of the tile
 * @returns {Array<Object>} Array of global coordinates
 */
function localToGlobalCoordsArray(coordsArray, tileX, tileY) {
    return coordsArray.map(coord => ({
        x: tileX + coord.x,
        y: tileY + coord.y,
    }));
}

/**
 * Transforms local coordinates to global coordinates based on tile position.
 * Handles both single points and arrays of points.
 *
 * @param {Object|Array} rotatedCoords - Coordinate(s) within the tile (0-1 range).
 * @param {number} tileX - The x-coordinate of the tile within the map.
 * @param {number} tileY - The y-coordinate of the tile within the map.
 * @returns {Object|Array} Global coordinate(s).
 */
export function localToGlobalCoords(rotatedCoords, tileX, tileY) {
    if (Array.isArray(rotatedCoords)) {
        return localToGlobalCoordsArray(rotatedCoords, tileX, tileY);
    }
    
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
 * @param {string} housePositionId - The identifier for the house position on the tile (e.g., 'A').
 * @returns {Object} An object with rotated and translated roadCoords and labelCoords.
 */
export function getRotatedHouseCoordinatesForTile(tileType, rotationDegree, tileX, tileY, housePositionId) {
    const localCoords = getLocalHouseCoordinates(tileType, housePositionId);
    const rotatedCoords = rotateLocalCoords(localCoords, rotationDegree);
    
    return {
        roadCoords: localToGlobalCoords(rotatedCoords.roadCoords, tileX, tileY),
        labelCoords: localToGlobalCoords(rotatedCoords.labelCoords, tileX, tileY),
        supportedLanes: localCoords.supportedLanes,
    };
}
