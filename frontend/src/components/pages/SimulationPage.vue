<script setup>
import { ref, computed } from 'vue'
import { useMapStore, useDashboardParametersStore, useSimulationStateStore } from '../../stores'
import { getLabel } from '../../constants/ui_labels.js'
import { SIMULATION_SPEED_OPTIONS } from '../../constants/constants.js'
import { useDigitalSimulation } from '../../composables/useDigitalSimulation.js'
import { MAP_COLUMNS, MAP_ROWS } from '../../constants/constants.js'
import { useCarColors } from '../../composables/useCarColors.js'
import { buildLane } from '../../logic/service/laneBuilder.js';
import { normalizeDegree } from '../../logic/utils/rotation.js';
import '../../assets/MainContent.css'
import '../../assets/SimulationPage.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import Slider from '../Slider.vue'
import DropDown from '../DropDown.vue'
import RadioGroup from '../RadioGroup.vue'
import SimulationTable from '../SimulationTable.vue'
import WebSocketStatus from '../WebSocketStatus.vue'
import SimulationStatsModal from '../SimulationStatsModal.vue'
import devTileCoordinateOverlay from '../../development/devTileCoordinateOverlay.vue'
import devLaneDebugOverlay from '../../development/devLaneDebugOverlay.vue'
import devHouseDetectionZonesOverlay from '../../development/devHouseDetectionZonesOverlay.vue'
import devRouteBuilder from '../../development/devRouteBuilder.vue'
import HouseLabelsOverlay from '../HouseLabelsOverlay.vue'

/*
    =====================
    Development mode flag
    =====================
*/
const isDevelopment = import.meta.env.DEV;

/*
    =====================
    Stores and composables
    =====================
*/
const dashboardStore = useDashboardParametersStore()
const simulationStore = useSimulationStateStore()
const mapStore = useMapStore()

const {
    isWebSocketConnected,
    isSimulating,
    hasSimulated,
    startSimulation,
    stopSimulation,
    reconnectWebSocket,
    validateHousesReachability,
    getStats,
    exportDataAsCSV,
} = useDigitalSimulation();

const { getColorForCarAndRoute } = useCarColors();

/*
    =====================
    Refs and constants
    =====================
*/
const reconnectCooldown = ref(false);
const isStatsModalOpen = ref(false);

const MAX_PACKAGES = 10
const MIN_PACKAGES = 1

/*
    =====================
    Lane data preparation for overlays
    =====================
*/
const lanePositions = computed(() => {
    return mapStore.mapData.map(item => ({
        id: `${item.x}-${item.y}`,
        type: item.type,
        rotation: normalizeDegree(item.rotation || 0),
        position: { x: item.x, y: item.y },
    }));
})

const lanes = computed(() => buildLane(lanePositions.value));

/*  
    =====================
    Button handlers
    =====================
*/
const handleWebsocketReconnect = () => {
    if (reconnectCooldown.value) {
        return;
    }
    
    console.log("Attempting to reconnect WebSocket...");
    reconnectWebSocket();
    
    reconnectCooldown.value = true;
    const timeInMillis = 5000;
    setTimeout(() => {
        reconnectCooldown.value = false;
    }, timeInMillis);
}

const handleSimulationStart = () => {
    console.log('Requested simulation start with parameters: ', dashboardStore.collectParameters());
    validateHousesReachability();
    startSimulation();
}

const handleSimulationStop = () => {
    stopSimulation();
}

const handleStatsOpen = () => {
    isStatsModalOpen.value = true;
}

/*  
    =====================
    Developer tools
    =====================
*/
// Overlay for visualizing coordinates within tiles
const showDevTileCoordDebug = ref(false);

const toggleTileCoordDebug = () => {
    showDevTileCoordDebug.value = !showDevTileCoordDebug.value;
};

// Overlay for visualizing baked in lane coordinates
const showDevLaneDebug = ref(false);

const toggleLaneDebug = () => {
    showDevLaneDebug.value = !showDevLaneDebug.value;
};

// Overlay for visualizing house hitbox zones
const showDevHouseDetectionZones = ref(false);

const toggleHouseDetectionZones = () => {
    showDevHouseDetectionZones.value = !showDevHouseDetectionZones.value;
};

// Overlay tool for building new routes from within the frontend
const showDevRouteBuilder = ref(false);

const toggleRouteBuilder = () => {
    showDevRouteBuilder.value = !showDevRouteBuilder.value;
};
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

        <div v-if="isDevelopment" class="devtool-container">
            <!-- Developer tool buttons (only in development mode) -->
            <button type="button" @click="toggleLaneDebug">
                {{ showDevLaneDebug ? 'Hide lane overlay' : 'Show lane overlay' }}
            </button>

            <button type="button" @click="toggleTileCoordDebug">
                {{ showDevTileCoordDebug ? 'Hide tile coords overlay' : 'Show tile coords overlay' }}
            </button>

            <button type="button" @click="toggleRouteBuilder">
                {{ showDevRouteBuilder ? 'Hide route builder' : 'Show route builder' }}
            </button>

            <button type="button" @click="toggleHouseDetectionZones">
                {{ showDevHouseDetectionZones ? 'Hide house zones' : 'Show house zones' }}
            </button>
        </div>

        <!-- Simulation area + Bottom bar -->
        <SimulationDisplay class="display-field">
            <!-- Devtool: coordinate picker -->
            <template #map-grid-overlays>
                <devTileCoordinateOverlay v-if="showDevTileCoordDebug"/>
            </template>

            <template #svg-overlays>
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

                    <!-- Devtool: lane debug -->
                    <devLaneDebugOverlay v-if="showDevLaneDebug" :lanes="lanes"/>

                    <!-- Devtool: house detection zones -->
                    <devHouseDetectionZonesOverlay v-if="showDevHouseDetectionZones" :scenario="dashboardStore.scenario"/>

                    <!-- House labels for packages -->
                    <HouseLabelsOverlay :houses="simulationStore.housesWithLivePackageData"/>
                </svg>
            </template>

            <!-- Devtool: route builder -->
            <template #route-builder>
                <devRouteBuilder v-model:isActive="showDevRouteBuilder"/>
            </template>
        </SimulationDisplay>

        <!-- Control Panel -->
        <ControlPanel class="control-panel">
            <!-- WebSocket connection status -->
            <template #websocket-status>
                <WebSocketStatus 
                    :is-connected="isWebSocketConnected"
                    :reconnect-cooldown="reconnectCooldown"
                    @reconnect="handleWebsocketReconnect"
                ></WebSocketStatus>
            </template>

            <!-- Car speed and scenario controls -->
            <template #parameters>
                <Slider 
                    class="slider-area" 
                    :name="getLabel('carSpeed')" 
                    type="speed" 
                    v-model="dashboardStore.carTargetSpeed"
                ></Slider>
                <DropDown 
                    class="scenario-area" 
                    :name="getLabel('scenario')" 
                    type="scenario" 
                    :list="dashboardStore.scenarioOptions" 
                    v-model="dashboardStore.scenario"
                ></DropDown>
            </template>

            <!-- Car table -->
            <template #car-table>
                <SimulationTable 
                    v-model="dashboardStore.cars" 
                    :max-packages="MAX_PACKAGES" 
                    :min-packages="MIN_PACKAGES" 
                    :route-options="dashboardStore.routeOptions"
                    :name="getLabel('tableHeader')"
                    :headers="[
                        getLabel('carId'),
                        getLabel('packages'),
                        getLabel('route'),
                        getLabel('route_visibility')
                    ]"
                    @toggle-route-visibility="dashboardStore.toggleCarRouteVisibility"
                ></SimulationTable>
            </template>

            <!-- Simulation speed, start and stop controls + stats modal open button -->
            <template #simulation-controls>
                <RadioGroup 
                    class="radio-group-area" 
                    :name="getLabel('simulationSpeed')" 
                    :list="SIMULATION_SPEED_OPTIONS" 
                    v-model="dashboardStore.simulationSpeed"
                ></RadioGroup>

                <div class="stats-button-container">
                    <button @click="handleStatsOpen"> {{ getLabel('statisticsButton') }} </button>
                </div>


                <div class="button-area">
                    <button @click="handleSimulationStart"> {{ getLabel('startButton') }} </button>
                    <button @click="handleSimulationStop"> {{ getLabel('stopButton') }} </button>
                </div>
            </template>
        </ControlPanel>

        <!-- Stats Modal -->
        <SimulationStatsModal
            :isOpen="isStatsModalOpen"
            :getStats="getStats"
            :exportDataAsCSV="exportDataAsCSV"
            @close="isStatsModalOpen = false"
        />
       
    </div>
</template>