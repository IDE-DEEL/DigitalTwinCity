import { MAP_ROWS } from '../../constants/constants';
/**
 * Coordinate system conversion utilities
 * 
 * Frontend (SVG): Y=0 at top, increases downward
 * Backend (Math): Y=0 at bottom, increases upward
 */

/**
 * Convert waypoints from SVG coordinates (frontend) to mathematical coordinates (backend)
 * Used when sending waypoints to backend for simulation
 * 
 * @param {Array<Object>} waypoints - Array of waypoint objects with x, y properties
 * @returns {Array<Object>} Converted waypoints in mathematical coordinate system
 */
export function convertWaypointsArrayFromSvgToMath(waypoints) {
  return waypoints.map(point => ({
    x: point.x,
    y: MAP_ROWS - point.y
  }));
}

/**
 * Convert waypoints from SVG coordinates (frontend) to mathematical coordinates (backend)
 * Used when sending waypoints to backend for simulation
 * 
 * @param {Array<Object>} waypoints - Array of waypoint objects with x, y properties
 * @returns {Array<Object>} Converted waypoints in mathematical coordinate system
 */
export function convertWaypointFromSvgToMath(waypoint) {
  return {
    x: waypoint.x,
    y: MAP_ROWS - waypoint.y
  };
}

/**
 * Convert position from mathematical coordinates (backend) to SVG coordinates (frontend)
 * Used when receiving agent positions from backend for display
 * 
 * @param {Array<number>} position - Position [x, y] in mathematical coordinates
 * @returns {Array<number>} Position [x, y] in SVG coordinates
 */
export function convertPositionMathToSvg(position) {
  return [position[0], MAP_ROWS - position[1]];
}

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
