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
        r="0.08"
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
        {{ house.packageCount }}
      </text>
    </g>
  </g>
</template>

<script setup>
import { defineProps, ref, watch } from 'vue';

const props = defineProps({
  houses: {
    type: Array,
    required: true
  }
});

const TEXT_Y_OFFSET = 0.01;

const animatedHouses = ref(new Set());
const previousPackageCounts = ref({});

watch(
  () => props.houses,
  (newHouses) => {
    newHouses.forEach(house => {
      const currentCount = house.packageCount;
      const previousCount = previousPackageCounts.value[house.houseInstanceId];

      // If count decreased (package was delivered), trigger animation
      if (previousCount !== undefined && currentCount < previousCount) {
        animatedHouses.value.add(house.houseInstanceId);
        
        // Remove animation class after animation completes
        setTimeout(() => {
          animatedHouses.value.delete(house.houseInstanceId);
        }, 800);
      }

      // Update the previous count
      previousPackageCounts.value[house.houseInstanceId] = currentCount;
    });
  },
  { deep: true }
);
</script>

<style scoped>
@keyframes package-pulse {
  0% {
    r: 0.08;
    stroke-width: 0.02;
  }
  50% {
    r: 0.12;
    stroke-width: 0.01;
    stroke: green;
  }
  100% {
    r: 0.08;
    stroke-width: 0.02;
  }
}

.package-delivered {
  animation: package-pulse 0.8s ease-out;
}
</style>