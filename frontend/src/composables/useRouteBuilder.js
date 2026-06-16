import { ref, computed } from "vue";
import { DEPOT_ENTRANCE, DEPOT_EXIT, MAP_COLUMNS, MAP_ROWS } from '../constants/constants';
import {
    getDirectionBetweenTiles,
    getMapTile,
    getRotatedLanesForTile,
    OPPOSITE_DIRECTION,
} from '../logic/service/routeBuilder.js';
import { getWaypointPreviewFromTilePath } from '../logic/service/routeService.js';

const durationInMillis = 2000;

export function useRouteBuilder() {
    const routeTiles = ref([DEPOT_EXIT]);   // Start route at depot exit tile
    const copyFeedback = ref('');

    const currentTile = computed(() => {
        return routeTiles.value[routeTiles.value.length - 1];
    });

    // For a route to be complete it needs to consist of multiple tiles and end at the depot
    const routeComplete = computed(() => {
        const lastTile = routeTiles.value[routeTiles.value.length - 1];

        return routeTiles.value.length > 1 && 
            lastTile.x === DEPOT_ENTRANCE.x &&
            lastTile.y === DEPOT_ENTRANCE.y;
    });

    const possibleNextTiles = computed(() => {
        const current = currentTile.value;
        const candidates = [
            { x: current.x, y: current.y - 1, dir: 'N' },
            { x: current.x + 1, y: current.y, dir: 'E' },
            { x: current.x, y: current.y + 1, dir: 'S' },
            { x: current.x - 1, y: current.y, dir: 'W' },
        ];

        const valid = [];

        for (const candidate of candidates) {
        // Check bounds
            if (candidate.x < 0 || candidate.x >= MAP_COLUMNS ||
            candidate.y < 0 || candidate.y >= MAP_ROWS) {
                continue;
            }

            // Check if tile exists
            try {
                const tile = getMapTile(candidate.x, candidate.y);

                // Exclude depot tiles (except entrance/exit)
                if (isDepotTile(tile)) {
                    continue;
                }

                // Validate lane connection
                try {
                    validateConnection(current, candidate);
                    valid.push(candidate);
                } catch {
                    // Lane connection doesn't exist, skip silently
                }
            } catch (e) {
                console.warn(e);
                // Tile doesn't exist, skip
            }
        }

        return valid;
    });

    // Calculate route waypoints from tiles to preview the route as it's being built.
    const routeWaypoints = computed(() => {
        try {
            return getWaypointPreviewFromTilePath(routeTiles.value);
        } catch {
            // If waypoint calculation fails, return empty array silently
            return [];
        }
    });

    /**
     * Validates whether a valid connection exists between two adjacent tiles.
     * 
     * @param {Object} fromTile - The starting tile with x and y properties.
     * @param {Object} toTile - The tile to move to with x and y properties.
     * @throws {Error} If there is no valid connection possible between the tiles.
     */
    function validateConnection(fromTile, toTile) {
        const minimumRouteLengthForReturnMove = 2;

        const fromMapTile = getMapTile(fromTile.x, fromTile.y);
        const toMapTile = getMapTile(toTile.x, toTile.y);

        const direction = getDirectionBetweenTiles(fromTile, toTile);
        const incomingDir = OPPOSITE_DIRECTION[direction];

        const fromRotatedLanes = getRotatedLanesForTile(fromMapTile);
        const toRotatedLanes = getRotatedLanesForTile(toMapTile);

        // Check from tile has lane exiting in the direction we want to go
        const fromLaneExists = fromRotatedLanes.some(lane => lane.to === direction);
        if (!fromLaneExists) {
            throw new Error(`No lane leaving from (${fromTile.x}, ${fromTile.y}) towards ${direction}`);
        }

        // Check to tile has lane entering from the opposite direction
        const toLaneExists = toRotatedLanes.some(lane => lane.from === incomingDir);
        if (!toLaneExists) {
            throw new Error(`No lane entering (${toTile.x}, ${toTile.y}) from ${incomingDir}`);
        }

        // For return moves (going back to previous tile), check if a lane exists with same from/to direction
        if (routeTiles.value.length >= minimumRouteLengthForReturnMove) {
            const prevTile = routeTiles.value[routeTiles.value.length - minimumRouteLengthForReturnMove];
            const isGoingBack = toTile.x === prevTile.x && toTile.y === prevTile.y;
        
            if (isGoingBack) {
                // Get the direction we are entering the current time from
                const directionWeEnterFrom = OPPOSITE_DIRECTION[getDirectionBetweenTiles(prevTile, fromTile)];                
                // For return moves, check if current tile has a lane that goes from incomingDir to incomingDir
                const returnLaneExists = fromRotatedLanes.some(
                    lane => lane.from === directionWeEnterFrom && lane.to === directionWeEnterFrom
                );
        
                if (!returnLaneExists) {
                    throw new Error(
                        `Cannot return to (${toTile.x}, ${toTile.y}): no valid connection with same direction "${directionWeEnterFrom}" exists`
                    );
                }
            }
        }
    }

    /**
     * Checks if a tile is a depot tile (excluding entrance and exit).
     * 
     * @param {Object} tile - The tile to check, with type property.
     * @returns {boolean} True if the tile is a depot tile, false otherwise.
     */
    function isDepotTile(tile) {
        const depotTypes = ['depot_down', 'depot_corner', 'depot_middle', 'depot_right'];
        return depotTypes.includes(tile.type);
    }

    /**
     * Select a tile and add it to the route.
     * 
     * @param {Object} tile - The tile to add, with x, y and direction properties.
     */
    function selectTile(tile) {
        routeTiles.value.push(tile);
    }

    /**
     * Reset the route back to the starting depot.
     */
    function resetRoute() {
        routeTiles.value = [DEPOT_EXIT];
        copyFeedback.value = '';
    }

    /**
     * Set feedback message for copy action and clear it after a timeout.
     */
    function setCopyFeedback(message) {
        copyFeedback.value = message;
        if (message) {
            setTimeout(() => {
                copyFeedback.value = '';
            }, durationInMillis);
        }
    }

    return {
        routeTiles,
        copyFeedback,
        currentTile,
        routeComplete,
        possibleNextTiles,
        routeWaypoints,
        selectTile,
        resetRoute,
        setCopyFeedback,
    };
}