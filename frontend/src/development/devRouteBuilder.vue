<template>
  <div
    v-if="isActive"
    class="absolute inset-0 z-30 pointer-events-auto"
  >
    <!-- Map overlay for highlights -->
    <svg
      class="svg-defaults"
      :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
      :preserveAspectRatio="`none`"
    >
      <!-- Current tile highlight (depot at start, current tile during building) -->
      <rect
        v-if="currentTile"
        :x="currentTile.x"
        :y="currentTile.y"
        width="1"
        height="1"
        fill="none"
        stroke="gold"
        stroke-width="0.06"
        stroke-dasharray="0.1"
      />

      <!-- Possible next tiles (in blue) -->
      <rect
        v-for="tile in possibleNextTiles"
        :key="`possible-${tile.x}-${tile.y}`"
        :x="tile.x"
        :y="tile.y"
        width="1"
        height="1"
        fill="rgba(100, 150, 255, 0.2)"
        stroke="blue"
        stroke-width="0.04"
        class="pointer-events-auto cursor-pointer"
        @click="selectTile(tile)"
      />

      <!-- Route tiles (in green) -->
      <rect
        v-for="(tile, idx) in routeTiles"
        :key="`route-${idx}`"
        :x="tile.x"
        :y="tile.y"
        width="1"
        height="1"
        fill="rgba(100, 255, 100, 0.15)"
        stroke="green"
        stroke-width="0.02"
      />

      <!-- Route waypoints polyline -->
      <polyline
        v-if="routeWaypoints.length > 0"
        :points="routeWaypoints.map(p => `${p.x},${p.y}`).join(' ')"
        id="routePreview"
        fill="none"
        stroke="darkgreen"
        stroke-width="0.01"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="0.06 0.04"
      />
      <animate
        xlink:href="#routePreview"
        attributeName="stroke-dashoffset"
        from="0"
        to="-0.10"
        dur="1.8s"
        repeatCount="indefinite"
      />
    </svg>

    <!-- Control panel -->
    <div class="absolute top-2 left-2 bg-white border border-blue-400 rounded p-3 shadow-lg max-w-[10rem] z-40">
      <div class="font-semibold text-sm mb-2">Route Builder</div>

      <!-- Status -->
      <div class="text-xs mb-2">
        <span v-if="!routeComplete" class="text-blue-600">Building...</span>
        <span v-else class="text-green-600">Route complete</span>
      </div>

      <!-- Action buttons -->
      <div class="flex gap-1">
        <button
          @click="resetRoute"
          class="flex-1 px-2 py-1 text-xs rounded border border-gray-400 bg-white hover:bg-gray-100"
        >
          Reset
        </button>
        <button
          v-if="routeComplete && routeTiles.length > 2"
          @click="copyRoute"
          class="flex-1 px-2 py-1 text-xs rounded border border-green-400 bg-green-50 hover:bg-green-100 font-semibold"
        >
          Copy
        </button>
      </div>

      <!-- Copy feedback -->
      <div
        v-if="copyFeedback"
        class="text-xs text-green-600 mt-1"
      >
        {{ copyFeedback }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { DEPOT_ENTRANCE, DEPOT_EXIT, MAP_COLUMNS, MAP_ROWS } from '../constants/constants';
import {
    getDirectionBetweenTiles,
    getMapTile,
    getRotatedLanesForTile,
    OPPOSITE_DIRECTION,
} from '../logic/service/routeBuilder.js';
import { getWaypointPreviewFromTilePath } from '../logic/service/routeService.js';

const isActive = defineModel('isActive', { type: Boolean, default: false });
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
            const tile =getMapTile(candidate.x, candidate.y); // TODO: check if this is necessary, previously had const tile = but went unused

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
            // Get the direction we came FROM to reach the current tile
            const directionFromPrevToCurrent = getDirectionBetweenTiles(prevTile, fromTile);
      
            // For return moves, check if current tile has a lane that goes from incomingDir to incomingDir
            // (same direction in and out)
            const returnLaneExists = fromRotatedLanes.some(
                lane => lane.from === directionFromPrevToCurrent && lane.to === directionFromPrevToCurrent
            );
      
            if (!returnLaneExists) {
                throw new Error(
                    `Cannot return to (${toTile.x}, ${toTile.y}): no valid connection with same direction "${directionFromPrevToCurrent}" exists`
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
 * Copy route code to clipboard.
 * Prompts the user for a route name and formats the route tiles into code that can be pasted into the routes.js file.
 */
function copyRoute() {
    const timeoutInMillis = 2000;

    const inputName = prompt('Enter route name (e.g., Route D):');
    if (!inputName) return;

    const label = inputName.trim();
    const routeKey = label
        .toLowerCase()
        .replace(/\s+/g, '_');

    const indent = '            '; // 12 spaces

    const tilesStr = routeTiles.value
        .map(tile => {
            if (tile.x === DEPOT_EXIT.x && tile.y === DEPOT_EXIT.y) {
                return `${indent}DEPOT_EXIT`;
            }

            if (tile.x === DEPOT_ENTRANCE.x && tile.y === DEPOT_ENTRANCE.y) {
                return `${indent}DEPOT_ENTRANCE`;
            }

            return `${indent}{ x: ${tile.x}, y: ${tile.y} }`;
        })
        .join(',\n');

    const code = `${routeKey}: {
        label: '${label}',
        tiles: [
${tilesStr}
        ],
    },`;

    navigator.clipboard.writeText(code);

    copyFeedback.value = 'Copied to clipboard!';
    setTimeout(() => {
        copyFeedback.value = '';
    }, timeoutInMillis);
}
</script>
