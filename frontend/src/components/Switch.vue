<script setup>
import { ref } from 'vue'
import '../assets/Switch.css'

const isOn = ref(true)
</script>

<template>
  <div class="switch-container">
    <router-link to="/digital_twin" 
      class="switch-button switch-button-left" 
      :class="{ 'is-active': isOn }" 
      @click="isOn = true"
    >
      Digital Twin
    </router-link>
    
    <router-link to="/simulation" 
      class="switch-button switch-button-right" 
      :class="{ 'is-active': !isOn }" 
      @click="isOn = false"
    >
      Simulatie
    </router-link>
  </div>
</template>