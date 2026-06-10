<script setup>
import '../../assets/MainContent.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
import VisualizePanel from '../VisualizePanel.vue'
import { onMounted} from 'vue'
import { useDigitalTwinStore} from '../../stores/digital-twin.js'

const store = useDigitalTwinStore()

onMounted(() => {
  store.connect()
})
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Visualize Panel -->
    <VisualizePanel class="visualize-panel" />

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field" />

    <!-- Control Panel -->
    <ControlPanel class="control-panel" />
       
  </div>
</template>