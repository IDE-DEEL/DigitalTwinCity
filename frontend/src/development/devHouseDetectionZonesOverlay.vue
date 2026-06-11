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
import { buildHouseCoordinates } from "../logic/service/houseBuilder.js";
import { getAllHouseInstances, getHousesForScenario } from "../logic/service/houseService.js";
import { useMapStore } from "../stores/mapStore.js";
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
        const scenarioHouses =
            getHousesForScenario(props.scenario);

        const mapStore = useMapStore();
        const houseInstances = getAllHouseInstances();

        return Object.keys(scenarioHouses)
            .map((houseInstanceId) => {
                const instance = houseInstances.find(
                    h => h.id === houseInstanceId
                );

                if (!instance) {
                    return null;
                }

                const tile = mapStore.mapData.find(
                    t =>
                        t.x === instance.tileX &&
            t.y === instance.tileY
                );

                const coordinates = buildHouseCoordinates(
                    instance,
                    tile?.rotation || 0
                );

                return {
                    houseInstanceId,
                    points: coordinates.roadCoords,
                    labelPos: calculateCentroid(
                        coordinates.roadCoords
                    ),
                };
            })
            .filter(Boolean);

    } catch (error) {
        console.error(
            "Error building detection zones:",
            error
        );

        return [];
    }
});
</script>
