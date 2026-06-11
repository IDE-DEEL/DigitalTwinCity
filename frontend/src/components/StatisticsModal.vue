<script setup>
import '../assets/StatisticsModal.css'
import { useDigitalTwinStore } from '../stores/digital-twin.js'

const store = useDigitalTwinStore()

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
          <p>Download CSV</p>
        </button>

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