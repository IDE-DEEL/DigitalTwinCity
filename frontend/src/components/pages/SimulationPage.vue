<script setup>
import { ref } from 'vue'
import { useDashboardParametersStore } from '../../stores/dashboardParametersStore'
import { getLabel } from '../../constants/ui_labels.js'
import { SIMULATION_SPEED_OPTIONS } from '../../constants/constants.js'
import { useDigitalSimulation } from '../../composables/useDigitalSimulation.js'
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

// Environenment check
const isDevelopment = import.meta.env.DEV;

// Stores and composables
const dashboardStore = useDashboardParametersStore()

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

// Refs and constants
const reconnectCooldown = ref(false);
const isStatsModalOpen = ref(false);

const MAX_PACKAGES = 10
const MIN_PACKAGES = 1

// Button handlers
const handleReconnect = () => {
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

const handleStart = () => {
    console.log('Requested simulation start with parameters: ', dashboardStore.collectParameters());
    validateHousesReachability();
    startSimulation();
}

const handleStop = () => {
    stopSimulation();
}

const handleStats = () => {
    isStatsModalOpen.value = true;
}

</script>

<template>
  <!-- Main area -->
    <div class="main-content">

        <div v-if="isDevelopment" class="devtool-container">
            <!-- Developer tool buttons (only in development mode) -->
            <button
                type="button"
                @click="toggleLaneDebug"
                >
                {{ showDevLaneDebug ? 'Hide lane overlay' : 'Show lane overlay' }}
            </button>

            <button
                type="button"
                @click="toggleTileCoordDebug"
            >
                {{ showDevTileCoordDebug ? 'Hide tile coords overlay' : 'Show tile coords overlay' }}
            </button>

            <button
                type="button"
                @click="toggleRouteBuilder"
            >
                {{ showDevRouteBuilder ? 'Hide route builder' : 'Show route builder' }}
            </button>

            <button
                type="button"
                @click="toggleHouseDetectionZones"
            >
                {{ showDevHouseDetectionZones ? 'Hide house zones' : 'Show house zones' }}
            </button>
        </div>

        <!-- Simulation area + Bottom bar -->
        <SimulationDisplay class="display-field">
        </SimulationDisplay>

        <!-- Control Panel -->
        <ControlPanel class="control-panel">
            <template #websocket-status>
                <WebSocketStatus 
                    :is-connected="isWebSocketConnected"
                    :reconnect-cooldown="reconnectCooldown"
                    @reconnect="handleReconnect"
                ></WebSocketStatus>
            </template>

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

            <template #simulation-controls>
                <RadioGroup 
                    class="radio-group-area" 
                    :name="getLabel('simulationSpeed')" 
                    :list="SIMULATION_SPEED_OPTIONS" 
                    v-model="dashboardStore.simulationSpeed"
                ></RadioGroup>

                <div class="stats-button-container">
                    <button @click="handleStats"> {{ getLabel('statisticsButton') }} </button>
                </div>


                <div class="button-area">
                    <button @click="handleStart"> {{ getLabel('startButton') }} </button>
                    <button @click="handleStop"> {{ getLabel('stopButton') }} </button>
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