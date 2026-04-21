<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref } from 'vue'
import Slider from './Slider.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { store } from '../store.js'
</script>

<template>
  <aside>
    <Slider name="Snelheid" v-model="store.speed"></Slider>
    <DropDown name="Scenario's" :list="store.scenarios" v-model="store.chosen_scenario"></DropDown>
    <Table name="Auto's" :data="store.table_data"></Table>
  </aside>
</template>