<script setup>
defineProps({
    agents: {
        type: Array,
        required: true,
    },
});
</script>

<template>
    <g class="sensor-overlay" v-if="agents.length > 0">
        <!-- Left sensors (red) -->
        <g v-for="agent in agents" :key="`sensor-left-${agent.id}`">
        <circle
            :cx="agent.virtual_sensor_left?.x"
            :cy="agent.virtual_sensor_left?.y"
            class="sensor-circle sensor-circle-left"
        />
        <text
            :x="agent.virtual_sensor_left?.x"
            :y="agent.virtual_sensor_left?.y"
            class="sensor-text"
        >
            L
        </text>
        </g>
    
        <!-- Right sensors (blue) -->
        <g v-for="agent in agents" :key="`sensor-right-${agent.id}`">
        <circle
            :cx="agent.virtual_sensor_right?.x"
            :cy="agent.virtual_sensor_right?.y"
            class="sensor-circle sensor-circle-right"

        />
        <text
            :x="agent.virtual_sensor_right?.x"
            :y="agent.virtual_sensor_right?.y"
            class="sensor-text"
        >
            R
        </text>
        </g>
  </g>
</template>

<style scoped>
.sensor-circle {
    opacity: 0.9;
    stroke-width: 0.008;
    r: 0.045px;
}

.sensor-circle-right {
    fill: blue;
    stroke: darkblue;
}

.sensor-circle-left {
    fill: red;
    stroke: darkred;
}

.sensor-text {
    font-size: 0.075px;
    fill: white;
    font-weight: bold;
    pointer-events: none;
    text-anchor: middle;
    dominant-baseline: middle;
}
</style>