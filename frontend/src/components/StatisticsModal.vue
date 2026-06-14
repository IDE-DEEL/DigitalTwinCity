<script setup>
import '../assets/StatisticsModal.css'
import { useDigitalTwinStore } from '../stores/digital-twin.js'
import { useLanguageStore } from '../stores/index.js';

const store = useDigitalTwinStore()
const langStore = useLanguageStore();

const handleDownloadCSV = () => {
    // 1. Bouw de CSV tekst op vanuit de store
    const r = store.results;
    const csvData = [
        ['Categorie', 'Score'],
        ['Omgeving', Number(r.environment || 0).toFixed(1)],
        ['Economie', Number(r.economic || 0).toFixed(1)],
        ['Sociaal', Number(r.social || 0).toFixed(1)],
        ['Energie', Number(r.energy || 0).toFixed(1)],
        ['Veiligheid', Number(r.safety || 0).toFixed(1)],
        ['Onderhoudbaarheid', Number(r.maintenance || 0).toFixed(1)],
        ['Totale score', Number(r.total || 0).toFixed(1)]
    ].map(row => row.join(',')).join('\n');

    const timestamp = new Date().toISOString().split('T')[0];

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DEEL-simulation_${timestamp}.csv`;
    link.click();
};

</script>

<template>
<div class="modal-mask">
  <div class="modal-wrapper">
    <div class="modal-container">
      <div class="modal-header">
        <slot name="header">
        </slot>

        <button class="download-csv-button" @click="handleDownloadCSV">
          <p>{{ langStore.getLabel('impactStats.download') }}</p>
        </button>

        <button class="modal-default-button" @click="$emit('close')">
          <p>{{ langStore.getLabel('misc.closeButton') }}</p>
        </button>
      </div>

      <slot name="body">
        <div class="modal-body">
          <p>{{ langStore.getLabel('impactStats.surroundings') }}: <span>{{ Number(store.results.environment).toFixed(1) }}</span></p>
          <p>{{ langStore.getLabel('impactStats.economy') }}: <span>{{ Number(store.results.economic).toFixed(1) }}</span></p>
          <p>{{ langStore.getLabel('impactStats.social') }}: <span>{{ Number(store.results.social).toFixed(1) }}</span></p>
          <p>{{ langStore.getLabel('impactStats.energy') }}: <span>{{ Number(store.results.energy).toFixed(1) }}</span></p>
          <p>{{ langStore.getLabel('impactStats.safety') }}: <span>{{ Number(store.results.safety).toFixed(1) }}</span></p>
          <p>{{ langStore.getLabel('impactStats.maintainability') }}: <span>{{ Number(store.results.maintenance).toFixed(1) }}</span></p>
        </div>
      </slot>

      <slot name="footer">
        <div class="modal-footer">
          <p>{{ langStore.getLabel('impactStats.total') }}: <span>{{ Number(store.results.total).toFixed(1) }}</span></p>
        </div>
      </slot>
    </div>
  </div>
</div>
</template>