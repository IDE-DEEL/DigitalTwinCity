<!-- All the elements will be responsive later, for now only visual -->
<script setup>
import { ref, computed } from 'vue'
import Slider from './Slider.vue'
import Input from './Input.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { BaseButton } from './CustomComponents.js'
import { StatisticsModal, TripScore } from './AreaComponents.js'
import { useDigitalTwinStore } from '../stores/digital-twin.js'
import { useLanguageStore } from '../stores/index.js';
import '../assets/Button.css'
import '../assets/ControlPanel.css'

const timer = ref(null)
const elapsedTime = ref(0) // Time in milliseconds
const store = useDigitalTwinStore()
const showModal = ref(false)
const langStore = useLanguageStore();

function start(event) {
  if (!store.active) {
    store.active = true
    store.sendData('activation', true)

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
  if (store.active) {
    store.active = false
    store.sendData('activation', false)
    clearInterval(timer.value)
  }
}

/*function change_car_data(event) {
  store.car_index += 1
  store.car_data = store.car_test_data[store.car_index]
  console.log(store.car_data)
}*/

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
    <slot name="websocket-status"></slot>

    <div class="parameter-container">
      <!-- Slot voor de bovenste parameters -->
      <slot name="parameters">
        <Slider class="slider-area" 
                :name="langStore.getLabel('parameters.carSpeed')"
                type="speed" 
                v-model="store.speed" 
                min=0 
                max=100 
                @change="store.sendData('speed', store.speed)">
        </Slider>
        
        <DropDown class="scenario-area" 
                  :name="langStore.getLabel('parameters.scenario')"
                  type="scenario" 
                  :list="store.scenarios" 
                  v-model="store.chosen_scenario"
                  @change="store.sendData('scenario', store.chosen_scenario)">
        </DropDown>
      </slot>
    </div>

    <!-- Slot for car table -->
    <slot name="car-table">
        <Table></Table>
        <!-- <button @click="change_car_data()"></button> -->
    </slot>

    <slot name="simulation-statistics"></slot>

    <div class="simulation-container">
      <div class="state">
        <!-- Slot voor de simulatie controls (slider + buttons) -->
        <slot name="simulation-controls">
          <div class="timer-area">
            <!-- Deze nieuwe div houdt de twee knoppen netjes naast elkaar -->
            <div class="timer-button-row">
              <BaseButton variant="timer" @click="start">{{ langStore.getLabel('controls.startButton') }}</BaseButton>
              <BaseButton variant="timer" @click="stop">{{ langStore.getLabel('controls.stopButton') }}</BaseButton>
            </div>
            <!-- De tijd komt hier nu automatisch strak onder te staan -->
            <p>{{ langStore.getLabel('generalStats.time') }}: {{ formattedTime }}</p>
          </div>

          <div class="score-area">
            <BaseButton variant="statistics" class="statistics-button" @click="showModal = true"> {{ langStore.getLabel('generalStats.title') }} </BaseButton>
            <p>{{ langStore.getLabel('generalStats.Score') }}: {{ Number(store.results.total).toFixed(1) }}</p>
          </div>
          <StatisticsModal :is-open="showModal" @close="showModal = false" :title="langStore.getLabel('statsModal.twinTitle')">
            <template #concerns-statistics>
                <TripScore/>
            </template>
          </StatisticsModal>
        </slot>
      </div>
    </div>
  </aside>
</template>