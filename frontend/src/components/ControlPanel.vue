<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref, computed } from 'vue'
import Slider from './Slider.vue'
import Input from './Input.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { useDigitalTwinStore } from '../stores/digital-twin.js'
import '../assets/Button.css'
import '../assets/ControlPanel.css'

const timer = ref(null)
const elapsedTime = ref(0) // Time in milliseconds
const store = useDigitalTwinStore()

function start(event) {
  if (!store.active) {
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
      <!-- Slot voor de bovenste parameters -->
      <slot name="parameters">
        <Slider class="slider-area" 
                name="Auto snelheid" 
                type="speed" 
                v-model="store.speed" 
                min=0 
                max=100 
                @change="store.sendData('speed', store.speed)">
        </Slider>
        
        <DropDown class="scenario-area" 
                  name="Scenario's" 
                  type="scenario" 
                  :list="store.scenarios" 
                  v-model="store.chosen_scenario"
                  @change="store.sendData('scenario', store.chosen_scenario)">
        </DropDown>
      </slot>
    </div>

    <Table></Table>

    <div class="simulation-container">
      <div class="state">
        <!-- Slot voor de simulatie controls (slider + buttons) -->
        <slot name="simulation-controls">
          <div class="timer-area">
            <!-- Deze nieuwe div houdt de twee knoppen netjes naast elkaar -->
            <div class="timer-button-row">
              <button class="timer-button" @click="start">Start</button>
              <button class="timer-button" @click="stop">Stop</button>
            </div>
            <!-- De tijd komt hier nu automatisch strak onder te staan -->
            <p>Tijd: {{ formattedTime }}</p>
          </div>

          <div class="score-area">
            <button class="statistics-button">Statistieken</button>
            <p>Score: {{ store.score }}%</p>
          </div>
        </slot>
      </div>
    </div>
  </aside>
</template>