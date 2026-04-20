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
    <router-view></router-view>

  </div>
</template>