import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { SCENARIO_OPTIONS, getHousesForScenarioByValue } from "../logic/domain/scenarios";
import { buildCarsWithRoutes } from "../logic/service/carService";
import { convertWaypointsSvgToMath, convertPositionMathToSvg } from "../logic/utils/coordinateConverter";
import { getHousesByScenarioKey, getHousesLinkedToRoutesByScenarioKey } from "../logic/service/houseService";
import { useWebSocketSimulation } from "./useWebSocketSimulation";
import { MAX_CARS } from "../constants/constants";

// refs
const cars = ref([]);
const carTargetSpeed = ref(50);
const scenario = ref('rustig');
const isSimulating = ref(false);
const mapData = ref([]);
const agentsState = ref([]);

// websocket composable
const { isWebSocketConnected, connectWebSocket, disconnectWebSocket, sendWebSocketMessage } = useWebSocketSimulation();

// ---
// adding and removing cars
// ---
function addCar() {
    // TODO: potentially refactor to use early return in sprint 6
    if (cars.value.length < MAX_CARS) {
        const newCar = {
            id: `${cars.value.length + 1}`,
            maxPackages: 1,
            route: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        };
        cars.value.push(newCar);
    }
}

function removeCar() {
    if (cars.value.length > 0) {
        cars.value.pop();
    }
}

// ---
// updating package count and route for a car
// ---
function updateCarMaxPackageCount(carId, maxPackages) {
    const car = cars.value.find((c) => c.id === carId);

    if (!car) {
        return;
    }

    car.maxPackages = maxPackages;
}

function updateCarRoute(carId, routeName) {
    const car = cars.value.find((c) => c.id === carId);

    if (!car) {
        return;
    }

    car.route = routeName;
}

function toggleCarRouteVisibility(carId) {
    const car = cars.value.find((c) => c.id === carId);

    if (!car) {
        return;
    }

    car.routeVisibility = !car.routeVisibility;
}

// ---
// simulation logic
// ---
function setCarTargetSpeed(value) {
    carTargetSpeed.value = value;
}

function setScenario(value) {
    scenario.value = value;
}

function startSimulation() {
    if (!isWebSocketConnected.value) {
        console.error("WebSocket not connected. Cannot start simulation.");
        return;
    }
    
    const parameters = collectParameters();
    if (!parameters) {
        console.error("Parameters not available. Cannot start simulation.");
        return;
    }
    
    sendWebSocketMessage({
        command: "start",
        parameters: parameters
    });
    
    isSimulating.value = true;
}

function stopSimulation() {
    if (!isWebSocketConnected.value) {
        console.error("WebSocket not connected. Cannot stop simulation.");
        return;
    }
    
    sendWebSocketMessage({
        command: "stop"
    });
    
    isSimulating.value = false;
    agentsState.value = [];
}

function updateAgentsState(agents) {
    // ensure we convert agent positions back from mathematical coordinates (backend) to SVG coordinates (frontend)
    const convertedAgents = agents.map(agent => ({
        ...agent,
        position: convertPositionMathToSvg(agent.position)
    }));
    agentsState.value = convertedAgents;
}

function reconnectWebSocket() {
    disconnectWebSocket();
    connectWebSocket(updateAgentsState);
}

// ---
// map and routes
// ---
function setMapData(loadedMapData) {
    mapData.value = loadedMapData;
}

const visibleCars = computed(() => {
    return cars.value.filter((car) => car.routeVisibility);
});

const visibleCarsWithRoutes = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return buildCarsWithRoutes(visibleCars.value, mapData.value);
    } catch (error) {
        console.error("Error building visible car routes:", error);
        return [];
    }
});

const carsWithRoutes = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return buildCarsWithRoutes(cars.value, mapData.value);
    } catch (error) {
        console.error("Error building configured car routes:", error);
        return [];
    }
});

const housesFromScenario = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return getHousesByScenarioKey(scenario.value, mapData.value);
    } catch (error) {
        console.error("Error building scenario payload:", error);
        return [];
    }
});

const housesLinkedToRoutesFromScenario = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return getHousesLinkedToRoutesByScenarioKey(scenario.value, mapData.value);
    } catch (error) {
        console.error("Error building scenario payload with routes:", error);
        return [];
    }
});

// ---
// collecting simulation parameters to build payload
// ---
const simulationStartPayload = computed(() => {
    if (!mapData.value.length) {
        return null;
    }

    return {
        cars: carsWithRoutes.value.map((car) => ({
            id: car.id,
            maxPackages: car.maxPackages,
            routeName: car.route,
            routeWaypoints: convertWaypointsSvgToMath(car.waypoints),
        })),
        carTargetSpeed: carTargetSpeed.value,
        scenario: {
            name: scenario.value,
            houses: housesLinkedToRoutesFromScenario.value,
        },
    };
});

function collectParameters() {
    return simulationStartPayload.value;
}

// ---
// exporting composable
// ---
export function useSimulationState() {
    onMounted(() => {
        connectWebSocket(updateAgentsState);
    });

    onBeforeUnmount(() => {
        disconnectWebSocket();
    });

    return {
        cars,
        carTargetSpeed: carTargetSpeed,
        scenario,
        isSimulating,
        mapData,
        agentsState,
        routeOptions: ROUTE_OPTIONS,
        scenarioOptions: SCENARIO_OPTIONS,
        isWebSocketConnected,

        addCar,
        removeCar,
        updateCarMaxPackageCount,
        updateCarRoute,
        toggleCarRouteVisibility,
        setCarTargetSpeed,
        setScenario,
        setMapData,
        startSimulation,
        stopSimulation,
        updateAgentsState,
        reconnectWebSocket,
        collectParameters,

        visibleCars,
        visibleCarsWithRoutes,
        carsWithRoutes,
        housesFromScenario,
        housesLinkedToRoutesFromScenario,
        simulationStartPayload,
    };
}