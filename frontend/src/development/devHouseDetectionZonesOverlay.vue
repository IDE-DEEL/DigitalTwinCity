<template>
  <svg
    class="absolute inset-0 pointer-events-none"
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
import { getTileMetadata, getLocalHouseCoordinates, localToGlobalCoords } from "../logic/service/houseBuilder.js";
import { rotatePointNormalized, normalizeDegree } from "../logic/utils/rotation.js";
import { HOUSE_INSTANCES } from "../logic/domain/houseInstances.js";
import { getHousesForScenarioByValue } from "../logic/domain/scenarios.js";
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
 * Rotate an array of points around the tile center (0.5, 0.5)
 */
function rotatePointsArray(pointsArray, rotationDegree) {
  return pointsArray.map((point) => rotatePointNormalized(point, rotationDegree));
}

/**
 * Get the houses active in the current scenario and build detection zones with rotation
 */
const detectionZones = computed(() => {
  try {
    const scenarioHouses = getHousesForScenarioByValue(props.scenario);
    
    return Object.keys(scenarioHouses).map((houseInstanceId) => {
      const instance = HOUSE_INSTANCES.find((h) => h.id === houseInstanceId);
      
      if (!instance) return null;

      // Get tile metadata to extract rotation
      const tileMetadata = getTileMetadata(instance.tileX, instance.tileY);
      
      // Get local house coordinates for the tile type
      const localCoords = getLocalHouseCoordinates(tileMetadata.type, instance.positionId);
      
      // Rotate each point in the roadCoords array based on tile rotation
      const rotatedRoadCoords = rotatePointsArray(
        localCoords.roadCoords,
        tileMetadata.rotation
      );
      
      // Transform each rotated point to global coordinates
      const globalRoadCoords = rotatedRoadCoords.map((coord) =>
        localToGlobalCoords(coord, instance.tileX, instance.tileY)
      );
      
      return {
        houseInstanceId,
        points: globalRoadCoords,
        labelPos: calculateCentroid(globalRoadCoords),
      };
    }).filter((zone) => zone !== null);
  } catch (error) {
    console.error("Error building detection zones:", error);
    return [];
  }
});
</script>
