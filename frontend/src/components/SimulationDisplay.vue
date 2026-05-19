<template>
  <div class="w-full">
    <div class="border border-gray-400 rounded-lg w-full h-full bg-white flex items-center justify-center overflow-hidden">
        <div v-if="isDevelopment" class="absolute top-6 left-1/2 -translate-x-1/2 z-40">
            <!-- Developer tool buttons (only in development mode) -->
            <button
                type="button"
                class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                @click="toggleLaneDebug"
                >
                {{ showDevLaneDebug ? 'Hide lane overlay' : 'Show lane overlay' }}
            </button>

            <button
                type="button"
                class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                @click="toggleTileCoordDebug"
            >
                {{ showDevTileCoordDebug ? 'Hide tile coords overlay' : 'Show tile coords overlay' }}
            </button>

            <button
                type="button"
                class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                @click="toggleRouteBuilder"
            >
                {{ showDevRouteBuilder ? 'Hide route builder' : 'Show route builder' }}
            </button>

            <button
                type="button"
                class="px-3 py-1 text-sm rounded border border-gray-400 bg-white hover:bg-gray-100"
                @click="toggleHouseDetectionZones"
            >
                {{ showDevHouseDetectionZones ? 'Hide house zones' : 'Show house zones' }}
            </button>
        </div>

        <!-- Map Container -->
        <div class="relative" :style="containerStyle">
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
                />
            </div> 
            <!-- Lanes -->
            <svg 
                class="absolute inset-0 pointer-events-none"
                :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
                :preserveAspectRatio="`none`"
            >

                <!-- Route polyline -->
                <polyline
                    v-for="car in dashboardStore.selectedCarsWithRoutes"
                    :key="`route-${car.id}`"
                    :points="car.routeWaypoints.map(p => `${p.x},${p.y}`).join(' ')"
                    fill="none"
                    :stroke="getColorForCarAndRoute(car.id)"
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

                <devLaneDebugOverlay
                    v-if="showDevLaneDebug"
                    :lanes="lanes"
                />

                <devHouseDetectionZonesOverlay
                    v-if="showDevHouseDetectionZones"
                    :scenario="dashboardStore.scenario"
                />

                <!-- House labels for packages -->
                <HouseLabelsOverlay
                    :houses="simulationStore.housesWithLivePackageData"
                />
            </svg>

            <devRouteBuilder
                v-model:isActive="showDevRouteBuilder"
            />

            <!-- Auto (digital simulation) -->
            <div
                v-for="agent in simulationStore.agentState"
                :key="`agent-${agent.id}`"
                class="absolute bg-black z-10 border-2"
                :style="agentVehicleStyle(agent)"
                :title="`Agent ${agent.id} - Packages in cargo: ${agent.packages_in_cargo.length}`"
            >
                <span 
                    class="flex items-center justify-center text-white text-xs font-bold" 
                    :style="{ transform: `rotate(${-((agent.heading_deg || 0) - 90)}deg)`,
                                textShadow: `
                                    -1px -1px 0 black,
                                    1px -1px 0 black,
                                    -1px  1px 0 black,
                                    1px  1px 0 black
                                `
                     }"
                    >
                    {{ agent.packages_in_cargo.length }}
                </span>
            </div>

            <!-- Auto (MQTT)-->
                <!-- <div
                    id="live-vehicle"
                    class="absolute bg-black rounded-full z-10"
                    :style="vehicleStyle"
                >
                </div> -->
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
import { useMapStore, useDashboardParametersStore, useSimulationStateStore } from '../stores';
import { useDigitalSimulation } from '../composables/useDigitalSimulation.js';
import { useCarColors } from '../composables/useCarColors.js';
import { MAP_COLUMNS, MAP_ROWS, CAR_ROUTE_COLORS } from '../constants/constants.js';
import HouseLabelsOverlay from './HouseLabelsOverlay.vue';
import devLaneDebugOverlay from '../development/devLaneDebugOverlay.vue';
import devTileCoordinateOverlay from '../development/devTileCoordinateOverlay.vue';
import devRouteBuilder from '../development/devRouteBuilder.vue';
import devHouseDetectionZonesOverlay from '../development/devHouseDetectionZonesOverlay.vue';

const isDevelopment = import.meta.env.DEV;

const componentDefinitions = ref({}); 
const isLoading = ref(true);

const { vehiclePosition,setupMqttClient } = useMqttVehicle();

// Stores
const mapstore = useMapStore();
const dashboardStore = useDashboardParametersStore();
const simulationStore = useSimulationStateStore();

// Composables
const { getColorForCarAndRoute } = useCarColors();

// Initialize digital simulation lifecycle management
useDigitalSimulation();

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

// --- route builder devtool start ---
const showDevRouteBuilder = ref(false);

const toggleRouteBuilder = () => {
    showDevRouteBuilder.value = !showDevRouteBuilder.value;
};
// --- route builder devtool end ---

// --- house detection zones devtool start ---
const showDevHouseDetectionZones = ref(false);

const toggleHouseDetectionZones = () => {
    showDevHouseDetectionZones.value = !showDevHouseDetectionZones.value;
};
// --- house detection zones devtool end ---

// container style
const containerStyle = computed(() => {
    return {
        maxHeight: '100%',
        aspectRatio: `${MAP_COLUMNS} / ${MAP_ROWS}`,
        position: 'relative',
    };
});

// vehicle style - now for simulated agents
const agentVehicleStyle = (agent) => {
    if (!agent || !agent.position) return {};
    
    const xPercent = (agent.position[0] / MAP_COLUMNS) * 100;
    const yPercent = (agent.position[1] / MAP_ROWS) * 100;
    const width = '36px';
    const height = '18px';

    const rotation = (agent.heading_deg || 0) - 90;

    return {
        width: width, 
        height: height,
        left: `calc(${xPercent}% - ${parseInt(width)/2}px)`,
        top: `calc(${yPercent}% - ${parseInt(height)/2}px)`,
        background: getColorForCarAndRoute(agent.id),
        borderRadius: '2px',
        transform: `rotate(${rotation}deg)`
    };
};

// // vehicle style - MQTT
// const vehicleStyle = computed(() => {
//     const xPercent = (vehiclePosition.value.x / MAP_DIMENSION) * 100;
//     const yPercent = (vehiclePosition.value.y / MAP_DIMENSION) * 100;
//     const vehicleSize = '12px';

//     return {
//         width: vehicleSize, 
//         height: vehicleSize,
//         left: `calc(${xPercent}% - ${parseInt(vehicleSize)/2}px)`,
//         top: `calc(${yPercent}% - ${parseInt(vehicleSize)/2}px)`,
//         transform: `rotate(${vehiclePosition.value.rotation}deg)`,
//         transition: 'all 0.5s linear'
//     };
// });


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
    return mapstore.mapData.map(item => {
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
    return mapstore.mapData.map(item => ({
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
        componentDefinitions.value = data.componentDefinitions;

        mapstore.setMapData(data.mapData);
        
        // Initialize the RFID mapper with loaded data
        initRfidMapper(data.mapData, data.rfidData);

    } catch (error) {
        console.error("Fout bij het laden:", error);
    } finally {
        isLoading.value = false;
    }
});

</script>
