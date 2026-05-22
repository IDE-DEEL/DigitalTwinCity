<script setup>
import '../../assets/MainContent.css'
import ControlPanel from '../ControlPanel.vue'
import SimulationDisplay from '../SimulationDisplay.vue'
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field" />

    <!-- Control Panel -->
    <ControlPanel class="control-panel" />
       
  </div>
</template>