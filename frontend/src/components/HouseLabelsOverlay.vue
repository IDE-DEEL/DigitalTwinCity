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
defineProps({
  houses: {
    type: Array,
    required: true
  }
});

const TEXT_Y_OFFSET = 0.01;
</script>