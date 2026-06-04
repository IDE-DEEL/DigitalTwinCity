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

const dashboardStore = useDashboardParametersStore()
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field" />

    <!-- Control Panel -->
    <ControlPanel class="control-panel">
        <template #parameters>
            <Slider class="slider-area" :name="getLabel('carSpeed')" type="speed" v-model="dashboardStore.carTargetSpeed"></Slider>
            <DropDown class="scenario-area" :name="getLabel('scenario')" type="scenario" :list="dashboardStore.scenarioOptions" v-model="dashboardStore.scenario"></DropDown>
        </template>

        <template #simulation-controls>
            <RadioGroup class="radio-group-area" :name="getLabel('simulationSpeed')" :list="SIMULATION_SPEED_OPTIONS" v-model="dashboardStore.simulationSpeed"></RadioGroup>
            <div class="button-area">
                <button @click="handleStart"> {{ getLabel('startButton') }} </button>
                <button @click="handleStop"> {{ getLabel('stopButton') }} </button>
            </div>
        </template>
    </ControlPanel>
       
  </div>
</template>