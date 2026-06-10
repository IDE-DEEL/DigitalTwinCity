<script setup>
import { ref, computed, watch } from 'vue'
import { useMapStore, useDashboardParametersStore, useSimulationStateStore } from '../../stores'
import { getLabel } from '../../constants/ui_labels.js'
import { SIMULATION_SPEED_OPTIONS } from '../../constants/constants.js'
import { useDigitalSimulation } from '../../composables/useDigitalSimulation.js'
import { MAP_COLUMNS, MAP_ROWS } from '../../constants/constants.js'
import { useCarColors } from '../../composables/useCarColors.js'
import { buildLane } from '../../logic/service/laneBuilder.js';
import { normalizeDegree } from '../../logic/utils/rotation.js';
import { Slider, DropDown, RadioGroup, SimulationTable, WebSocketStatus, RoutePolyline, Car } from '../CustomComponents.js'
import { ControlPanel, SimulationDisplay, SimulationStatsModal, HouseLabelsOverlay } from '../AreaComponents.js'
import { devTileCoordinateOverlay, devLaneDebugOverlay, devHouseDetectionZonesOverlay, devRouteBuilder } from '../../development/DevtoolComponents.js'
import '../../assets/MainContent.css'
import '../../assets/SimulationPage.css'

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
    autoOpenStatsModal,
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

watch(
    () => autoOpenStatsModal.value,
    (newValue) => {
        if (newValue) {
            isStatsModalOpen.value = true;
            autoOpenStatsModal.value = false;
        }
    }
);

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

            <!-- Car sprites -->
            <template #car>
                <Car
                    v-for="car in simulationStore.agentState"
                    :key="`car-${car.id}`"
                    :car="car"
                    :bodyColor="getColorForCarAndRoute(car.id)"
                    :cargoCount="car.packages_in_cargo.length"
                    :title="`Car ${car.id} - ${car.packages_in_cargo.length} packages`"
                    :factorX="MAP_COLUMNS"
                    :factorY="MAP_ROWS"
                    :isDigitalTwin="false"
                />
            </template>

            <!-- SVG overlays -->
            <template #svg-overlays>
                <svg 
                    class="svg-defaults"
                    :viewBox="`0 0 ${MAP_COLUMNS} ${MAP_ROWS}`"
                    :preserveAspectRatio="`none`"
                >

                    <!-- Route polyline -->
                    <RoutePolyline
                        v-for="car in dashboardStore.selectedCarsWithRoutes"
                        :key="`route-${car.id}`"
                        :waypoints="car.routeWaypoints"
                        :stroke="getColorForCarAndRoute(car.id)"
                    />

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
                    :disabled="isSimulating"
                    type="speed" 
                    v-model="dashboardStore.carTargetSpeed"
                ></Slider>
                <DropDown 
                    class="scenario-area" 
                    :name="getLabel('scenario')"
                    :disabled="isSimulating"
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
                    :disabled="isSimulating"
                    :headers="[
                        getLabel('carId'),
                        getLabel('packages'),
                        getLabel('route'),
                        getLabel('route_visibility')
                    ]"
                    @toggle-route-visibility="dashboardStore.toggleCarRouteVisibility"
                ></SimulationTable>
            </template>

            <template #simulation-statistics>
                <RadioGroup 
                    class="radio-group-area" 
                    :name="getLabel('simulationSpeed')" 
                    :list="SIMULATION_SPEED_OPTIONS" 
                    v-model="dashboardStore.simulationSpeed"
                ></RadioGroup>
            </template>

            <!-- Simulation speed, start and stop controls + stats modal open button -->
            <template #simulation-controls>
                <div class="stats-button-container">
                    <button @click="handleStatsOpen" :disabled="!hasSimulated"> {{ getLabel('statisticsButton') }} </button>
                </div>


                <div class="button-area">
                    <button @click="handleSimulationStart" :disabled="isSimulating"> {{ getLabel('startButton') }} </button>
                    <button @click="handleSimulationStop" :disabled="!isSimulating"> {{ getLabel('stopButton') }} </button>
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