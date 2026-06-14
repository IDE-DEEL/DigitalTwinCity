<script setup>
import { ref } from 'vue'
import '../assets/Switch.css'
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const isOn = ref(true)
</script>

<template>
  <div class="switch-container">
    <router-link to="/digital_twin" 
      class="switch-button switch-button-left" 
      :class="{ 'is-active': isOn }" 
      @click="isOn = true"
    >
      {{ langStore.getLabel('header.switchTwin') }}
    </router-link>
    
    <router-link to="/simulation" 
      class="switch-button switch-button-right" 
      :class="{ 'is-active': !isOn }" 
      @click="isOn = false"
    >
      {{ langStore.getLabel('header.switchSimulation') }}
    </router-link>
  </div>
</template>