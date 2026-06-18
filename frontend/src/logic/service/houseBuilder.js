const detectionZoneRadius = 0.18;

export function buildHouseCoordinates(instance) {
    const roadCoords = generateRoadCoordsFromCenter(
        instance.roadCenter,
        detectionZoneRadius
    );

    return {
        roadCoords: localToGlobalCoordsArray(roadCoords, instance.tileX, instance.tileY),
        labelCoords: localToGlobalCoords(instance.labelCoords, instance.tileX, instance.tileY),
        supportedLanes: instance.supportedLanes
    };
}

/**
 * Creates a square detection zone around a central point for a house, which can be used to determine when a car is close enough to the house for package pickup/dropoff.
 * @param {Object} centerPoint - { x y } Local coordinates of the center point within the tile (0-1 range).
 * @param {number} radius - Half the width of the square (default 0.1)
 * @returns {Array<Object>} Array of four points representing the corners of the square around the center point
 */
export function generateRoadCoordsFromCenter(centerPoint, radius = detectionZoneRadius) {
    const { x, y } = centerPoint;
    
    return [
        { x: x - radius, y: y - radius }, // top-left
        { x: x + radius, y: y - radius }, // top-right
        { x: x + radius, y: y + radius }, // bottom-right
        { x: x - radius, y: y + radius }, // bottom-left
    ];
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
