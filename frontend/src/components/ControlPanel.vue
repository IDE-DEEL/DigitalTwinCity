<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref } from 'vue'
import Slider from './Slider.vue'
import Input from './Input.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { store, send_data } from '../store.js'
import '../assets/Button.css'
import '../assets/ControlPanel.css'

function start(event) {
  send_data("activation", "start")
}

function stop(event) {
  send_data("activation", "stop")
}
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
    
      <div class="block text-sm font-semibold mb-1 stats-box">
        <p>Score: {{ store.score }}</p>
        <p>Tijd: {{ store.time }}</p>
      </div>
    </div>
  </aside>
</template>