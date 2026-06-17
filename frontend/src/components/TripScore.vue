<script setup>
import { useLanguageStore } from '../stores/index.js';
import { getCurrentTimestamp } from '../logic/utils/timestamp.js';
import { BaseButton } from './CustomComponents.js';

const langStore = useLanguageStore();

const props = defineProps({
    scores: {
        type: Object,
        default: () => ({
            environment: 0,
            economic: 0,
            social: 0,
            energy: 0,
            safety: 0,
            maintenance: 0,
            total: 0
        })
    }
});

const handleDownloadCSV = () => {
    const result = props.scores;
    const csvData = [
        [langStore.getLabel('tripStats.category'), langStore.getLabel('tripStats.score')],
        [langStore.getLabel('tripStats.surroundings'), Number(result.environment || 0).toFixed(1)],
        [langStore.getLabel('tripStats.economy'), Number(result.economic || 0).toFixed(1)],
        [langStore.getLabel('tripStats.social'), Number(result.social || 0).toFixed(1)],
        [langStore.getLabel('tripStats.energy'), Number(result.energy || 0).toFixed(1)],
        [langStore.getLabel('tripStats.safety'), Number(result.safety || 0).toFixed(1)],
        [langStore.getLabel('tripStats.maintainability'), Number(result.maintenance || 0).toFixed(1)],
        [langStore.getLabel('tripStats.total'), Number(result.total || 0).toFixed(1)]
    ].map(row => row.join(',')).join('\n');

    const timestamp = getCurrentTimestamp();

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DEEL-simulation_${timestamp}.csv`;
    link.click();
};

</script>

<template>
    <div class="modal-wrapper">
        <div class="modal-container">    
            <h3 class="stats-header">{{ langStore.getLabel('tripStats.title') }}</h3>
            <div class="modal-content">
                <div class="modal-body">
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Omgeving.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.surroundings') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.environment).toFixed(1) }}</span>
                    </div>
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Economie.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.economy') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.economic).toFixed(1) }}</span>
                    </div>
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Sociaal.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.social') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.social).toFixed(1) }}</span>
                    </div>
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Energie.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.energy') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.energy).toFixed(1) }}</span>
                    </div>
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Veiligheid.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.safety') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.safety).toFixed(1) }}</span>
                    </div>
                    <div class="concern-row">
                        <div class="concern-label">
                            <img src="/assets/results/Onderhoudbaarheid.svg" alt="" class="concern-icon" />
                            <span>{{ langStore.getLabel('tripStats.maintainability') }}</span>
                        </div>
                        <span class="concern-value">{{ Number(props.scores.maintenance).toFixed(1) }}</span>
                    </div>
                </div>
                
                <div class="modal-footer modal-footer-divider">
                    <span>{{ langStore.getLabel('tripStats.total') }}</span>
                    <span class="concern-value">{{ Number(props.scores.total).toFixed(1) }}</span>
                </div>
            </div>
            <div>
                
                <BaseButton variant="stats-modal" @click="handleDownloadCSV">
                    {{ langStore.getLabel('tripStats.download') }}
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-wrapper {
    padding: 24px 48px;
}

.modal-container {
  margin: 0px auto;
}

.stats-header {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    margin-bottom: 0.25rem;
    color: #1f2937;
}

.modal-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: linear-gradient(to right, #eff6ff, #dbeafe);
    border: 1px solid #93c5fd;
    border-radius: var(--rounded-sm);
    padding: 1rem;
}

.concern-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.concern-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.concern-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.concern-value {
    font-weight: var(--font-semibold);
    color: #111827;
}

.modal-footer-divider{
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #93c5fd;
    color: #4b5563;
}

.modal-footer {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    display: flex;
    justify-content: space-between;
}
</style>