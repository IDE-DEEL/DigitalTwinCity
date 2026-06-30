/**
 * Converts a waypoint from local coordinates to global coordinates
 * 
 * @param {Object} waypoint - The waypoint object with x and y properties
 * @param {number} tileX - The x-coordinate of the tile
 * @param {number} tileY - The y-coordinate of the tile
 * @returns {Object} The converted waypoint in global coordinates
 */
export function convertWaypointFromLocalToGlobal(waypoint, tileX, tileY) {
    return {
        x: tileX + waypoint.x,
        y: tileY + waypoint.y,
    };
}
