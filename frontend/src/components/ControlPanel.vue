<script setup>
import { ref } from 'vue'
import Slider from './Slider.vue'
import DropDown from './DropDown.vue'
import Table from './Table.vue'
import { BaseButton } from './CustomComponents.js'
import { StatisticsModal, TripScore } from './AreaComponents.js'
import { useLanguageStore } from '../stores/index.js'
import '../assets/ControlPanel.css'

const props = defineProps({
  speed: { type: Number, default: 0 },
  scenarios: { type: Array, default: () => [] },
  chosenScenario: { type: String, default: '' },
  scores: { type: Array, default: () => [] }
})

const emit = defineEmits([
  'update:speed', 
  'update:chosenScenario', 
  'change-speed', 
  'change-scenario'
])

const langStore = useLanguageStore()
const showModal = ref(false)
</script>

<template>
  <aside>
    <slot name="websocket-status"></slot>

    <div class="parameter-container">
      <slot name="parameters">
        <Slider class="slider-area" 
                :name="langStore.getLabel('parameters.carSpeed')"
                type="speed" 
                :modelValue="props.speed" 
                @update:modelValue="emit('update:speed', $event)"
                min="0" 
                max="100" 
                @change="emit('change-speed', $event)">
        </Slider>
        
        <DropDown class="scenario-area" 
                  :name="langStore.getLabel('parameters.scenario')"
                  type="scenario" 
                  :list="props.scenarios" 
                  :modelValue="props.chosenScenario"
                  @update:modelValue="emit('update:chosenScenario', $event)"
                  @change="emit('change-scenario', $event)">
        </DropDown>
      </slot>
    </div>

    <slot name="car-table">
        <Table></Table>
    </slot>

    <slot name="simulation-speed"></slot>

    <div class="simulation-container">
      <div class="state">
          <!-- De score-area kan hieronder blijven staan, of ook in het slot -->
          <div class="score-area">
              <slot name="statistics-button">
                  <BaseButton variant="statistics" class="statistics-button" @click="showModal = true"> 
                    {{ langStore.getLabel('generalStats.title') }} 
                </BaseButton>
            </slot>
        </div>
        
        <!-- Flexibel slot waar de parent de timer in kan schieten -->
        <slot name="simulation-controls">
          <!-- Dit is de fallback-content voor als er niks wordt meegegeven -->
        </slot>
        
        <StatisticsModal :is-open="showModal" @close="showModal = false" :title="langStore.getLabel('statsModal.twinTitle')">
          <template #concerns-statistics>
              <TripScore :scores="scores"/>
          </template>
        </StatisticsModal>
      </div>
    </div>
  </aside>
</template>