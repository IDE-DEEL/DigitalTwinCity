<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref } from 'vue'
import Slider from './Slider.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { store } from '../store.js'
import '../assets/Button.css'
import '../assets/ControlPanel.css'
</script>

<template>
  <aside>
    <div class="parameter-container">
      <Slider class="slider-area" name="Snelheid" type="speed" v-model="store.speed"></Slider>
      <DropDown class="scenario-area" name="Scenario's" type="scenario" :list="store.scenarios" v-model="store.chosen_scenario"></DropDown>
    </div>

    <Table name="Auto's" type="car_table" :data="store.table_data"></Table>

    <div class="simulation-container">
      <div class="state">
        <Slider class="slider-area" name="Simulatie snelheid"></Slider>
        <div class="button-area">
          <button>Start</button>
          <button>Stop</button>
        </div>
      </div>
    
      <div class="block text-sm font-semibold mb-1 stats-box">
        <p>Score: {{ store.score }}</p>
        <p>Tijd: {{ store.time }}</p>
      </div>
    </div>
  </aside>
</template>