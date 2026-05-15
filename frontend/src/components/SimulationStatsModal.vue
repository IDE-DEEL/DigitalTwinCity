<template>
    <div v-if="isOpen" @click.self="closeModal" class="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto">
            <!-- Header -->
            <div class="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
                <h2 class="text-xl font-bold text-dark">Simulatiestatistieken</h2>
                <button
                    @click="emit('close')"
                    class="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                >
                    ×
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
                <!-- Loading state -->
                <div v-if="isLoading" class="text-center py-8">
                    <p class="text-gray-600">Laden...</p>
                </div>

                <!-- Error state -->
                <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
                    <p class="text-red-700">{{ error }}</p>
                </div>

                <!-- Stats content -->
                <div v-else-if="stats">
                    <!-- Per-agent table -->
                    <div>
                        <h3 class="text-lg font-semibold mb-3 text-dark">Auto's</h3>
                        <div class="overflow-x-auto">
                            <table class="w-full border-collapse text-sm">
                                <thead>
                                    <tr class="bg-gray-100 border-b border-gray-300">
                                        <th class="px-4 py-2 text-left font-semibold text-gray-700">Auto ID</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">Afstand</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">Rij tijd</th>
                                        <th class="px-4 py-2 text-right font-semibold text-gray-700">Bezorgde pakketten</th>
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
                                        <td class="px-4 py-2 text-right text-gray-700">{{ agent.time_driving_seconds.toFixed(2) }}</td>
                                        <td class="px-4 py-2 text-right text-gray-700">{{ agent.total_packages_delivered }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Totals section -->
                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-md p-4">
                        <h3 class="text-lg font-semibold mb-3 text-dark">Totalen</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">Totale afstand:</span>
                                <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_distance.toFixed(2) }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">Totale rij tijd:</span>
                                <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_time_driving.toFixed(2) }}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-gray-700">Totale bezorgde pakketten:</span>
                                <span class="font-mono font-bold text-gray-900">{{ stats.totals.total_packages_delivered }}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm text-gray-600 mt-2 pt-2 border-t border-blue-200">
                                <span>Stap:</span>
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
                            {{ isDownloading ? 'Downloaden...' : 'Download CSV' }}
                        </button>
                    </div>
                </div>

                <!-- Empty state -->
                <div v-else class="text-center py-8 text-gray-600">
                    Geen simulatiedata beschikbaar
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useCarColors } from '../composables/useCarColors';

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
        const errorMsg = err.message || 'Fout bij het ophalen van statistieken';
        error.value = errorMsg;
        console.error('Error loading stats:', err);
    } finally {
        isLoading.value = false;
    }
};

const handleDownloadCSV = async () => {
    isDownloading.value = true;
    error.value = null;

    try {
        const csvData = await props.exportDataAsCSV();
        
        // Create blob and download
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const timestamp = now.toISOString().split('T')[0] + '_' + 
            (String(now.getHours()).padStart(2, '0')) + '-' + 
            (String(now.getMinutes()).padStart(2, '0')) + '-' + 
            (String(now.getSeconds()).padStart(2, '0'));
        
        link.setAttribute('href', url);
        link.setAttribute('download', `DEEL-simulation_${timestamp}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        error.value = err.message || 'Fout bij het downloaden van CSV';
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
