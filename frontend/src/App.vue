<template>
  <div class="min-h-screen flex flex-col">
    <TopBar />
    <div class="flex flex-1">
      <SimulationDisplay class="flex-1" />
      <ControlPanel />
    </div>
    <BottomBar />
  </div>
</template>

<script>
import TopBar from './components/TopBar.vue'
import ControlPanel from './components/ControlPanel.vue'
import SimulationDisplay from './components/SimulationDisplay.vue'
import BottomBar from './components/BottomBar.vue'

export default {
  name: 'App',
  components: {
    TopBar,
    ControlPanel,
    SimulationDisplay,
    BottomBar
  }
}
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
}
</style>
