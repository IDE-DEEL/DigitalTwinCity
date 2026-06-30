<template>
  <svg
    class="svg-defaults"
    :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
    preserveAspectRatio="none"
  >
    <!-- House detection zones -->
    <polygon
      v-for="zone in detectionZones"
      :key="zone.houseInstanceId"
      :points="zone.points.map((p) => `${p.x},${p.y}`).join(' ')"
      fill="rgba(100, 200, 255, 0.3)"
      stroke="rgba(100, 150, 200, 0.9)"
      stroke-width="0.015"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Zone labels -->
    <text
      v-for="zone in detectionZones"
      :key="`label-${zone.houseInstanceId}`"
      :x="zone.labelPos.x"
      :y="zone.labelPos.y"
      font-size="0.1"
      fill="rgba(0, 0, 0, 0.7)"
      text-anchor="middle"
      pointer-events="none"
    >
      {{ zone.houseInstanceId }}
    </text>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { getHousesByScenarioKey } from "../logic/service/houseService.js";
import { MAP_COLUMNS, MAP_ROWS } from '../constants/constants.js';

const props = defineProps({
    scenario: {
        type: String,
        required: true,
    },
});

/**
 * Calculate the average point for zone label positioning
 */
function calculateCentroid(points) {
    if (points.length === 0) return { x: 0, y: 0 };
  
    const sum = points.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
    );
  
    return {
        x: sum.x / points.length,
        y: sum.y / points.length,
    };
}

/**
 * Get the houses active in the current scenario and build detection zones
 */
const detectionZones = computed(() => {
    try {
        return getHousesByScenarioKey(props.scenario).map((house) => ({
            houseInstanceId: house.houseInstanceId,
            points: house.roadCoords,
            labelPos: calculateCentroid(house.roadCoords),
        }));
    } catch (error) {
        console.error("Error building detection zones:", error);
        return [];
    }
});
</script>
