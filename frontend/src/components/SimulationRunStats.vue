<script setup>
import { ref } from 'vue';
import { useCarColors } from '../composables/useCarColors';
import { useLanguageStore, useSimulationStateStore } from '../stores/index.js';
import { getCurrentTimestamp } from '../logic/utils/timestamp.js';
import { BaseButton } from './CustomComponents.js';

const langStore = useLanguageStore();
const simulationStore = useSimulationStateStore();

const props = defineProps({
    simulationStats: {
        type: Object,
        required: true
    },
    exportDataAsCSV: {
        type: Function,
        required: true
    }
});

const { getColorForCarAndRoute } = useCarColors();

const isDownloading = ref(false);
const error = ref(null);

function formatDrivingTime(seconds) {
    if (seconds === null || seconds === undefined) return '0s';

    const totalSeconds = Math.floor(seconds);
    const oneMinute = 60;
    const oneHour = 3600;

    const hours = Math.floor(totalSeconds / oneHour);
    const minutes = Math.floor((totalSeconds % oneHour) / oneMinute);
    const remainingSeconds = totalSeconds % oneMinute;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds} s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds} s`;
    }

    return `${remainingSeconds} s`;
}

const handleDownloadCSV = async () => {
    isDownloading.value = true;
    error.value = null;

    try {
        const csvData = await props.exportDataAsCSV();

        // Create blob and download
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const timestamp = getCurrentTimestamp();

        link.setAttribute('href', url);
        link.setAttribute('download', `DEEL-simulation_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        error.value = err.message || langStore.getLabel('statsCsvError');
        console.error('Error downloading CSV:', err);
    } finally {
        isDownloading.value = false;
    }
};
</script>

<template>
    <div class="stats-wrapper">
        <!-- Error state -->
        <div v-if="error" class="error-state">
            <p class="text-red-700">{{ error }}</p>
        </div>
        
        <!-- Stats content -->
        <div v-else class="stats-content">
            <!-- Per-agent table -->
            <div>
                <h3 class="table-header">{{ langStore.getLabel('simStats.title') }}</h3>
                <div class="table-wrapper">
                    <table class="stats-table">
                        <thead>
                            <tr class="table-header-row">
                                <th class="table-header-cell table-cell-left">{{ langStore.getLabel('carTable.carId') }}</th>
                                <th class="table-header-cell table-cell-right">{{ langStore.getLabel('simStats.distance') }}</th>
                                <th class="table-header-cell table-cell-right">{{ langStore.getLabel('simStats.drivingTime') }}</th>
                                <th class="table-header-cell table-cell-right">{{ langStore.getLabel('simStats.packagesDelivered') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="agent in simulationStats.agents" :key="agent.id" class="table-body-row">
                                <td class="table-cell table-cell-left">
                                    <div class="agent-id-cell">
                                        <div
                                        class="agent-color-indicator"
                                        :style="{ backgroundColor: getColorForCarAndRoute(agent.id) }"
                                        ></div>
                                        {{ agent.id }}
                                    </div>
                                </td>
                                <td class="table-cell table-cell-right">{{ agent.distance_travelled_km.toFixed(2) }} km</td>
                                <td class="table-cell table-cell-right">{{ formatDrivingTime(agent.time_driving_seconds) }}</td>
                                <td class="table-cell table-cell-right">{{ agent.packages_delivered }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Totals section -->
            <div class="totals-section">
                <h3 class="totals-header">{{ langStore.getLabel('simStats.totals') }}</h3>
                <div class="totals-content">
                    <div class="totals-row">
                        <span class="totals-label">{{ langStore.getLabel('simStats.totalDistance') }}:</span>
                        <span class="totals-value">{{ simulationStats.totals.total_distance.toFixed(2) }} km</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">{{ langStore.getLabel('simStats.totalDrivingTime') }}:</span>
                        <span class="totals-value">{{ formatDrivingTime(simulationStats.totals.total_time_driving) }}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">{{ langStore.getLabel('simStats.totalPackages') }}:</span>
                        <span class="totals-value">{{ simulationStats.totals.total_packages_delivered }}</span>
                    </div>
                    <div class="totals-row">
                        <span class="totals-label">{{ langStore.getLabel('simStats.totalUndeliveredPackages') }}:</span>
                        <span class="totals-value">{{ simulationStats.totals.total_undelivered_packages }}</span>
                    </div>
                    <div class="totals-row totals-row-last">
                        <span>{{ langStore.getLabel('simStats.totalsSteps') }}:</span>
                        <span class="font-mono">{{ simulationStats.step_count }}</span>
                    </div>
                </div>
            </div>
            
            <!-- Download button -->
            <div class="button-container">
                <BaseButton
                    @click="handleDownloadCSV"
                    :disabled="isDownloading || !simulationStore.hasSimulated"
                    variant="stats-modal"
                    >
                    {{ isDownloading ? langStore.getLabel('simStats.downloadingCsv') : langStore.getLabel('simStats.downloadCsv') }}
                </BaseButton>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Error state */
.error-state {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.375rem;
    padding: 1rem;
}

.error-text {
    color: #b91c1c;
}

/* Table styling */
.stats-wrapper {
    padding: 24px 48px;
}

.stats-content {
    display: flex;
    flex-direction: column;
}

.table-header {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    margin-bottom: 0.25rem;
    color: #1f2937;
}

.table-wrapper {
    overflow-x: auto;
}

.stats-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
}

.table-header-row {
    background-color: #f3f4f6;
    border-bottom: 1px solid #d1d5db;
    font-size: var(--text-base);
}

.table-header-cell {
    padding: 0.5rem 1rem;
    font-weight: var(--font-semibold);
    color: #374151;
}

.table-cell-left {
    text-align: left;
}

.table-cell-right {
    text-align: right;
}

.table-body-row {
    border-bottom: 1px solid #e5e7eb;
    transition: background-color 0.2s;
    background: white;
}

.table-body-row:hover {
    background-color: var(--color-table-gray2);
}

.table-cell {
    padding: 0.25rem 1rem;
    color: #374151;
}

.agent-id-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: monospace;
    color: #1f2937;
}

.agent-color-indicator {
    width: 0.25rem;
    height: 1.5rem;
    border-radius: 0.125rem;
    flex-shrink: 0;
}

/* Totals section */
.totals-section {
    background: linear-gradient(to right, #eff6ff, #dbeafe);
    border: 1px solid #93c5fd;
    border-radius: var(--rounded-sm);
    padding: 1rem;
}

.totals-header {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    margin-bottom: 0.75rem;
    color: #1f2937;
}

.totals-content {
    display: flex;
    flex-direction: column;
}

.totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.totals-row-last {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #93c5fd;
    font-size: 0.875rem;
    color: #4b5563;
}

.totals-label {
    color: #4b5563;
}

.totals-value {
    font-weight: var(--font-semibold);
    color: #111827;
}

/* Button styling */
.button-container {
    display: flex;
}
</style>