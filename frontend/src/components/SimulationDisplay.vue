<template>
  <div class="w-full">
    <div class="border border-gray-400 rounded-lg w-full h-full bg-white flex items-center justify-center overflow-hidden">
        <!-- Map Container -->
        <div class="relative" :style="containerStyle">
            <div class="absolute top-2 right-2 z-40">
                <button
                    type="button"
                    class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                    @click="toggleLaneDebug"
                    >
                    {{ showDevLaneDebug ? 'Hide lane debug' : 'Show lane debug' }}
                </button>

                <button
                    type="button"
                    class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                    @click="toggleTileCoordDebug"
                >
                    {{ showDevTileCoordDebug ? 'Hide tile coords' : 'Show tile coords' }}
                </button>
            </div>

            <!-- Map grid -->
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

                <devTileCoordinateOverlay
                    v-if="showDevTileCoordDebug"
                    :map-columns="MAP_COLUMNS"
                    :map-rows="MAP_ROWS"
                    :map-data="mapData"
                />
            </div> 
            <!-- Lanes (kleur kan later worden weggehaald)-->
            <svg 
                class="absolute inset-0 pointer-events-none"
                :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
                :preserveAspectRatio="`none`"
            >
                <polyline
                    v-for="lane in lanes"
                    :key="lane.id"
                    :points="lane.points.map(p => `${p.x},${p.y}`).join(' ')"
                    fill="none"
                    stroke="blue"
                    stroke-width="0.00"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />

                <devLaneDebugOverlay
                    v-if="showDevLaneDebug"
                    :lanes="lanes"
                    :map-columns="MAP_COLUMNS"
                    :map-rows="MAP_ROWS"
                />
            </svg>
            <!-- Auto -->
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
import { initRfidMapper } from '../logic/service/rfidTagMapper.js';
import devLaneDebugOverlay from '../development/devLaneDebugOverlay.vue';
import devTileCoordinateOverlay from '../development/devTileCoordinateOverlay.vue';

const { vehiclePosition,setupMqttClient } = useMqttVehicle();
const mapData = ref([]); 
const componentDefinitions = ref({}); 
const isLoading = ref(true);

// --- lane debug devtool start ---
const showDevLaneDebug = ref(false);

const toggleLaneDebug = () => {
    showDevLaneDebug.value = !showDevLaneDebug.value;
};
// --- lane debug devtool end ---

// --- tile coordinate devtool start ---
const showDevTileCoordDebug = ref(false);

const toggleTileCoordDebug = () => {
    showDevTileCoordDebug.value = !showDevTileCoordDebug.value;
};
// --- tile coordinate devtool end ---

// const mapGrid = ref(null); 
const MAP_DIMENSION = 5;
// TODO: move to constants file
const MAP_COLUMNS = 5;
const MAP_ROWS = 4;
const MAX_MAP_SCALE = 70;

// container style
const containerStyle = computed(() => {
    return {
        maxHeight: '100%',
        aspectRatio: `${MAP_COLUMNS} / ${MAP_ROWS}`,
        position: 'relative',
    };
});

// vehicle style
const vehicleStyle = computed(() => {
    const xPercent = (vehiclePosition.value.x / MAP_DIMENSION) * 100;
    const yPercent = (vehiclePosition.value.y / MAP_DIMENSION) * 100;
    const vehicleSize = '12px';

    return {
        width: vehicleSize, 
        height: vehicleSize,
        left: `calc(${xPercent}% - ${parseInt(vehicleSize)/2}px)`,
        top: `calc(${yPercent}% - ${parseInt(vehicleSize)/2}px)`,
        transform: `rotate(${vehiclePosition.value.rotation}deg)`,
        transition: 'all 0.5s linear'
    };
});


// gridstyle
const gridStyle = computed(() => {
    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${MAP_COLUMNS}, 1fr)`,
        gridTemplateRows: `repeat(${MAP_ROWS}, 1fr)`,
        width: '100%',
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
    // setupMqttClient();
    try {
        const data = await fetchMapData(); 
        mapData.value = data.mapData;
        componentDefinitions.value = data.componentDefinitions;
        
        // Initialize the RFID mapper with loaded data
        initRfidMapper(data.mapData, data.rfidData);
    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

</script>
