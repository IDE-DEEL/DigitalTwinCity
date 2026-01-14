/**
 * Tag position mappings for each road type.
 * Based on the visual layouts in roadtypes.md.
 * 
 * Coordinates are normalized (0.0 to 1.0) within a tile.
 * The layout assumes the tile image is in its default orientation (0° rotation).
 * 
 * Grid positions in roadtypes.md are 4x4 cells, mapped to normalized coordinates.
 * Each cell is 0.25 units, so centers are at:
 * - Column 0 → x = 0.125
 * - Column 1 → x = 0.375
 * - Column 2 → x = 0.625
 * - Column 3 → x = 0.875
 * - Row 0 → y = 0.125
 * - Row 1 → y = 0.375
 * - Row 2 → y = 0.625
 * - Row 3 → y = 0.875
 */

// Grid cell centers (4x4 grid)
const COL_0 = 0.125;
const COL_1 = 0.375;
const COL_2 = 0.625;
const COL_3 = 0.875;

const ROW_0 = 0.125;
const ROW_1 = 0.375;
const ROW_2 = 0.625;
const ROW_3 = 0.875;

export const TAG_POSITIONS = {
    // Roundabout layout:
    // | 0 | 1  | 2  | 0  |
    // | 3 | 4  | 5  | 6  |
    // | 7 | 8  | 9  | 10 |
    // | 0 | 11 | 12 | 0  |
    roundabout: {
        1: { x: COL_1, y: ROW_0 },
        2: { x: COL_2, y: ROW_0 },
        3: { x: COL_0, y: ROW_1 },
        4: { x: COL_1, y: ROW_1 },
        5: { x: COL_2, y: ROW_1 },
        6: { x: COL_3, y: ROW_1 },
        7: { x: COL_0, y: ROW_2 },
        8: { x: COL_1, y: ROW_2 },
        9: { x: COL_2, y: ROW_2 },
        10: { x: COL_3, y: ROW_2 },
        11: { x: COL_1, y: ROW_3 },
        12: { x: COL_2, y: ROW_3 },
    },

    // Crossroad layout:
    // | 0 | 1  | 2  | 0  |
    // | 3 | 4  | 5  | 6  |
    // | 7 | 8  | 9  | 10 |
    // | 0 | 11 | 12 | 0  |
    crossroad: {
        1: { x: COL_1, y: ROW_0 },
        2: { x: COL_2, y: ROW_0 },
        3: { x: COL_0, y: ROW_1 },
        4: { x: COL_1, y: ROW_1 },
        5: { x: COL_2, y: ROW_1 },
        6: { x: COL_3, y: ROW_1 },
        7: { x: COL_0, y: ROW_2 },
        8: { x: COL_1, y: ROW_2 },
        9: { x: COL_2, y: ROW_2 },
        10: { x: COL_3, y: ROW_2 },
        11: { x: COL_1, y: ROW_3 },
        12: { x: COL_2, y: ROW_3 },
    },

    // Straight layout:
    // | 0 | 0   | 0   | 0 |
    // | 1 | 2a  | 2b  | 3 |
    // | 4 | 5a  | 5b  | 6 |
    // | 0 | 0   | 0   | 0 |
    straight: {
        1: { x: COL_0, y: ROW_1 },
        '2a': { x: COL_1, y: ROW_1 },
        '2b': { x: COL_2, y: ROW_1 },
        2: { x: 0.550, y: ROW_1 },  // Center between 2a and 2b
        3: { x: COL_3, y: ROW_1 },
        4: { x: COL_0, y: ROW_2 },
        '5a': { x: COL_1, y: ROW_2 },
        '5b': { x: COL_2, y: ROW_2 },
        5: { x: 0.550, y: ROW_2 },  // Center between 5a and 5b
        6: { x: COL_3, y: ROW_2 },
    },

    // Curve layout:
    // | 0 | 0   | 0   | 0 |
    // | 1 | 2a  | 0   | 0 |
    // | 4 | 5   | 2b  | 0 |
    // | 0 | 6   | 3   | 0 |
    curve: {
        1: { x: COL_0, y: ROW_1 },
        '2a': { x: COL_1, y: ROW_1 },
        '2b': { x: COL_2, y: ROW_2 },
        2: { x: 0.530, y: 0.575 },  // Center between 2a and 2b (diagonal)
        3: { x: COL_2, y: ROW_3 },
        4: { x: COL_0, y: ROW_2 },
        5: { x: 0.335, y: 0.755 },
        6: { x: COL_1, y: ROW_3 },
    },

    // T-junction layout:
    // | 0 | 7   | 8   | 0 |
    // | 4 | 5a  | 5b  | 6 |
    // | 1 | 2a  | 2b  | 3 |
    // | 0 | 0   | 0   | 0 |
    t_junction: {
        1: { x: COL_0, y: ROW_2 },
        '2a': { x: COL_1, y: ROW_2 },
        '2b': { x: COL_2, y: ROW_2 },
        2: { x: 0.560, y: ROW_2 },  // Center between 2a and 2b
        3: { x: COL_3, y: ROW_2 },
        4: { x: COL_0, y: ROW_1 },
        '5a': { x: COL_1, y: ROW_1 },
        '5b': { x: COL_2, y: ROW_1 },
        5: { x: 0.560, y: ROW_1 },  // Center between 5a and 5b
        6: { x: 0.985, y: ROW_1 },
        7: { x: COL_1, y: ROW_0 },
        8: { x: 0.545, y: ROW_0 },
    },

    // Start layout:
    // | 0 | 1 | 2 | 0 |
    // | 0 | 3 | 4 | 0 |
    // | 0 | 5 | 6 | 0 |
    // | 0 | 7 | 8 | 0 |
    start: {
        1: { x: COL_1, y: ROW_0 },
        2: { x: COL_2, y: ROW_0 },
        3: { x: COL_1, y: ROW_1 },
        4: { x: COL_2, y: ROW_1 },
        5: { x: COL_1, y: ROW_2 },
        6: { x: COL_2, y: ROW_2 },
        7: { x: COL_1, y: ROW_3 },
        8: { x: COL_2, y: ROW_3 },
    },
};

/**
 * Get the normalized position of a tag within its tile
 * @param {string} tileType - The type of tile (e.g., 'straight', 'curve', 't_junction')
 * @param {number|string} tagIndex - The tag index (e.g., 1, 2, '2a', '5b')
 * @returns {{x: number, y: number}|null} Normalized position or null if not found
 */
export function getTagPosition(tileType, tagIndex) {
    const positions = TAG_POSITIONS[tileType];
    if (!positions) {
        console.warn(`Unknown tile type: ${tileType}`);
        return null;
    }

    const position = positions[tagIndex];
    if (!position) {
        console.warn(`Unknown tag index ${tagIndex} for tile type ${tileType}`);
        return null;
    }

    return { ...position };
}