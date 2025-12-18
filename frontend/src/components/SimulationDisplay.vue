<template>
  <div class="w-full p-3">
    <div class="border border-gray-400 rounded-lg w-full h-full bg-white flex items-center justify-center overflow-hidden">
        <div class="relative aspect-square" :style="gridStyle">
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
                <div
                    id="live-vehicle"
                    class="absolute bg-black rounded-full z-10"
                    :style="vehicleStyle"
                >
                </div>
        </div>
    </div> 
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchMapData } from '../logic/service/mapService.js'; 
import { buildLane } from '../logic/service/laneBuilder.js';
import { useMqttVehicle } from '../composables/MqttConnection.js';
import { normalizeDegree } from '../logic/utils/rotation.js';

const { vehiclePosition } = useMqttVehicle();
const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true); 
const mapGrid = ref(null);
const MAX_MAP_SCALE = 70;
const MAP_DIMENSION = 6;

// vehicle style
const vehicleStyle = computed(() => {
    const xPercent = (vehiclePosition.value.x / MAP_DIMENSION) * 100;
    const yPercent = (vehiclePosition.value.y / MAP_DIMENSION) * 100;
    const vehicleSize = '0.9rem';
    const centerCorrection = '50%'; 
    console.log(`Vehicle Position - X: ${vehiclePosition.value.x}, Y: ${vehiclePosition.value.y}, Rotation: ${vehiclePosition.value.rotation}`);

    return {
        width: vehicleSize, 
        height: vehicleSize,
        left: `calc(${xPercent}% - ${vehicleSize} / 2)`,
        top: `calc(${yPercent}% - ${vehicleSize} / 2)`,
        transform: `translate(-${centerCorrection}, -${centerCorrection}) rotate(${vehiclePosition.value.rotation}deg)`,
        transition: 'all 0.5s linear'
    };
});


// gridstyle
const gridStyle = computed(() => {
    const dynamicSize = `${MAX_MAP_SCALE}vmin`; 

    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${MAP_DIMENSION}, 1fr)`,
        gridTemplateRows: `repeat(${MAP_DIMENSION}, 1fr)`,

        width: dynamicSize,
        height: dynamicSize,
    };
});

const mapComponents = computed(() => {
    return mapData.value.map(item => {
        const def = componentDefinitions.value[item.type];
        
        if (!def) return null;

        const rotation = normalizeDegree(item.rotation || 0);

        return {
            key: `${item.x}-${item.y}`, 
            imagePath: def.imagePath,
            label: def.label,
            x: item.x,
            y: item.y,
            rotation: rotation,
        };
    }).filter(c => c !== null);
});

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

onMounted(async () => {
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

</script>
