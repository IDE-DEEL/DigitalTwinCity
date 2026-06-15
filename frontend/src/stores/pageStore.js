import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export const usePageStore = defineStore('page', () => {
    const route = useRoute();
  
    const currentPage = computed(() => {
        return route.path === '/simulation' ? 'simulation' : 'digital_twin';
    });
  
    const isDigitalTwin = computed(() => currentPage.value === 'digital_twin');
    const isSimulation = computed(() => currentPage.value === 'simulation');
    
    return {
        currentPage,
        isDigitalTwin,
        isSimulation
    };
});
