<script setup>
import { useDashboardParametersStore } from '../../stores/dashboardParametersStore'
import { getLabel } from '../../constants/ui_labels.js'
import '../../assets/MainContent.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import Slider from '../Slider.vue'
import DropDown from '../DropDown.vue'

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
    </ControlPanel>
       
  </div>
</template>