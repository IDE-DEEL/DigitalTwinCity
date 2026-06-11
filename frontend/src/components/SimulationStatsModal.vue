<template>
    <div v-if="isOpen" @click.self="closeModal" class="fixed backdrop-blur-xs bg-black/40 inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
                <h2 class="text-xl font-bold text-dark">{{ getLabel('statisticsTitle') }}</h2>
                <button
                    @click="emit('close')"
                    class="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                >
                    {{ getLabel('closeButton') }}
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
                <!-- Loading state -->
                <div v-if="isLoading" class="text-center py-8">
                    <p class="text-gray-600">{{ getLabel('loadingState') }}</p>
                </div>

                <!-- Error state -->
                <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
                    <p class="text-red-700">{{ error }}</p>
                </div>

                <!-- Stats content -->
                <div v-else-if="stats">
                    <!-- Per-agent table -->
                    <div>
                        <h3 class="text-lg font-semibold mb-3 text-dark">{{ getLabel('tableHeader') }}</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse text-sm">
                                <thead>
                                    <tr class="bg-gray-100 border-b border-gray-300">
                                        <th class="px-4 py-2 text-left font-semibold text-gray-700">{{ getLabel('carId') }}</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ getLabel('distance') }}</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ getLabel('drivingTime') }}</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">{{ getLabel('packagesDelivered') }}</th>
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
                        <h3 class="text-lg font-semibold mb-3 text-dark">{{ getLabel('statsTotals') }}</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">{{ getLabel('totalDistance') }}:</span>
                                <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_distance.toFixed(2) }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">{{ getLabel('totalDrivingTime') }}:</span>
                                <span class="font-mono font-bold text-gray-900">{{ formatDrivingTime(stats.totals.total_time_driving) }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">{{ getLabel('totalPackages') }}:</span>
                                <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_packages_delivered }}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm text-gray-600 mt-2 pt-2 border-t border-blue-200">
                                <span>{{ getLabel('totalsSteps') }}:</span>
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
                            {{ isDownloading ? getLabel('downloadingCsv') : getLabel('downloadCsv') }}
                        </button>
                    </div>
                </div>

                <!-- Empty state -->
                <div v-else class="text-center py-8 text-gray-600">
                    {{ getLabel('emptyState') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useCarColors } from '../composables/useCarColors';
import { getLabel } from '../constants/ui_labels.js';

const props = defineProps({
    isOpen: {
        type: Boolean,
        required: true
    },
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
const emit = defineEmits(['close']);

const closeModal = () => {
    emit('close');
};

const handleKeyDown = (event) => {
    if (event.key === 'Escape' && props.isOpen) {
        closeModal();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown);
});

const stats = ref(null);
const isLoading = ref(false);
const isDownloading = ref(false);
const error = ref(null);

// Watch for modal open to reload stats
watch(() => props.isOpen, async (newVal) => {
    if (newVal) {
        await loadStats();
    }
});

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
        const errorMsg = err.message || getLabel('statsRetrievalError');
        error.value = errorMsg;
        console.error('Error loading stats:', err);
    } finally {
        isLoading.value = false;
    }
};

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
        error.value = err.message || getLabel('statsCsvError');
        console.error('Error downloading CSV:', err);
    } finally {
        isDownloading.value = false;
    }
};
</script>

<style scoped>
/* Ensure modal is on top of everything */
:deep(.fixed) {
    z-index: 50;
}
</style>
