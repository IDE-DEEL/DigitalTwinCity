<script setup>
import '../assets/StatisticsModal.css'
import { useDigitalTwinStore } from '../stores/digital-twin.js'

const store = useDigitalTwinStore()
</script>

<template>
<div class="modal-mask">
  <div class="modal-wrapper">
    <div class="modal-container">
      <div class="modal-header">
        <slot name="header">
        </slot>

        <button class="modal-default-button" @click="$emit('close')">
          <p>X</p>
        </button>
      </div>

      <slot name="body">
        <div class="modal-body">
          <p>Omgeving: <span>{{ Number(store.results.environment).toFixed(1) }}</span></p>
          <p>Economie: <span>{{ Number(store.results.economic).toFixed(1) }}</span></p>
          <p>Sociaal: <span>{{ Number(store.results.social).toFixed(1) }}</span></p>
          <p>Energie: <span>{{ Number(store.results.energy).toFixed(1) }}</span></p>
          <p>Veiligheid: <span>{{ Number(store.results.safety).toFixed(1) }}</span></p>
          <p>Onderhoudbaarheid: <span>{{ Number(store.results.maintenance).toFixed(1) }}</span></p>
        </div>
      </slot>

      <slot name="footer">
        <div class="modal-footer">
          <p>Totale score: <span>{{ Number(store.results.total).toFixed(1) }}</span></p>
        </div>
      </slot>
    </div>
  </div>
</div>
</template>