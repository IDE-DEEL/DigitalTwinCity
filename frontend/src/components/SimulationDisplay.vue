<template>
  <div class="w-full p-3">
    <div class="border border-gray-400 rounded-lg w-full h-full bg-white flex items-center justify-center overflow-hidden">
        <div class="relative" :style="gridStyle">
            <div class="map-grid" :style="gridStyle"> 
                <div
                    v-for="component in mapComponents"
                    :key="component.key"
                    class="component-cell"
                    :style="getComponentPosition(component)">

                    <img 
                    :src="component.imagePath"
                    :alt="component.label"
                    class="w-full h-full object-contain"
                    :style="{ transform:`rotate(${component.rotation}deg)`}"
                    />
                </div>
            </div> 
            <svg 
                class="absolute inset-0 pointer-events-none"
                :viewBox="`0 0 ${MAP_DIMENSION} ${MAP_DIMENSION}`"
                :preserveAspectRatio="`none`"
            >
                <polyline
                    v-for="lane in lanes"
                    :key="lane.id"
                    :points="lane.points.map(p => `${p.x},${p.y}`).join(' ')"
                    fill="none"
                    stroke="blue"
                    stroke-width="0.05"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>
    </div> 
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchMapData } from '../logic/service/mapService.js'; 
import { buildLane } from '../logic/service/laneBuilder.js';

const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true); 
const mapGrid = ref(null);

onMounted(async () => {
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
        mapGrid.value = createMapGrid(data.mapData, data.componentDefinitions, MAP_DIMENSIONS);

        // TODO: websocket verbinding maken naar python backend

    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

const { mapComponents, gridStyle, getComponentPosition } = mapRenderer(
    mapData,
    componentDefinitions
);

const lanePositions = computed(() => {
    return mapData.value.map(item => ({
        id: `${item.x}-${item.y}`,
        type: item.type,
        rotation: normalizeDegree(item.rotation || 0),
        position: { x: item.x, y: item.y },
    }));
})

const lanes = computed(() => buildLane(lanePositions.value));

const getComponentPosition = (component) => {
    return {
        gridColumnStart: component.x + 1, 
        gridRowStart: component.y + 1,
    };
};
</script>
