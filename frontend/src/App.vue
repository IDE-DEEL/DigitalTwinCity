
<template>
  <div class="h-screen flex flex-col font-sans p-3">

    <!-- Topbar -->
    <TopBar class="h-14 flex-shrink-0 shadow-md"/>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Simulation area + Bottom bar -->
      <div class="flex flex-col flex-1 overflow-hidden bg-white p-3 pb-0 pl-0">
        <SimulationDisplay class="flex-1 min-h-0" />
      </div>

      <!-- Control Panel -->
       <div class="flex pt-3">
          <ControlPanel 
            class="flex-1 bg-white border border-gray-400 rounded-md overflow-y-auto text-sm"
            @open-stats="showStatsModal = true"
          />
       </div>
       
    </div>

    <!-- Stats Modal -->
    <SimulationStatsModal
      :isOpen="showStatsModal"
      :getStats="getStats"
      :exportDataAsCSV="exportDataAsCSV"
      @close="showStatsModal = false"
    />

  </div>
</template>

<script setup>
import { ref } from 'vue'
import TopBar from './components/TopBar.vue'
import SimulationDisplay from './components/SimulationDisplay.vue'
import ControlPanel from './components/ControlPanel.vue'
import SimulationStatsModal from './components/SimulationStatsModal.vue'
import { useDigitalSimulation } from './composables/useDigitalSimulation'

const showStatsModal = ref(false)
const { getStats, exportDataAsCSV } = useDigitalSimulation()
</script>
