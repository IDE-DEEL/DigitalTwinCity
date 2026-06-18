import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { SCENARIO_OPTIONS } from "../logic/domain/scenarios";
import { addWaypointsToCarRoute } from "../logic/service/carService";
import { getHousesWithRoutesByScenarioKey, buildOrderedHouseInstancesOnRoutes } from "../logic/service/houseService";
import { useMapStore } from "./mapStore";
import { SIMULATION_SPEED_OPTIONS, MAP_ROWS } from "../constants/constants";

export const useDashboardParametersStore = defineStore("dashboardParameters", () => {
    // ---
    // State
    // ---
    const cars = ref(DEFAULT_CARS);
    const carTargetSpeed = ref(DEFAULT_CAR_SPEED);
    const scenario = ref(SCENARIO_OPTIONS[0]?.value ?? '');
    const simulationSpeed = ref(1);

    const mapStore = useMapStore();
    const mapData = computed(() => mapStore.mapData);

    // ---
    // Car management actions
    // ---
    function toggleCarRouteVisibility(carId) {
        const car = cars.value.find((c) => c.id === carId);

        if (!car) {
            return;
        }

        car.routeVisibility = !car.routeVisibility;
    }

    // ---
    // Parameter setter actions
    // ---
    function setCarTargetSpeed(value) {
        carTargetSpeed.value = value;
    }

    function setScenario(value) {
        scenario.value = value;
    }

    function setSimulationSpeed(value) {
        simulationSpeed.value = value;
    }

    // ---
    // Getters
    // ---
    const listOfCarsWithRouteVisibilityToggledOn = computed(() => {
        return cars.value.filter((car) => car.routeVisibility);
    });

    const selectedCarsWithRoutes = computed(() => {
        if (!mapData.value.length) {
            return [];
        }

        try {
            return addWaypointsToCarRoute(listOfCarsWithRouteVisibilityToggledOn.value);
        } catch (error) {
            console.error("Error building visible car routes:", error);
            return [];
        }
    });

    const allCarsWithRoutes = computed(() => {
        if (!mapData.value.length) {
            return [];
        }

        try {
            return addWaypointsToCarRoute(cars.value)
                .filter((car) => car.routeWaypoints); // Filter cars without route waypoints (e.g., 'inactive' route)
        } catch (error) {
            console.error("Error building configured car routes:", error);
            return [];
        }
    });

    const housesLinkedToRoutes = computed(() => {
        if (!mapData.value.length) {
            return [];
        }

        try {
            return getHousesWithRoutesByScenarioKey(scenario.value);
        } catch (error) {
            console.error("Error building scenario payload with routes:", error);
            return [];
        }
    });

    const baseHousesFromScenario = computed(() => {
        if (!mapData.value.length) {
            return [];
        }

        try {
            return housesLinkedToRoutes.value.map(({ ...house }) => house);
        } catch (error) {
            console.error("Error building base scenario houses:", error);
            return [];
        }
    });

    const orderedHouseInstancesOnRoutes = computed(() => {
        if (!mapData.value.length || !housesLinkedToRoutes.value.length) {
            return {};
        }

        try {
            return buildOrderedHouseInstancesOnRoutes(housesLinkedToRoutes.value);
        } catch (error) {
            console.error("Error building ordered house instances on routes:", error);
            return {};
        }
    });

    // ---
    // Simulation start payload getter
    // ---
    const simulationStartPayload = computed(() => {
        return {
            cars: allCarsWithRoutes.value,
            carTargetSpeed: carTargetSpeed.value,
            simulationSpeed: simulationSpeed.value,
            scenario: {
                name: scenario.value,
                houses: housesLinkedToRoutes.value,
            },
            housesOnRoutes: orderedHouseInstancesOnRoutes.value,
            mapRows: MAP_ROWS,
        };
    });

    function collectParameters() {
        return simulationStartPayload.value;
    }

    // ---
    // Return store API
    // ---
    return {
        // State
        cars,
        carTargetSpeed,
        scenario,
        simulationSpeed,

        // Constants
        routeOptions: ROUTE_OPTIONS,
        scenarioOptions: SCENARIO_OPTIONS,
        simulationSpeedOptions: SIMULATION_SPEED_OPTIONS,

        // Car management actions
        toggleCarRouteVisibility,

        // Parameter setters
        setCarTargetSpeed,
        setScenario,
        setSimulationSpeed,

        // Getters (computed properties)
        listOfCarsWithRouteVisibilityToggledOn,
        selectedCarsWithRoutes,
        allCarsWithRoutes,
        baseHousesFromScenario,
        housesLinkedToRoutes,
        simulationStartPayload,

        // Utilities
        collectParameters,
    };
});

// ---
// Default values for refs
// ---
const DEFAULT_CAR_SPEED = 50;

const DEFAULT_CARS = [
    {
        id: 1,
        maxPackages: 1,
        routeName: ROUTE_OPTIONS[1]?.value ?? '',
        routeVisibility: false,
    },
    {
        id: 2,
        maxPackages: 1,
        routeName: ROUTE_OPTIONS[0]?.value ?? '',
        routeVisibility: false,
    },
    {
        id: 3,
        maxPackages: 1,
        routeName: ROUTE_OPTIONS[0]?.value ?? '',
        routeVisibility: false,
    },
    {
        id: 4,
        maxPackages: 1,
        routeName: ROUTE_OPTIONS[0]?.value ?? '',
        routeVisibility: false,
    },
    {
        id: 5,
        maxPackages: 1,
        routeName: ROUTE_OPTIONS[0]?.value ?? '',
        routeVisibility: false,
    },
];