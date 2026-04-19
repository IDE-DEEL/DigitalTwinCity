<script setup>
import { ref } from 'vue'
import '../assets/Switch.css'

const isOn = ref(true)

function switchToPage() {
    isOn.value = !isOn.value
}

</script>

<template>
  <div class="switch-container">
    <button 
      class="switch-button switch-button-left" 
      :class="{ 'is-active': isOn }" 
      @click="isOn = true"
    >
      Digital Twin
    </button>
    
    <button 
      class="switch-button switch-button-right" 
      :class="{ 'is-active': !isOn }" 
      @click="isOn = false"
    >
      Simulatie
    </button>
  </div>
</template>