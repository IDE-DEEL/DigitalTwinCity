<script setup>
import '../assets/Switch.css';
import { useLanguageStore, usePageStore } from '../stores/index.js';

const langStore = useLanguageStore();
const pageStore = usePageStore();

</script>

<template>
  <div class="switch-container">
    <router-link to="/digital_twin" 
      class="switch-button switch-button-left" 
      :class="{ 'is-active': pageStore.isDigitalTwin }" 
    >
      {{ langStore.getLabel('header.switchTwin') }}
    </router-link>
    
    <router-link to="/simulation" 
      class="switch-button switch-button-right" 
      :class="{ 'is-active': pageStore.isSimulation }" 
    >
      {{ langStore.getLabel('header.switchSimulation') }}
    </router-link>
  </div>
</template>