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

        <!-- Current tile highlight (depot at start, current tile during building) -->
        <rect
            v-if="currentTile"
            :x="currentTile.x"
            :y="currentTile.y"
            id="currentTileHighlight"
            width="1"
            height="1"
            fill="none"
            stroke="red"
            stroke-width="0.04"
            stroke-dasharray="0.1"
        />
        <animate
            xlink:href="#currentTileHighlight"
            attributeName="stroke-dashoffset"
            from="0"
            to="-0.2"
            dur="1.8s"
            repeatCount="indefinite"
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
        <BaseButton
          @click="resetRoute"
          variant="dev-small"
        >
          Reset
        </BaseButton>
        <BaseButton
          v-if="routeComplete && routeTiles.length > 2"
          @click="handleDevCopyRoute"
            variant="dev-small"
        >
          Copy
        </BaseButton>
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
import { DEPOT_ENTRANCE, DEPOT_EXIT, MAP_COLUMNS, MAP_ROWS } from '../constants/constants';
import { useRouteBuilder } from '../composables/useRouteBuilder';
import { BaseButton } from '../components/CustomComponents.js';

const isActive = defineModel('isActive', { type: Boolean, default: false });

const {
    routeTiles,
    copyFeedback,
    currentTile,
    routeComplete,
    possibleNextTiles,
    routeWaypoints,
    selectTile,
    resetRoute,
    setCopyFeedback,
} = useRouteBuilder();

/**
 * Copy route code to clipboard.
 * Prompts the user for a route name and formats the route tiles into code that can be pasted into the routes.js file.
 */
function handleDevCopyRoute() {
    const inputName = prompt('Enter route name (e.g., medium_9). \nEnsure ui_labels.js is updated accordingly to include NL/EN labels for this route key.');
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
        label: '${routeKey}',
        tiles: [
${tilesStr}
        ],
    },`;

    navigator.clipboard.writeText(code);

    setCopyFeedback('Route code copied to clipboard!');
}

</script>
