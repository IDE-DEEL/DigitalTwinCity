import { getTagPosition } from '../domain/tagPositions.js';
import { rotatePointNormalized } from '../utils/rotation.js';

/**
 * RFID Tag Mapper Service
 * Converts tile number + tag index to absolute x,y coordinates on the map
 */

let mapData = null;
let rfidData = null;

/**
 * Initialize the mapper with map and RFID data
 * @param {Array} map - Array of map tiles with {x, y, type, rotation, tileNumber}
 * @param {Object} rfid - RFID configuration data
 */
export function initRfidMapper(map, rfid) {
  mapData = map;
  rfidData = rfid;
}

/**
 * Find the grid position and details of a tile by its tile number
 * @param {number} tileNumber - The RFID tile number
 * @returns {{x: number, y: number, type: string, rotation: number}|null}
 */
function findTileByNumber(tileNumber) {
  if (!mapData) {
    console.error('RFID mapper not initialized with map data');
    return null;
  }

  const tile = mapData.find(t => t.tileNumber === tileNumber);
  if (!tile) {
    console.warn(`Tile number ${tileNumber} not found in map`);
    return null;
  }

  return tile;
}

/**
 * Get the tile type from RFID data
 * @param {number} tileNumber - The RFID tile number
 * @returns {string|null} The tile type (e.g., 'straight', 'curve')
 */
function getTileTypeFromRfid(tileNumber) {
  if (!rfidData || !rfidData.tiles) {
    console.error('RFID data not initialized');
    return null;
  }

  const rfidTile = rfidData.tiles.find(t => t.tile_nr === tileNumber);
  if (!rfidTile) {
    console.warn(`Tile number ${tileNumber} not found in RFID data`);
    return null;
  }

  const template = rfidData.tile_templates[rfidTile.template];
  if (!template) {
    console.warn(`Template ${rfidTile.template} not found`);
    return null;
  }

  return template.type;
}

/**
 * Convert tile number and tag index to absolute map coordinates
 * @param {number} tileNumber - The RFID tile number from rfid.json
 * @param {number|string} tagIndex - The tag index (e.g., 1, 2, '2a', '5b')
 * @returns {{x: number, y: number}|null} Absolute coordinates or null if conversion fails
 */
export function convertTagToPosition(tileNumber, tagIndex) {
  // Find the tile on the map
  const tile = findTileByNumber(tileNumber);
  if (!tile) {
    return null;
  }

  // Get the tile type from RFID data
  const tileType = getTileTypeFromRfid(tileNumber);
  if (!tileType) {
    // Fallback to map tile type if RFID lookup fails
    console.warn(`Using map tile type as fallback for tile ${tileNumber}`);
    const fallbackType = tile.type === 'cross_split' ? 'crossroad' : tile.type;
    const normalizedType = fallbackType === 't_split' ? 't_junction' : fallbackType;
    return convertWithTileType(tile, normalizedType, tagIndex);
  }

  return convertWithTileType(tile, tileType, tagIndex);
}

/**
 * Convert tag to position using known tile type
 * @private
 */
function convertWithTileType(tile, tileType, tagIndex) {
  // Get the normalized position of the tag within the tile (0-1 coordinates)
  const tagPosition = getTagPosition(tileType, tagIndex);
  if (!tagPosition) {
    console.error(`Could not get tag position for ${tileType} tag ${tagIndex}`);
    return null;
  }

  // TEMPORARY FIX: Start tile uses straight.JPG which is rotated 90° differently
  // When proper start image is added, remove this offset
  const rotationOffset = tileType === 'start' ? -90 : 0;
  const effectiveRotation = tile.rotation + rotationOffset;

  // Apply rotation to the tag position
  // The tile's rotation affects where the tag appears
  const rotatedPosition = rotatePointNormalized(tagPosition, effectiveRotation);

  // Convert to absolute map coordinates
  // Add the tile's grid position to the rotated normalized position
  const absoluteX = tile.x + rotatedPosition.x;
  const absoluteY = tile.y + rotatedPosition.y;

  return {
    x: absoluteX,
    y: absoluteY
  };
}

/**
 * Verify if a tag exists for a given tile
 * @param {number} tileNumber - The RFID tile number
 * @param {number|string} tagIndex - The tag index
 * @returns {boolean} True if the tag exists for this tile
 */
export function verifyTag(tileNumber, tagIndex) {
  if (!rfidData || !rfidData.tiles) {
    return false;
  }

  const rfidTile = rfidData.tiles.find(t => t.tile_nr === tileNumber);
  if (!rfidTile) {
    return false;
  }

  const template = rfidData.tile_templates[rfidTile.template];
  if (!template) {
    return false;
  }

  // Convert tag index to string for comparison
  const tagIndexStr = String(tagIndex);
  return template.tags.includes(parseInt(tagIndexStr)) || 
         tagIndexStr.includes('a') || 
         tagIndexStr.includes('b');
}
