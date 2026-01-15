<template>
  <div class="flex items-center justify-between gap-4 px-6 py-2 border border-gray-400 rounded-md">
    <!-- Score + Time -->
    <div class="flex gap-4">
      <div class="flex items-center gap-2"><span>Score:</span><span>0</span></div>
      <div class="flex items-center gap-2"><span>Tijd:</span><span>00:00</span></div>
    </div>
    <!-- Start + Stop-->
    <div class="flex gap-2 p-8">
      <button 
        @click="handleStart"
        :disabled="isSimulating"
        :class="[
          'rounded-sm w-24 h-10 transition-colors',
          isSimulating 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-sky-200 hover:bg-sky-700'
        ]"
      >
        Start
      </button>
     <button 
        @click="handleStop"
        :disabled="!isSimulating"
        :class="[
          'rounded-sm w-24 h-10 transition-colors',
          !isSimulating 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-red-200 hover:bg-red-700'
        ]"
      >
        Stop
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMqttVehicle } from '../composables/MqttConnection';

const{ isSimulating, startSimulation, stopSimulation } = useMqttVehicle();

const handleStart = () => {
  // NOTE: kan eventueel later ook timer + score bijghouden worden hier
  startSimulation();
  console.log('Simulation gestart');
}

const handleStop = () => {
  stopSimulation();
  console.log('Simulation gestopt');
}

// eventueel later nog iets bij onMounted doen, bijv cleanup van timer of score
// onMounted(() => {
//   
// });
</script>
