import { ref, computed } from "vue";
import { convertPositionMathToSvg } from "../logic/utils/coordinateConverter";
import { useDashboardParametersStore } from "./dashboardParametersStore";

// Backend simulation state
const simulationState = ref({
    agents: [],
    houses: []
});

// ---
// updating simulation state from backend
// ---
function updateSimulationState(result) {
    // ensure we convert agent positions from mathematical coordinates (backend) to SVG coordinates (frontend)
    const convertedAgents = (result.agents || []).map(agent => ({
        ...agent,
        position: convertPositionMathToSvg(agent.position)
    }));
    
    simulationState.value = {
        agents: convertedAgents,
        houses: result.houses || []
    };
}

function resetSimulationState() {
    simulationState.value = {
        agents: [],
        houses: []
    };
}

// ---
// computed properties combining backend state with dashboard parameters
// ---
const housesWithLivePackageData = computed(() => {
    const { housesFromScenario } = useDashboardParametersStore();
    const baseHouses = housesFromScenario.value;

    // use scenario defaults when there is no live data
    if (simulationState.value.houses.length === 0) {
        return baseHouses;
    }

    // use live data for remaining packages when available
    return baseHouses.map(house => {
        const liveHouseData = simulationState.value.houses.find(
            h => h.id === house.houseInstanceId // TODO: houseInstanceId needs better name
        );

        if (liveHouseData) {
            return {
                ...house,
                packageCount: liveHouseData.undelivered_packages // TODO: packageCount needs better name like "undeliveredPackageCount", or "remainingPackages"
            };
        }

        return house;
    });
});

// ---
// exporting composable
// ---
export function useSimulationStateStore() {
    return {
        simulationState,
        housesWithLivePackageData,

        updateSimulationState,
        resetSimulationState,
    };
}
