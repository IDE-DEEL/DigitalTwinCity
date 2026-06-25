<script setup>
import { ref, computed } from 'vue'
import { BaseButton } from './CustomComponents.js'
import { useLanguageStore } from '../stores/index.js'

const props = defineProps({
  store: { type: Object, required: true }
})

const timer = ref(null)
const elapsedTime = ref(0)
const langStore = useLanguageStore()

function start() {
  if (!props.store.active) {
    props.store.sendData('activation', true)
    props.store.sendData('car_packages', )
    props.store.active = true

    if (props.store.active) {
      elapsedTime.value = 0
      const startTime = Date.now() - elapsedTime.value

      timer.value = setInterval(() => {
        elapsedTime.value = Date.now() - startTime
      }, 10)
    }
  }
}

function stop() {
  if (props.store.active) {
    props.store.sendData('activation', false)
    props.store.active = false
    clearInterval(timer.value)
  }
}

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
  <div class="timer-area">
    <div class="timer-button-row">
      <BaseButton variant="timer" @click="start">
        {{ langStore.getLabel('controls.startButton') }}
      </BaseButton>
      <BaseButton variant="timer" @click="stop">
        {{ langStore.getLabel('controls.stopButton') }}
      </BaseButton>
    </div>
    <p>{{ langStore.getLabel('generalStats.time') }}: {{ formattedTime }}</p>
  </div>
</template>