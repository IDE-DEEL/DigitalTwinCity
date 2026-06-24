import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSimulationParameterStore, useSimulationWebSocketStore } from "./index";

export const useSimulationStateStore = defineStore("simulationState", () => {
    // ---
    // State
    // ---
    const agentState = ref([]);
    const houseState = ref([]);
    const currentStep = ref(DEFAULT_STEPS);
    const isSimulating = ref(false);
    const hasSimulated = ref(false);
    const simulationStats = ref(DEFAULT_SIMULATION_STATS);
    const tripScores = ref(DEFAULT_TRIP_SCORES);

    const cachedCsvData = ref(null);
    const cachedCsvStep = ref(null);

    // ---
    // Watchers to reset simulation state when relevant dashboard parameters change after a previous simulation run
    // ---
    const dashboardStore = useSimulationParameterStore();
    const wsStore = useSimulationWebSocketStore();

    watch(() => dashboardStore.scenario, () => {
        resetSimulationState();
    });

    watch(() => dashboardStore.cars.map(car => ({
        id: car.id,
        routeName: car.routeName,
        maxPackages: car.maxPackages,
    })),
    () => {
        resetSimulationState();
    }, { deep: true });

    watch(() => wsStore.isConnected, (connected) => {
        if (!connected) {
            handleConnectionLost();
        }
    });

    // ---
    // Actions
    // ---
    function updateSimulationState(result) {
        // Agent position coordinates are convert to SVG-coordinates in the backend
        agentState.value = result.agents || [];
        houseState.value = result.houses || [];
        currentStep.value = result.step || DEFAULT_STEPS;
        simulationStats.value = result.simulation_stats || DEFAULT_SIMULATION_STATS;
        tripScores.value = result.trip_scores || DEFAULT_TRIP_SCORES;
    }

    function resetSimulationState() {
        agentState.value = [];
        houseState.value = [];
        isSimulating.value = false;
        currentStep.value = DEFAULT_STEPS;
        simulationStats.value = DEFAULT_SIMULATION_STATS;
        tripScores.value = DEFAULT_TRIP_SCORES;
        cachedCsvData.value = null;
        cachedCsvStep.value = null;
    }

    function handleSimulationStarted() {
        isSimulating.value = true;
        hasSimulated.value = true;
    }

    function handleSimulationEnded() {
        isSimulating.value = false;
    }

    function handleConnectionLost() {
        if (!isSimulating.value) return;

        resetSimulationState();
        hasSimulated.value = false;
    }

    // ---
    // Getters (computed properties combining backend state with dashboard parameters)
    // ---
    const housesWithLivePackageData = computed(() => {
        const baseHouses = dashboardStore.baseHousesFromScenario;

        // use scenario defaults when there is no live data
        if (houseState.value.length === 0) {
            return baseHouses;
        }

        // use live data for remaining packages when available
        return baseHouses.map(house => {
            const liveHouseData = houseState.value.find(
                h => h.id === house.houseInstanceId
            );

            if (liveHouseData) {
                return {
                    ...house,
                    expectedPackages: liveHouseData.undelivered_packages
                };
            }

            return house;
        });
    });

    // ---
    // Return store API
    // ---
    return {
        // State
        agentState,
        houseState,
        currentStep,
        isSimulating,
        hasSimulated,
        simulationStats,
        tripScores,

        // Getters
        housesWithLivePackageData,

        // Actions
        updateSimulationState,
        resetSimulationState,
        handleSimulationStarted,
        handleSimulationEnded,
        handleConnectionLost,
    };
});

// ---
// Default values for refs
// ---
const DEFAULT_SIMULATION_STATS = {
    agents: [],
    totals: {
        total_distance: 0,
        total_time_driving: 0,
        total_packages_delivered: 0,
        total_undelivered_packages: 0
    },
    step_count: 0
};

const DEFAULT_TRIP_SCORES = {
    environment: 0,
    economic: 0,
    social: 0,
    energy: 0,
    safety: 0,
    maintenance: 0,
    total: 0
};

const DEFAULT_STEPS = 0;