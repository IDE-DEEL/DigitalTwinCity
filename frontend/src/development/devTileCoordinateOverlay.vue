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
      <div>Local: ({{ hoverInfo.localX }}, {{ hoverInfo.localY }})</div>
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

const overlayRef = ref(null);
const hoverInfo = ref(null);
const copiedMessage = ref('');

function roundCoord(value) {
  return Number(value.toFixed(2));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function findTileType(tileX, tileY) {
  const tile = props.mapData.find(t => t.x === tileX && t.y === tileY);
  return tile?.type ?? null;
}

function handleMouseMove(event) {
  const el = overlayRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();

  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  const clampedX = clamp(mouseX, 0, rect.width - 0.0001);
  const clampedY = clamp(mouseY, 0, rect.height - 0.0001);

  const tileWidth = rect.width / props.mapColumns;
  const tileHeight = rect.height / props.mapRows;

  const tileX = Math.floor(clampedX / tileWidth);
  const tileY = Math.floor(clampedY / tileHeight);

  const localX = (clampedX - tileX * tileWidth) / tileWidth;
  const localY = (clampedY - tileY * tileHeight) / tileHeight;

  hoverInfo.value = {
    mouseX: clampedX,
    mouseY: clampedY,
    tileX,
    tileY,
    tileType: findTileType(tileX, tileY),
    localX: roundCoord(localX),
    localY: roundCoord(localY),
    tileWidth,
    tileHeight,
  };
}

function handleMouseLeave() {
  hoverInfo.value = null;
}

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