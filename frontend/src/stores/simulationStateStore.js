import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { convertPositionMathToSvg } from "../logic/utils/coordinateConverter";
import { useDashboardParametersStore } from "./dashboardParametersStore";

export const useSimulationStateStore = defineStore("simulationState", () => {
    // ---
    // State
    // ---
    const agentState = ref([]);
    const houseState = ref([]);

    // ---
    // Actions
    // ---
    function updateSimulationState(result) {
        // ensure we convert agent positions from mathematical coordinates (backend) to SVG coordinates (frontend)
        const convertedAgents = (result.agents || []).map(agent => ({
            ...agent,
            position: convertPositionMathToSvg(agent.position)
        }));
        
        agentState.value = convertedAgents;
        houseState.value = result.houses || [];
    }

    function resetSimulationState() {
        agentState.value = [];
        houseState.value = [];
    }

    // ---
    // Getters (computed properties combining backend state with dashboard parameters)
    // ---
    const housesWithLivePackageData = computed(() => {
        const dashboardStore = useDashboardParametersStore();
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

        // Getters
        housesWithLivePackageData,

        // Actions
        updateSimulationState,
        resetSimulationState,
    };
});
