<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref, computed } from 'vue'
import Slider from './Slider.vue'
import Input from './Input.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { store, send_data } from '../store.js'
import '../assets/Button.css'
import '../assets/ControlPanel.css'

const timer = ref(null)
const elapsedTime = ref(0) // Time in milliseconds

function start(event) {
  if (!store.active) {
    send_data("activation", "start")
    store.active = true

    if (store.active) {
      elapsedTime.value = 0
      const startTime = Date.now() - elapsedTime.value

      timer.value = setInterval(() => {
        elapsedTime.value = Date.now() - startTime
      }, 10) // Update each 10 milliseconds
    }
  }
}

function stop(event) {
  send_data("activation", "stop")
  store.active = false
  clearInterval(timer.value)
}

// Formatting time (MM:SS:MS)
const formattedTime = computed(() => {
  const totalSeconds = Math.floor(elapsedTime.value / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const milliseconds = Math.floor((elapsedTime.value % 1000) / 10)
  const pad = (num) => String(num).padStart(2, '0')

  return `${pad(minutes)}:${pad(seconds)}:${pad(milliseconds)}`
})

</script>

<template>
  <aside>
    <div class="parameter-container">
      <Slider class="slider-area" name="Auto snelheid" type="speed" v-model="store.speed"></Slider>
      <DropDown class="scenario-area" name="Scenario's" type="scenario" :list="store.scenarios" v-model="store.chosen_scenario"></DropDown>
    </div>

    <Table></Table>

    <div class="simulation-container">
      <div class="state">
        <Slider class="slider-area" name="Simulatie snelheid" v-model="store.sim_speed"></Slider>
        <div class="button-area">
          <button @click="start">Start</button>
          <button @click="stop">Stop</button>
        </div>
      </div>
    
      <div class="block text-sm font-semibold mb-1 stats-box" style="font-variant-numeric: tabular-nums;">
        <p>Score: {{ store.score }}</p>
        <p>Tijd: {{ formattedTime }}</p>
      </div>
    </div>
  </aside>
</template>