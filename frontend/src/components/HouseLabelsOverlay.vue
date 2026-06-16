<template>
    <!-- SVG group for house labels -->
  <g class="house-labels-overlay">
    <g 
      v-for="house in houses" 
      :key="house.houseInstanceId"
      class="house-label"
    >
      <!-- label background -->
      <circle
        :cx="house.labelCoords.x"
        :cy="house.labelCoords.y"
        :r="DEFAULT_CIRCLE_RADIUS"
        fill="white"
        stroke="black"
        stroke-width="0.02"
        :class="{ 'package-delivered': animatedHouses.has(house.houseInstanceId) }"
      />
      <!-- Package count text -->
      <text
        :x="house.labelCoords.x"
        :y="house.labelCoords.y + TEXT_Y_OFFSET"
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="0.1"
        font-weight="500"
        fill="black"
      >
        {{ house.expectedPackages }}
      </text>
    </g>
  </g>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useSimulationStateStore } from '../stores/index';

const props = defineProps({
    houses: {
        type: Array,
        required: true
    }
});

const TEXT_Y_OFFSET = 0.01;
const DEFAULT_CIRCLE_RADIUS = 0.08;
const durationInMillis = 800;

const animatedHouses = ref(new Set());
const previousExpectedPackageCounts = ref({});
const simulationStore = useSimulationStateStore();

watch(
    () => props.houses,
    (newHouses) => {
        if (!simulationStore.isSimulating) return;

        newHouses.forEach(house => {
            const currentCount = house.expectedPackages;
            const previousCount = previousExpectedPackageCounts.value[house.houseInstanceId];

            // If count decreased (package was delivered), trigger animation
            if (previousCount !== undefined && currentCount < previousCount) {
                triggerAnimation(house.houseInstanceId);
            }

            // Update the previous count
            previousExpectedPackageCounts.value[house.houseInstanceId] = currentCount;
        });
    },
    { deep: true }
);

function triggerAnimation(houseInstanceId) {
    animatedHouses.value.add(houseInstanceId);

    // Remove animation class after animation completes
    setTimeout(() => {
        animatedHouses.value.delete(houseInstanceId);
    }, durationInMillis);
}
</script>

<style scoped>
@keyframes package-pulse {
  0% {
    r: DEFAULT_CIRCLE_RADIUS;
    stroke-width: 0.02;
  }
  50% {
    r: 0.12;
    stroke-width: 0.01;
    stroke: green;
  }
  100% {
    r: DEFAULT_CIRCLE_RADIUS;
    stroke-width: 0.02;
  }
}

.package-delivered {
  animation: package-pulse 0.8s ease-out;
}
</style>