<template>
  <div
    v-if="isActive"
    class="absolute inset-0 z-30 pointer-events-auto"
  >
    <!-- Map overlay for highlights -->
    <svg
      class="absolute inset-0 pointer-events-none"
      :viewBox="`0 0 ${mapColumns} ${mapRows}`"
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
    </svg>

    <!-- Control panel -->
    <div class="absolute top-2 left-2 bg-white border border-blue-400 rounded p-3 shadow-lg max-w-[10rem] z-40">
      <div class="font-semibold text-sm mb-2">Route Builder</div>

      <!-- Current route display -->
      <div class="text-xs mb-2">
        <div class="text-gray-600">Current route:</div>
        <div class="font-mono text-xs bg-gray-50 p-1 rounded max-h-20 overflow-y-auto">
          {{ routeDisplay }}
        </div>
      </div>

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
import { DEPOT_TILE } from '../constants/constants';
import {
  getDirectionBetweenTiles,
  getMapTile,
  getRotatedLanesForTile,
  OPPOSITE_DIRECTION,
} from '../logic/service/routeBuilder.js';

const props = defineProps({
  mapColumns: {
    type: Number,
    required: true,
  },
  mapRows: {
    type: Number,
    required: true,
  },
  mapData: {
    type: Array,
    required: true,
  },
});

const isActive = defineModel('isActive', { type: Boolean, default: false });
const routeTiles = ref([DEPOT_TILE]);
const copyFeedback = ref('');

const currentTile = computed(() => {
  return routeTiles.value[routeTiles.value.length - 1];
});

// For a route to be complete it needs to consist of multiple tiles and end at the depot
const routeComplete = computed(() => {
  return routeTiles.value.length > 1 && 
         routeTiles.value[routeTiles.value.length - 1].x === DEPOT_TILE.x &&
         routeTiles.value[routeTiles.value.length - 1].y === DEPOT_TILE.y;
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
    if (candidate.x < 0 || candidate.x >= props.mapColumns ||
        candidate.y < 0 || candidate.y >= props.mapRows) {
      continue;
    }

    // Check if tile exists
    try {
      const tile = getMapTile(props.mapData, candidate.x, candidate.y);

      // Validate lane connection
      try {
        validateConnection(current, candidate);
        valid.push(candidate);
      } catch (e) {
        // Lane connection doesn't exist, skip
      }
    } catch (e) {
      // Tile doesn't exist, skip
    }
  }

  return valid;
});

// Display route as formatted text
const routeDisplay = computed(() => {
  return routeTiles.value.map((tile, index) => {
    const isDepot = tile.x === DEPOT_TILE.x && tile.y === DEPOT_TILE.y;
    const label = isDepot ? 'DEPOT' : `(${tile.x},${tile.y})`;
    return label;
  }).join(' → ');
});

/**
 * Validates whether a valid connection exists between two adjacent tiles.
 * 
 * @param {Object} fromTile - The starting tile with x and y properties.
 * @param {Object} toTile - The tile to move to with x and y properties.
 * @throws {Error} If there is no valid connection possible between the tiles.
 */
function validateConnection(fromTile, toTile) {
  const fromMapTile = getMapTile(props.mapData, fromTile.x, fromTile.y);
  const toMapTile = getMapTile(props.mapData, toTile.x, toTile.y);

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
  if (routeTiles.value.length >= 2) {
    const prevTile = routeTiles.value[routeTiles.value.length - 2];
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
  routeTiles.value = [DEPOT_TILE];
  copyFeedback.value = '';
}

/**
 * Copy route code to clipboard.
 * Prompts the user for a route name and formats the route tiles into code that can be pasted into the routes.js file.
 */
function copyRoute() {
  const inputName = prompt('Enter route name (e.g., routeD):');
  if (!inputName) return;

  const label = inputName.trim();
  const routeKey = label
    .toLowerCase()
    .replace(/\s+/g, '_')

  const tilesStr = routeTiles.value
    .map(tile => {
      if (tile.x === DEPOT_TILE.x && tile.y === DEPOT_TILE.y) {
        return '          DEPOT_TILE';
      }
      return `            { x: ${tile.x}, y: ${tile.y} }`;
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
  }, 2000);
}
</script>
