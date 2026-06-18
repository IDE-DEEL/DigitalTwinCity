import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { convertPositionMathToSvg } from "../logic/utils/coordinateConverter";
import { useDashboardParametersStore } from "./dashboardParametersStore";

export const useSimulationStateStore = defineStore("simulationState", () => {
    // ---
    // State
    // ---
    const agentState = ref([]);
    const houseState = ref([]);
    const currentStep = ref(0);
    const isSimulating = ref(false);
    const hasSimulated = ref(false);
    const simulationStats = ref({});
    const tripScores = ref({});

    // ---
    // Watchers to reset simulation state when relevant dashboard parameters change after a previous simulation run
    // ---
    const dashboardStore = useDashboardParametersStore();

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

    // ---
    // Actions
    // ---
    function updateSimulationState(result) {
        // ensure we convert agent positions from mathematical coordinates (backend) to SVG coordinates (frontend)
        const convertedAgents = (result.agents || []).map(agent => ({
            ...agent,
            position: convertPositionMathToSvg(agent.position),
            virtual_sensor_left: agent.virtual_sensor_left ? convertPositionMathToSvg(agent.virtual_sensor_left) : null,
            virtual_sensor_right: agent.virtual_sensor_right ? convertPositionMathToSvg(agent.virtual_sensor_right) : null,
        }));
        
        agentState.value = convertedAgents;
        houseState.value = result.houses || [];
        currentStep.value = result.step || 0;
        simulationStats.value = result.simulation_stats || {};
        tripScores.value = result.trip_scores || {};
    }

    function resetSimulationState() {
        agentState.value = [];
        houseState.value = [];
        isSimulating.value = false;
        currentStep.value = 0;
        simulationStats.value = {};
        tripScores.value = {};
    }

    function handleSimulationStarted() {
        isSimulating.value = true;
        hasSimulated.value = true;
    }

    function handleSimulationEnded() {
        isSimulating.value = false;
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
                h => h.id === house.houseInstanceId // TODO: houseInstanceId needs better name
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
    };
});
