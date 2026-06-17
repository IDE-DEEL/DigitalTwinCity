<template>
    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-8">
        <p class="text-gray-600">{{ langStore.getLabel('simStats.loadingState') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-700">{{ error }}</p>
    </div>

    <!-- Stats content -->
    <div v-else-if="stats">
        <!-- Per-agent table -->
        <div>
            <h3 class="text-lg font-semibold mb-3 text-dark">{{ langStore.getLabel('carTable.header') }}</h3>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm">
                    <thead>
                        <tr class="bg-gray-100 border-b border-gray-300">
                            <th class="px-4 py-2 text-left font-semibold text-gray-700">{{ langStore.getLabel('carTable.carId') }}</th>
                            <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ langStore.getLabel('simStats.distance') }}</th>
                            <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ langStore.getLabel('simStats.drivingTime') }}</th>
                            <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ langStore.getLabel('simStats.packagesDelivered') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="agent in stats.agents" :key="agent.id" class="border-b border-gray-200 hover:bg-gray-50">
                            <td class="px-4 py-2 font-mono text-gray-800">
                                <div class="flex items-center gap-2">
                                    <div
                                        class="w-1 h-6 rounded-sm"
                                        :style="{ backgroundColor: getColorForCarAndRoute(agent.id) }"
                                    ></div>
                                    {{ agent.id }}
                                </div>
                            </td>
                            <td class="px-4 py-2 text-right text-gray-700">{{ agent.distance_travelled.toFixed(2) }}</td>
                            <td class="px-4 py-2 text-right text-gray-700">{{ formatDrivingTime(agent.time_driving_seconds) }}</td>
                            <td class="px-4 py-2 text-right text-gray-700">{{ agent.packages_delivered }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Totals section -->
        <div class="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-md p-4">
            <h3 class="text-lg font-semibold mb-3 text-dark">{{ langStore.getLabel('simStats.totals') }}</h3>
            <div class="space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-gray-700">{{ langStore.getLabel('simStats.totalDistance') }}:</span>
                    <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_distance.toFixed(2) }}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-700">{{ langStore.getLabel('simStats.totalDrivingTime') }}:</span>
                    <span class="font-mono font-bold text-gray-900">{{ formatDrivingTime(stats.totals.total_time_driving) }}</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-gray-700">{{ langStore.getLabel('simStats.totalPackages') }}:</span>
                    <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_packages_delivered }}</span>
                </div>
                <div class="flex justify-between items-center text-sm text-gray-600 mt-2 pt-2 border-t border-blue-200">
                    <span>{{ langStore.getLabel('simStats.totalsSteps') }}:</span>
                    <span class="font-mono">{{ stats.step_count }}</span>
                </div>
            </div>
        </div>

        <!-- Download button -->
        <div>
            <button
                @click="handleDownloadCSV"
                :disabled="isDownloading"
                :class="[
                    'w-full py-3 px-4 rounded-md font-semibold transition-colors',
                    isDownloading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                ]"
            >
                {{ isDownloading ? langStore.getLabel('simStats.downloadingCsv') : langStore.getLabel('simStats.downloadCsv') }}
            </button>
        </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8 text-gray-600">
        {{ langStore.getLabel('simStats.emptyState') }}
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useCarColors } from '../composables/useCarColors';
import { useLanguageStore } from '../stores/index.js';

const langStore = useLanguageStore();

const props = defineProps({
    getStats: {
        type: Function,
        required: true
    },
    exportDataAsCSV: {
        type: Function,
        required: true
    }
});

const { getColorForCarAndRoute } = useCarColors();

const stats = ref(null);
const isLoading = ref(false);
const isDownloading = ref(false);
const error = ref(null);

const loadStats = async () => {
    console.log("Loading stats...");
    isLoading.value = true;
    error.value = null;
    stats.value = null;

    try {
        const data = await props.getStats();
        console.log("Stats loaded successfully:", data);
        stats.value = data;
    } catch (err) {
        const errorMsg = err.message || langStore.getLabel('statsRetrievalError');
        error.value = errorMsg;
        console.error('Error loading stats:', err);
    } finally {
        isLoading.value = false;
    }
};

// Component wordt door de modal-shell met v-if gemount/ge-unmount,
// dus onMounted vervangt hier de oude watch(() => props.isOpen, ...)
onMounted(() => {
    loadStats();
});

function formatDrivingTime(seconds) {
    if (seconds === null || seconds === undefined) return '0s';

    const totalSeconds = Math.floor(seconds);
    const oneMinute = 60;
    const oneHour = 3600;

    const hours = Math.floor(totalSeconds / oneHour);
    const minutes = Math.floor((totalSeconds % oneHour) / oneMinute);
    const remainingSeconds = totalSeconds % oneMinute;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

const handleDownloadCSV = async () => {
    isDownloading.value = true;
    error.value = null;
    const datePadding = 2; // Pad month, day, hours, minutes, seconds to 2 digits

    try {
        const csvData = await props.exportDataAsCSV();

        // Create blob and download
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(datePadding, '0');
        const day = String(now.getDate()).padStart(datePadding, '0');
        const hours = String(now.getHours()).padStart(datePadding, '0');
        const minutes = String(now.getMinutes()).padStart(datePadding, '0');
        const seconds = String(now.getSeconds()).padStart(datePadding, '0');
        const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

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