<script setup>
import { computed } from 'vue';

const props = defineProps({ 
    waypoints: Array,
    stroke: String
});

const pointsString = computed(() => {
    if (!props.waypoints || !Array.isArray(props.waypoints)) {
        return ''; // Return an empty string if waypoints don't exist (e.g., 'inactive' route)
    }
    return props.waypoints.map(point => `${point.x},${point.y}`).join(' ');
});
</script>

<template>
  <polyline
    :points="pointsString"
    fill="none"
    :stroke="stroke"
    stroke-width="0.01"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-dasharray="0.06 0.04"
  >
    <animate
      attributeName="stroke-dashoffset"
      from="0"
      to="-0.10"
      dur="1.8s"
      repeatCount="indefinite"
    />
  </polyline>
</template>
