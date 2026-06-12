<template>
  <svg
    class="svg-defaults"
    :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
    preserveAspectRatio="none"
  >
    <polyline
      v-for="lane in lanes"
      :key="lane.id"
      :points="lane.points.map((p) => `${p.x},${p.y}`).join(' ')"
      fill="none"
      stroke="blue"
      stroke-width="0.02"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <circle
      v-for="point in laneDebugPoints"
      :key="point.id"
      :cx="point.x"
      :cy="point.y"
      r="0.035"
      fill="red"
    />

    <text
      v-for="point in laneDebugPoints"
      :key="`label-${point.id}`"
      :x="point.x - 0.02"
      :y="point.y + 0.03"
      font-size="0.08"
      fill="black"
    >
      {{ point.index }}
    </text>
  </svg>
</template>

<script setup>
import { computed } from "vue";
import { MAP_COLUMNS, MAP_ROWS } from "../constants/constants";

const props = defineProps({
    lanes: {
        type: Array,
        required: true,
    },
});

const laneDebugPoints = computed(() => {
    const points = [];

    for (const lane of props.lanes) {
        lane.points.forEach((point, index) => {
            points.push({
                id: `${lane.id}-${index}`,
                x: point.x,
                y: point.y,
                laneId: lane.id,
                index,
                from: lane.from,
                to: lane.to,
                tileX: lane.x,
                tileY: lane.y,
                tileType: lane.type,
            });
        });
    }

    return points;
});
</script>
