<script setup>
import TopBar from './components/TopBar.vue'
import SimulationDisplay from './components/SimulationDisplay.vue'
import ControlPanel from './components/ControlPanel.vue'
import BottomBar from './components/BottomBar.vue'
import './assets/App.css'
</script>

<template>
  <div class="app-container">

    <!-- Topbar -->
    <TopBar class="topbar"/>

    <!-- Main area -->
    <div class="main-content">

      <!-- Simulation area + Bottom bar -->
      <SimulationDisplay class="display-field" />

      <!-- Control Panel -->
      <ControlPanel class="control-panel" />
       
    </div>

  </div>
</template>