import { TILE_LANES } from './laneCoords.js';
import { useMapStore } from '../../stores/mapStore.js';
import { normalizeDegree, rotateCardinalDirection, rotatePointNormalized } from '../utils/rotation.js';
import { convertWaypointFromLocalToGlobal } from '../utils/coordinateConverter.js';

export const OPPOSITE_DIRECTION = {
    N: 'S',
    E: 'W',
    S: 'N',
    W: 'E',
};

/**
 * Returns the cardinal direction from tileA to tileB.
 * Expects tileB to be an cardinal neighbor of tileA (N, E, S, or W).
 *
 * @param {Object} tileA - The starting tile with properties x and y.
 * @param {Object} tileB - The neighboring tile with properties x and y.
 * @returns {string} The cardinal direction ('N', 'E', 'S', or 'W') from tileA to tileB.
 * @throws {Error} If tileB is not an orthogonal neighbor of tileA.
 */
export function getDirectionBetweenTiles(tileA, tileB) {
    const dx = tileB.x - tileA.x;
    const dy = tileB.y - tileA.y;

    if (dx === 0 && dy === -1) return 'N';
    if (dx === 1 && dy === 0) return 'E';
    if (dx === 0 && dy === 1) return 'S';
    if (dx === -1 && dy === 0) return 'W';

    throw new Error(
        `Tiles (${tileA.x},${tileA.y}) and (${tileB.x},${tileB.y}) are not cardinal neighbors.`
    );
}

/**
 * Looks up and returns the map tile at the given (x, y) coordinates.
 *
 * @param {number} x - The x-coordinate of the tile to find.
 * @param {number} y - The y-coordinate of the tile to find.
 * @returns {Object} The tile object at the specified coordinates.
 * @throws {Error} If no tile is found at the given coordinates.
 */
export function getMapTile(x, y) {
    const mapStore = useMapStore();
  
    const tile = mapStore.mapData.find((item) => item.x === x && item.y === y);

    if (!tile) {
        throw new Error(`No tile found at (${x}, ${y}).`);
    }

    return tile;
}

/**
 * Returns the lane definitions for a tile, rotated according to the tile's rotation.
 *
 * @param {Object} tile - The tile object with properties x, y, type, and optional rotation.
 * @returns {Array<Object>} An array of lane objects, each with id, tileX, tileY, tileType, from, to, and points (rotated to match the tile's orientation).
 * @throws {Error} If no lane definition is found for the tile type.
 */
export function getRotatedLanesForTile(tile) {
    const laneDefinition = TILE_LANES[tile.type];

    if (!laneDefinition) {
        throw new Error(`No lane definition found for tile type "${tile.type}".`);
    }

    const rotation = normalizeDegree(tile.rotation || 0);

    return laneDefinition.lanes.map((lane, index) => ({
        id: `${tile.x}-${tile.y}-${index}`,
        tileX: tile.x,
        tileY: tile.y,
        tileType: tile.type,
        from: rotateCardinalDirection(lane.from, rotation),
        to: rotateCardinalDirection(lane.to, rotation),
        points: lane.points.map((point) => {
            const rotatedPoint = rotatePointNormalized(point, rotation);
            return convertWaypointFromLocalToGlobal(rotatedPoint, tile.x, tile.y);
        }),
    }));
}

/**
 * Finds the lane in the depot tile used to start a route, leaving the depot in the specified direction.
 *
 * @param {Array<Object>} rotatedLanes - Array of lane objects for the depot tile, rotated to match the tile's orientation.
 * @param {string} nextDirection - The cardinal direction ('N', 'E', 'S', or 'W') in which the route should leave the depot.
 * @returns {Object} The lane object that starts from 'E' and ends in the given nextDirection.
 * @throws {Error} If no suitable start lane is found for the specified direction.
 */
function findDepotStartLane(rotatedLanes, nextDirection) {
    const lane = rotatedLanes.find(
        (candidate) => candidate.from === 'S' && candidate.to === nextDirection
    );

    if (!lane) {
        throw new Error(
            `No depot start lane found for leaving depot towards "${nextDirection}".`
        );
    }

    return lane;
}

/**
 * Finds the lane in the depot tile used to end a route, entering the depot from the specified direction.
 *
 * @param {Array<Object>} rotatedLanes - Array of lane objects for the depot tile, rotated to match the tile's orientation.
 * @param {string} incomingDirection - The cardinal direction ('N', 'E', 'S', or 'W') from which the route enters the depot.
 * @returns {Object} The lane object that starts from the given incomingDirection and ends at 'E'.
 * @throws {Error} If no suitable end lane is found for the specified direction.
 */
function findDepotEndLane(rotatedLanes, incomingDirection) {
    const lane = rotatedLanes.find(
        (candidate) => candidate.from === incomingDirection && candidate.to === 'E'
    );

    if (!lane) {
        throw new Error(
            `No depot end lane found for entering depot from "${incomingDirection}".`
        );
    }

    return lane;
}

/**
 * Finds the lane for a connecting (non-depot) tile, given the incoming and outgoing directions.
 *
 * @param {Array<Object>} rotatedLanes - Array of lane objects for the tile, rotated to match the tile's orientation.
 * @param {string} incomingDirection - The cardinal direction ('N', 'E', 'S', or 'W') from which the route enters the tile.
 * @param {string} outgoingDirection - The cardinal direction ('N', 'E', 'S', or 'W') in which the route leaves the tile.
 * @returns {Object} The lane object that matches the given incoming and outgoing directions.
 * @throws {Error} If no suitable lane is found for the specified directions.
 */
export function findConnectingLane(rotatedLanes, incomingDirection, outgoingDirection) {
    const lane = rotatedLanes.find(
        (candidate) =>
            candidate.from === incomingDirection && candidate.to === outgoingDirection
    );

    if (!lane) {
        throw new Error(
            `No connecting lane found for from="${incomingDirection}" to="${outgoingDirection}".`
        );
    }

    return lane;
}

/**
 * Converts a sequence of tiles (tile path) into a sequence of chosen lanes for the route.
 * This builder requires a complete route and is used for final route generation before starting the simulation.
 *
 * @param {Array<Object>} tilePath - Array of tile objects representing the route, each with x and y properties.
 * @param {boolean} allowIncompleteRoute - If true, does not throw an error if the last tile is not the depot tile.
 * @returns {Array<Object>} An array of lane objects representing the chosen lanes for the route.
 * @throws {Error} If the tile path is invalid or a suitable lane cannot be found for any tile.
 */
export function buildLaneSequenceFromTilePath(tilePath, allowIncompleteRoute = false) {
    const minimumRouteLength = 2;
    if (!Array.isArray(tilePath) || tilePath.length < minimumRouteLength) {
        throw new Error(`tilePath must contain at least ${minimumRouteLength} tiles.`);
    }

    const laneSequence = [];
    const iterationLimit = allowIncompleteRoute ? tilePath.length - 1 : tilePath.length;

    for (let index = 0; index < iterationLimit; index++) {
        const currentPathTile = tilePath[index];
        const currentMapTile = getMapTile(currentPathTile.x, currentPathTile.y);
        const rotatedLanes = getRotatedLanesForTile(currentMapTile);

        const isFirst = index === 0;
        const isLast = index === tilePath.length - 1;

        if (isFirst) {
            const nextTile = tilePath[index + 1];
            const nextDirection = getDirectionBetweenTiles(currentPathTile, nextTile);

            if (currentMapTile.type !== 't_split_out') {
                throw new Error('First tile in route must be the depot tile.');
            }

            laneSequence.push(findDepotStartLane(rotatedLanes, nextDirection));
            continue;
        }

        if (isLast && !allowIncompleteRoute) {
            const previousTile = tilePath[index - 1];
            const incomingDirection = OPPOSITE_DIRECTION[
                getDirectionBetweenTiles(previousTile, currentPathTile)
            ];

            if (currentMapTile.type !== 't_split_in') {
                throw new Error('Last tile in route must be the depot tile.');
            }

            laneSequence.push(findDepotEndLane(rotatedLanes, incomingDirection));
            continue;
        }

        const previousTile = tilePath[index - 1];
        const nextTile = tilePath[index + 1];

        const incomingDirection = OPPOSITE_DIRECTION[
            getDirectionBetweenTiles(previousTile, currentPathTile)
        ];
        const outgoingDirection = getDirectionBetweenTiles(currentPathTile, nextTile);

        laneSequence.push(
            findConnectingLane(rotatedLanes, incomingDirection, outgoingDirection)
        );
    }

    return laneSequence;
}

/**
 * Converts a sequence of lanes into a single list of global waypoints for the route.
 * 
 * @param {Array<Object>} laneSequence - Array of lane objects representing the chosen lanes for the route.
 * @returns {Array<Object>} An array of waypoint objects, each with x and y properties, representing the route.
 */
export function buildWaypointsFromLaneSequence(laneSequence) {
    const waypoints = [];
    const decimalPlaces = 3;

    laneSequence.forEach((lane) => {
        lane.points.forEach((point) => {
            waypoints.push({
                x: Number(point.x.toFixed(decimalPlaces)),
                y: Number(point.y.toFixed(decimalPlaces)),
            });
        });
    });

    return waypoints;
}

/**
 * Converts a sequence of tiles into a sequence of chosen lanes.
 * Must be a full route: depot -> ... -> depot
 *
 * @param {Array<Object>} tilePath - Array of tile objects representing the route, starting and ending with depot tiles.
 * @param {boolean} allowIncompleteRoute - If true, does not throw an error if the last tile is not the depot tile.
 * @returns {Array<Object>} An array of waypoint objects representing the route.
 */
export function buildWaypointRouteFromTilePath(tilePath, allowIncompleteRoute = false) {
    const laneSequence = buildLaneSequenceFromTilePath(tilePath, allowIncompleteRoute);
    return buildWaypointsFromLaneSequence(laneSequence);
}
