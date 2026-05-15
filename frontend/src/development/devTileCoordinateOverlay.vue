<template>
  <div
    ref="overlayRef"
    class="absolute inset-0 z-30 cursor-crosshair"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <div
      v-if="hoverInfo"
      class="absolute border-2 border-red-500 pointer-events-none"
      :style="tileHighlightStyle"
    ></div>

    <div
      v-if="hoverInfo"
      class="absolute w-2 h-2 bg-red-500 rounded-full pointer-events-none"
      :style="markerStyle"
    ></div>

    <div
      v-if="hoverInfo"
      class="absolute pointer-events-none bg-white border border-gray-400 rounded px-2 py-1 text-xs shadow"
      :style="tooltipStyle"
    >
      <div>Tile: ({{ hoverInfo.tileX }}, {{ hoverInfo.tileY }})</div>
      <div>Type: {{ hoverInfo.tileType ?? 'unknown' }}</div>
      <div>Rotation: {{ hoverInfo.tileRotation }}°</div>
      <div>Local x-y: ({{ hoverInfo.localX }}, {{ hoverInfo.localY }})</div>
      <div class="text-gray-500">Click to copy</div>
    </div>

    <div
      v-if="copiedMessage"
      class="absolute left-2 bottom-2 bg-green-100 border border-green-400 text-green-800 rounded px-2 py-1 text-xs pointer-events-none"
    >
      {{ copiedMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { MAP_COLUMNS, MAP_ROWS } from '../constants/constants.js';
import { useMapStore } from '../stores';

const mapStore = useMapStore();

const overlayRef = ref(null);
const hoverInfo = ref(null);
const copiedMessage = ref('');

/**
 * Rounds a coordinate value to two decimals.
 * 
 * @param value - The coordinate value to round.
 * @returns The rounded coordinate value.
 */
function roundCoord(value) {
  return Number(value.toFixed(2));
}

/**
 * Restricts a value to stay within the given minimum and maximum bounds.
 * 
 * @param value - The value to clamp.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns The clamped value.
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Finds the type and rotation of a tile based on its coordinates.
 * 
 * @param tileX - The x-coordinate of the tile.
 * @param tileY - The y-coordinate of the tile.
 * @returns An object with type and rotation properties, or null if not found.
 */
function findTileData(tileX, tileY) {
  const tile = mapStore.mapData.find(t => t.x === tileX && t.y === tileY);
  if (!tile) return null;
  return {
    type: tile.type ?? null,
    rotation: tile.rotation ?? 0,
  };
}

/**
 * Calculates the mouse position relative to the overlay, determines which tile is being hovered 
 * as well as the local tile coordinates, and updates hoverInfo for highlightiing and tooltip display.
 * Clamps mouse coordinates to ensure they stay within the overlay bounds.
 * 
 * @param event  - Mouse event containing the cursor position.
 */
function handleMouseMove(event) {
  const overlayElement = overlayRef.value;
  if (!overlayElement) return;

  const rect = overlayElement.getBoundingClientRect();

  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

//   prevent cursor from going outside of the overlay, which could cause values to be out of bounds or incorrect
  const clampedX = clamp(mouseX, 0, rect.width - 0.0001);
  const clampedY = clamp(mouseY, 0, rect.height - 0.0001);

  const tileWidth = rect.width / MAP_COLUMNS;
  const tileHeight = rect.height / MAP_ROWS;

  const tileX = Math.floor(clampedX / tileWidth);
  const tileY = Math.floor(clampedY / tileHeight);

  const localX = (clampedX - tileX * tileWidth) / tileWidth;
  const localY = (clampedY - tileY * tileHeight) / tileHeight;

  const tileData = findTileData(tileX, tileY);

  hoverInfo.value = {
    mouseX: clampedX,
    mouseY: clampedY,
    tileX,
    tileY,
    tileType: tileData?.type ?? null,
    tileRotation: tileData?.rotation ?? 0,
    localX: roundCoord(localX),
    localY: roundCoord(localY),
    tileWidth,
    tileHeight,
  };
}

/**
 * Clears hover info when mouse leaves the overlay, hiding highlights and tooltip.
 */
function handleMouseLeave() {
  hoverInfo.value = null;
}

/**
 * Copies the current tile coordinates to the clipboard in the format { x: X, y: Y }, 
 * and shows a temporary confirmation message.
 * If copying fails, shows an error message instead.
 */
async function handleClick() {
  if (!hoverInfo.value) return;

  const text = `{ x: ${hoverInfo.value.localX}, y: ${hoverInfo.value.localY} },`;

  try {
    await navigator.clipboard.writeText(text);
    copiedMessage.value = `Copied: ${text}`;
    setTimeout(() => {
      copiedMessage.value = '';
    }, 1200);
  } catch {
    copiedMessage.value = 'Copy failed';
    setTimeout(() => {
      copiedMessage.value = '';
    }, 1200);
  }
}

const tileHighlightStyle = computed(() => {
  if (!hoverInfo.value) return {};

  return {
    left: `${hoverInfo.value.tileX * hoverInfo.value.tileWidth}px`,
    top: `${hoverInfo.value.tileY * hoverInfo.value.tileHeight}px`,
    width: `${hoverInfo.value.tileWidth}px`,
    height: `${hoverInfo.value.tileHeight}px`,
  };
});

const markerStyle = computed(() => {
  if (!hoverInfo.value) return {};

  return {
    left: `${hoverInfo.value.mouseX - 4}px`,
    top: `${hoverInfo.value.mouseY - 4}px`,
  };
});

const tooltipStyle = computed(() => {
  if (!hoverInfo.value) return {};

  return {
    left: `${hoverInfo.value.mouseX + 12}px`,
    top: `${hoverInfo.value.mouseY + 12}px`,
  };
});
</script>