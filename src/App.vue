
<template>
  <div class="h-screen flex flex-col font-sans p-3">

    <!-- Topbar -->
    <TopBar class="h-14 flex-shrink-0 shadow-md"/>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Simulation area + Bottom bar -->
      <div class="flex flex-col flex-1 overflow-hidden bg-white p-3">
        <SimulationDisplay class="flex-1 pb-2.5" />
        <BottomBar class="h-20 pt-2.5"/>
      </div>

      <!-- Control Panel -->
       <div class="flex pt-3">
          <ControlPanel class="flex-1 w-[340px] bg-white border border-gray-400 rounded-md overflow-y-auto text-sm" />
       </div>
       
    </div>

  </div>
</template>

<script setup>
import TopBar from './components/TopBar.vue'
import SimulationDisplay from './components/SimulationDisplay.vue'
import ControlPanel from './components/ControlPanel.vue'
import BottomBar from './components/BottomBar.vue'
</script>
