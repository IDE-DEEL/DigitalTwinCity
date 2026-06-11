import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { SCENARIO_OPTIONS } from "../logic/domain/scenarios";
import { addWaypointsToCarRoute } from "../logic/service/carService";
import { convertWaypointsArrayFromSvgToMath, convertWaypointFromSvgToMath } from "../logic/utils/coordinateConverter";
import { getHousesWithRoutesByScenarioKey, buildOrderedHouseInstancesOnRoutes } from "../logic/service/houseService";
import { useMapStore } from "./mapStore";
import { MAX_CARS, MIN_CARS, SIMULATION_SPEED_OPTIONS } from "../constants/constants";

const defaultCarSpeed = 50;

export const useDashboardParametersStore = defineStore("dashboardParameters", () => {
    // ---
    // State
    // ---
    const cars = ref([
        {
            id: '1',
            maxPackages: 1,
            routeName: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        },
        {
            id: '2',
            maxPackages: 1,
            routeName: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        },
        {
            id: '3',
            maxPackages: 1,
            routeName: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        },
        {
            id: '4',
            maxPackages: 1,
            routeName: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        },
        {
            id: '5',
            maxPackages: 1,
            routeName: ROUTE_OPTIONS[0]?.value ?? '',
            routeVisibility: false,
        },
    ]);
    const carTargetSpeed = ref(defaultCarSpeed);
    const scenario = ref('rustig');
    const simulationSpeed = ref(1);

    const mapStore = useMapStore();
    const mapData = computed(() => mapStore.mapData);

    // ---
    // Car management actions
    // ---
    function addCar() {
        if (cars.value.length < MAX_CARS) {
            const newCar = {
                id: `${cars.value.length + 1}`,
                maxPackages: 1,
                routeName: ROUTE_OPTIONS[0]?.value ?? '',
                routeVisibility: false,
            };
            cars.value.push(newCar);
        }
    }

    function removeCar() {
        if (cars.value.length > MIN_CARS) {
            cars.value.pop();
        }
    }

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

        car.routeName = routeName;
    }

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
            return addWaypointsToCarRoute(cars.value);
        } catch (error) {
            console.error("Error building configured car routes:", error);
            return [];
        }
    });

    const allCarsAndRoutesWithConvertedCoordinates = computed(() => {
        return allCarsWithRoutes.value.map((car) => ({
            ...car,
            routeWaypoints: convertWaypointsArrayFromSvgToMath(car.routeWaypoints),
        }));
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

    const housesWithConvertedCoordinates = computed(() => {
        return housesLinkedToRoutes.value.map((house) => ({
            ...house,
            labelCoords: convertWaypointFromSvgToMath(house.labelCoords),
            roadCoords: convertWaypointsArrayFromSvgToMath(house.roadCoords),
        }));
    });

    // ---
    // Simulation start payload getter
    // ---
    const simulationStartPayload = computed(() => {
        return {
            cars: allCarsAndRoutesWithConvertedCoordinates.value,
            carTargetSpeed: carTargetSpeed.value,
            simulationSpeed: simulationSpeed.value,
            scenario: {
                name: scenario.value,
                houses: housesWithConvertedCoordinates.value,
            },
            housesOnRoutes: orderedHouseInstancesOnRoutes.value,
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
        mapData,

        // Constants
        routeOptions: ROUTE_OPTIONS,
        scenarioOptions: SCENARIO_OPTIONS,
        simulationSpeedOptions: SIMULATION_SPEED_OPTIONS,

        // Car management actions
        addCar,
        removeCar,
        updateCarMaxPackageCount,
        updateCarRoute,
        toggleCarRouteVisibility,

        // Parameter setters
        setCarTargetSpeed,
        setScenario,
        setSimulationSpeed,

        // Getters (computed properties)
        listOfCarsWithRouteVisibilityToggledOn,
        selectedCarsWithRoutes,
        allCarsWithRoutes,
        allCarsAndRoutesWithConvertedCoordinates,
        baseHousesFromScenario,
        housesLinkedToRoutes,
        housesWithConvertedCoordinates,
        simulationStartPayload,

        // Utilities
        collectParameters,
    };
});
