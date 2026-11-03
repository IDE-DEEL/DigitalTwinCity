<script setup>
import '../../assets/MainContent.css'
import '../../assets/DigitalTwinPage.css'
import '../../assets/Cars.css'
import ControlPanel from '../advanced/ControlPanel.vue'
import BarChart from '../visualization/BarChart.vue'
import SimulationDisplay from '../advanced/SimulationDisplay.vue'
import SimulationControls from '../advanced/SimulationControls.vue'
import VisualizePanel from '../advanced/VisualizePanel.vue'
import { useDigitalTwinRoutes } from '../../composables/useDigitalTwinRoutes.js'
import { useDigitalTwinCars } from '../../composables/useDigitalTwinCars.js'
import { useDigitalTwinVisuals } from '../../composables/useDigitalTwinVisuals.js'
import { useDigitalTwinPage } from '../../composables/useDigitalTwinPage.js'
import { useDigitalTwinStore } from '../../stores/digital-twin.js'
import TagsVisualizer from '../visualization/TagsVisualizer.vue'

const store = useDigitalTwinStore()
const { tagMap, getRouteTags, generatePath } = useDigitalTwinRoutes(store)
const { carState } = useDigitalTwinCars(store, tagMap, getRouteTags)
const { getStyle, getRotation, getCarColor, darkenColor, selectTag, getPackages, createHousePackagesList } = useDigitalTwinVisuals(store)
const { handleTimerStart, handleTimerStop, handleTimerReset } = useDigitalTwinPage(store)
</script>

<template>
  <!-- Main area -->
    <div class="main-content">

    <!-- Visualize Panel -->
    <VisualizePanel>
        <template #tags>
            <TagsVisualizer></TagsVisualizer>
        </template>
        <template #scores>
          <BarChart :scoreData="store.results">
          </BarChart>
        </template>
    </VisualizePanel>

    <!-- Simulation area + Bottom bar -->
    <SimulationDisplay class="display-field">
      <template #tags>
        <!-- RFID Tags Container -->
          <div 
            v-if="store.show_tags" 
          >
            <div
              v-for="tag in store.tag_positions"
              :key="tag.tag_id"
              class="absolute cursor-pointer rounded-full bg-black flex items-center justify-center"
              :class="{
                'ring-2 ring-offset-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]': store.chosen_tag?.tag_id === tag.tag_id
              }"
              :style="{
                left: (tag.tag_pos.x * store.factor_x) + 'px',
                top: (tag.tag_pos.y * store.factor_y) + 'px',
                width: '14px',
                height: '14px',
                transform: 'translate(-50%, -50%)'
              }"
              @click="selectTag(tag)"
            >
            </div>
          </div>
      </template>
      
      <template #svg-overlays>
        <!-- Routes -->
        <svg class="absolute inset-0 pointer-events-none"
        width=${MAP_DIMENSION} height=${MAP_DIMENSION}
        v-for="car in store.table_data.filter(c => (c.visueel && c.status))">
            <path
                :d="generatePath(car.auto_id, car.route)"
                fill="none"
                :stroke="car.color"
                stroke-width="2" />
        </svg>

        <!-- House labels for packages -->
        <div
          v-for="house in createHousePackagesList()"
          :key="house.tag_id"
          class="house-marker"
          :style="{
            left: `${house.pos.x * store.factor_x}px`,
            top: `${house.pos.y * store.factor_y}px`
          }"
        >
          {{ house.undeliverd_packages }}
        </div>
      </template>
      
      <template #car>
        <div
          v-for="car in Object.values(carState.positions)"
          :key="car.id"
          class="car-sprite"
          :style="getStyle(car)"
        >
          <div
            class="car-heading"
            :style=getRotation(car)
          >
            <div class="car-body" :style="{ backgroundColor: getCarColor(car.id) }">
              <div class="car-window"></div>
              <div class="car-hood" :style="{ backgroundColor: darkenColor(getCarColor(car.id), 30) }"></div>
              <div class="car-headlights">
                <span></span>
                <span></span>
              </div>
            </div>
            <span class="cargo-counter">
              {{ getPackages(car.id) }}
            </span>
          </div>
        </div>
      </template>
    </SimulationDisplay>

    <!-- Control Panel  -->
    <ControlPanel 
      class="control-panel"
      v-model:speed="store.speed"
      :scenarios="store.scenarios"
      v-model:chosenScenario="store.chosen_scenario"
      :scores="store.results"
      @change-speed="store.sendData('speed', store.speed)"
      @change-scenario="store.sendData('scenario', store.chosen_scenario)"
    >
      <template #simulation-controls>
        <SimulationControls
            :isActive="store.active"
            :showResetButton="true"
            :resetOnStart="false"
            variant="digital-twin"
            @start="handleTimerStart"
            @stop="handleTimerStop"
            @reset="handleTimerReset"
        />
      </template>
    </ControlPanel>
       
  </div>
</template>