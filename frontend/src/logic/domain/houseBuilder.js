import { rotatePointAroundCenterByAngle } from "../utils/rotation";

export function buildHouseCoordinates(houseInstance) {
    const roadCoords = generateRoadCoordsFromCenter(
        houseInstance.roadCenter,
        houseInstance.tileType,
        houseInstance.tileRotation
    );

    return {
        roadCoords: localToGlobalCoordsArray(roadCoords, houseInstance.tileX, houseInstance.tileY),
        labelCoords: localToGlobalCoords(houseInstance.labelCoords, houseInstance.tileX, houseInstance.tileY),
        supportedLanes: houseInstance.supportedLanes
    };
}

/**
 * Creates a square detection zone around a central point for a house, which can be used to determine when a car is close enough to the house for package pickup/dropoff.
 * @param {Object} centerPoint - { x y } Local coordinates of the center point within the tile (0-1 range).
 * @param {number} radius - Half the width of the square (default 0.1)
 * @returns {Array<Object>} Array of four points representing the corners of the square around the center point
 */
export function generateRoadCoordsFromCenter(centerPoint, tileType, tileRotation = 0) {
    const { x, y } = centerPoint;
    const { radiusX, radiusY } = getRadiusForType(tileType);
    
    const corners = [
        { x: x - radiusX, y: y - radiusY }, // top-left
        { x: x + radiusX, y: y - radiusY }, // top-right
        { x: x + radiusX, y: y + radiusY }, // bottom-right
        { x: x - radiusX, y: y + radiusY }, // bottom-left
    ];
    
    if (tileType === 'curve') {
        const rotationAngle = 45;
        return corners.map((corner) => rotatePointAroundCenterByAngle(corner, centerPoint, rotationAngle));
    }

    if (tileType === 't_split') {
        return corners.map((corner) => rotatePointAroundCenterByAngle(corner, centerPoint, tileRotation));
    }

    return corners;
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
 * Helper function to determine the radius of the detection zone based on the tile type.
 * 
 * @param {string} tileType - The type of the tile (e.g., 'straight', 'curve', 't_split').
 * @returns {Object} An object containing radiusX and radiusY for the detection zone.
 */
function getRadiusForType(tileType) {
    const smallZone = 0.12;
    const largeZone = 0.24;

    switch (tileType) {
        case 't_split':
            return { radiusX: largeZone, radiusY: smallZone };
        default:
            return { radiusX: smallZone, radiusY: smallZone };
    }
};

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
