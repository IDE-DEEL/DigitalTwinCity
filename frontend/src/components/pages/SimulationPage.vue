<script setup>
import { ref, computed, watch } from 'vue';
import { useSimulationParameterStore, useSimulationStateStore, useLanguageStore, useSimulationWebSocketStore } from '../../stores';
import { SIMULATION_SPEED_OPTIONS, MAP_COLUMNS, MAP_ROWS, MIN_SPEED, MAX_SPEED } from '../../constants/constants.js';
import { useDigitalSimulation } from '../../composables/useDigitalSimulation.js';
import { useCarColors } from '../../composables/useCarColors.js';
import { getLaneLayerForSimulation } from '../../logic/service/laneService.js';
import { Slider, DropDown, RadioGroup, SimulationTable, WebSocketStatus, RoutePolyline, Car, BaseButton, BarChart, Timer } from '../CustomComponents.js';
import { ControlPanel, SimulationDisplay, StatisticsModal, HouseLabelsOverlay, VisualizePanel, SimulationRunStats, TripScore } from '../AreaComponents.js';
import { devTileCoordinateOverlay, devLaneDebugOverlay, devHouseDetectionZonesOverlay, devRouteBuilder, devSensorDebugOverlay } from '../../development/DevtoolComponents.js';
import '../../assets/MainContent.css';

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
const paramStore = useSimulationParameterStore();
const stateStore = useSimulationStateStore();
const langStore = useLanguageStore();
const wsStore = useSimulationWebSocketStore();

const {
    startSimulation,
    stopSimulation,
    reconnectWebSocket,
    exportDataAsCSV,
} = useDigitalSimulation(() => {
    isStatsModalOpen.value = true;
});

const { getColorForCarAndRoute } = useCarColors();

/*
    =====================
    Refs and constants
    =====================
*/
const reconnectCooldown = ref(false);
const isStatsModalOpen = ref(false);

const MAX_PACKAGES = 25;
const MIN_PACKAGES = 1;

/*
    =====================
    Computed properties
    =====================
*/
// Lane data preparation for overlays
const lanes = computed(() => getLaneLayerForSimulation());

// Check if all cars have the inactive route
const allCarsHaveInactiveRoute = computed(() => {
    return paramStore.cars.every(car => car.routeName === 'inactive');
});

/*
    =====================
    Watchers
    =====================
*/
watch(
    () => stateStore.autoOpenStatsModal,
    (newValue) => {
        if (newValue.value) {
            isStatsModalOpen.value = true;
            stateStore.resetAutoOpenStatsModal();
        }
    }
);

/*  
    =====================
    Button handlers
    =====================
*/
const handleWebsocketReconnect = () => {
    if (reconnectCooldown.value) {
        return;
    }
    
    reconnectWebSocket();
    
    reconnectCooldown.value = true;
    const timeInMillis = 5000;
    setTimeout(() => {
        reconnectCooldown.value = false;
    }, timeInMillis);
};

const handleSimulationStart = () => {
    startSimulation();
};

const handleSimulationStop = () => {
    stopSimulation();
};

const handleStatsOpen = () => {
    isStatsModalOpen.value = true;
};

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

// Overlay for visualizing sensor positions
const showDevSensorDebug = ref(false);

const toggleSensorDebug = () => {
    showDevSensorDebug.value = !showDevSensorDebug.value;
};
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

        <div v-if="isDevelopment" class="devtool-container">
            <!-- Developer tool buttons (only in development mode) -->
            <BaseButton :class="{ 'active': showDevLaneDebug }" id="devtool-button" @click="toggleLaneDebug">
                {{ showDevLaneDebug ? 'Hide lane overlay' : 'Show lane overlay' }}
            </BaseButton>

            <BaseButton :class="{ 'active': showDevTileCoordDebug }" id="devtool-button" @click="toggleTileCoordDebug">
                {{ showDevTileCoordDebug ? 'Hide tile coords overlay' : 'Show tile coords overlay' }}
            </BaseButton>

            <BaseButton :class="{ 'active': showDevRouteBuilder }" id="devtool-button" @click="toggleRouteBuilder">
                {{ showDevRouteBuilder ? 'Hide route builder' : 'Show route builder' }}
            </BaseButton>

            <BaseButton :class="{ 'active': showDevHouseDetectionZones }" id="devtool-button" @click="toggleHouseDetectionZones">
                {{ showDevHouseDetectionZones ? 'Hide house zones' : 'Show house zones' }}
            </BaseButton>

            <BaseButton :class="{ 'active': showDevSensorDebug }" id="devtool-button" @click="toggleSensorDebug">
                {{ showDevSensorDebug ? 'Hide sensor debug' : 'Show sensor debug' }}
            </BaseButton>
        </div>

            <!-- Visualize Panel -->
        <VisualizePanel class="visualize-panel" >
            <template #scores>
                <BarChart :scoreData="stateStore.tripScores"></BarChart>
            </template> 
        </VisualizePanel>

        <!-- Simulation area + Bottom bar -->
        <SimulationDisplay class="display-field">
            <!-- Devtool: coordinate picker -->
            <template #map-grid-overlays>
                <devTileCoordinateOverlay v-if="showDevTileCoordDebug"/>
            </template>

            <!-- Car sprites -->
            <template #car>
                <Car
                    v-for="car in stateStore.agentState"
                    :key="`car-${car.id}`"
                    :car="car"
                    :bodyColor="getColorForCarAndRoute(car.id)"
                    :cargoCount="car.packages_in_cargo.length"
                    :title="`Car ${car.id} - ${car.packages_in_cargo.length} packages`"
                    :factorX="MAP_COLUMNS"
                    :factorY="MAP_ROWS"
                    variant="simulation"
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
                        v-for="car in paramStore.selectedCarsWithRoutes"
                        :key="`route-${car.id}`"
                        :waypoints="car.routeWaypoints"
                        :stroke="getColorForCarAndRoute(car.id)"
                    />

                    <!-- Devtool: lane debug -->
                    <devLaneDebugOverlay v-if="showDevLaneDebug" :lanes="lanes"/>

                    <!-- Devtool: house detection zones -->
                    <devHouseDetectionZonesOverlay v-if="showDevHouseDetectionZones" :scenario="paramStore.scenario"/>

                    <!-- Devtool: sensor debug -->
                    <devSensorDebugOverlay v-if="showDevSensorDebug" :agents="stateStore.agentState"/>

                    <!-- House labels for packages -->
                    <HouseLabelsOverlay :houses="stateStore.housesWithLivePackageData"/>
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
                    :is-connected="wsStore.isConnected"
                    :reconnect-cooldown="reconnectCooldown"
                    @reconnect="handleWebsocketReconnect"
                ></WebSocketStatus>
            </template>

            <!-- Car speed and scenario controls -->
            <template #parameters>
                <Slider 
                    class="slider-area" 
                    :name="langStore.getLabel('parameters.carSpeed')"
                    :disabled="stateStore.isSimulating"
                    :min="MIN_SPEED"
                    :max="MAX_SPEED"
                    type="speed" 
                    v-model="paramStore.carTargetSpeed"
                ></Slider>
                <DropDown 
                    class="scenario-area" 
                    :name="langStore.getLabel('parameters.scenario')"
                    :disabled="stateStore.isSimulating"
                    type="scenario" 
                    :list="paramStore.scenarioOptions" 
                    v-model="paramStore.scenario"
                ></DropDown>
            </template>

            <!-- Car table -->
            <template #car-table>
                <SimulationTable 
                    v-model="paramStore.cars" 
                    :max-packages="MAX_PACKAGES" 
                    :min-packages="MIN_PACKAGES" 
                    :route-options="paramStore.routeOptions"
                    :name="langStore.getLabel('carTable.header')"
                    :live-agents="stateStore.agentState"
                    :disabled="stateStore.isSimulating"
                    :headers="[
                        langStore.getLabel('carTable.carId'),
                        langStore.getLabel('carTable.energy'),
                        langStore.getLabel('carTable.packages'),
                        langStore.getLabel('carTable.route'),
                        langStore.getLabel('carTable.routeVisibility')
                    ]"
                    @toggle-route-visibility="paramStore.toggleCarRouteVisibility"
                ></SimulationTable>
            </template>

            <template #simulation-speed>
                <RadioGroup 
                    class="radio-group-area" 
                    :name="langStore.getLabel('controls.simulationSpeed')" 
                    :list="SIMULATION_SPEED_OPTIONS" 
                    v-model="paramStore.simulationSpeed"
                ></RadioGroup>
            </template>

            <template #statistics-button>
                <!-- <div class="stats-button-container"> -->
                    <BaseButton @click="handleStatsOpen" variant="statistics"> {{ langStore.getLabel('generalStats.title') }} </BaseButton>
                <!-- </div> -->
            </template>

            <!-- Simulation speed, start and stop controls + stats modal open button -->
            <template #simulation-controls>
                <Timer
                    :isActive="stateStore.isSimulating"
                    :showResetButton="false"
                    :resetOnStart="true"
                    :startDisabled="allCarsHaveInactiveRoute || !wsStore.isConnected"
                    :stopDisabled="!stateStore.isSimulating"
                    variant="simulation"
                    @start="handleSimulationStart"
                    @stop="handleSimulationStop"
                />
            </template>
        </ControlPanel>

        <!-- Stats Modal -->
        <StatisticsModal
            :isOpen="isStatsModalOpen"
            :title="langStore.getLabel('simStats.title')"
            @close="isStatsModalOpen = false"
        >
            <template #concerns-statistics>
                <TripScore :scores="stateStore.tripScores" :disabled="!stateStore.hasSimulated"/>
            </template>
            <template #run-statistics>
                <SimulationRunStats
                    :simulationStats="stateStore.simulationStats"
                    :exportDataAsCSV="exportDataAsCSV"
                />
            </template>
        </StatisticsModal>
       
    </div>
</template>

<style scoped>
.devtool-container {
  position: absolute;
  top: 2.5%;
  left: 21%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  gap: 10px;
  align-items: center;
}

#devtool-button {
    font-size: var(--text-sm);
    padding: 5px;
    background: var(--color-primary-blue);
    border: black 2px solid;
}

#devtool-button:hover {
    background: var(--color-primary-blue-hover);
}

#devtool-button.active {
    background: var(--color-button-active);
}
</style>