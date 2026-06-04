<script setup>
import { useDashboardParametersStore } from '../../stores/dashboardParametersStore'
import { getLabel } from '../../constants/ui_labels.js'
import { SIMULATION_SPEED_OPTIONS } from '../../constants/constants.js'
import '../../assets/MainContent.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import Slider from '../Slider.vue'
import DropDown from '../DropDown.vue'
import RadioGroup from '../RadioGroup.vue'
import SimulationTable from '../SimulationTable.vue'

const dashboardStore = useDashboardParametersStore()

const MAX_PACKAGES = 10
const MIN_PACKAGES = 1
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field" />

    <!-- Control Panel -->
    <ControlPanel class="control-panel">
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
                :headers="[
                    getLabel('carId'),
                    getLabel('packages'),
                    getLabel('route'),
                    getLabel('route_visibility')
                ]"
            ></SimulationTable>
        </template>

        <template #simulation-controls>
            <RadioGroup 
                class="radio-group-area" 
                :name="getLabel('simulationSpeed')" 
                :list="SIMULATION_SPEED_OPTIONS" 
                v-model="dashboardStore.simulationSpeed"
            ></RadioGroup>
            <div class="button-area">
                <button @click="handleStart"> {{ getLabel('startButton') }} </button>
                <button @click="handleStop"> {{ getLabel('stopButton') }} </button>
            </div>
        </template>
    </ControlPanel>
       
  </div>
</template>