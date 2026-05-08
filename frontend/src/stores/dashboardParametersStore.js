import { ref, computed } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { SCENARIO_OPTIONS } from "../logic/domain/scenarios";
import { addWaypointsToCarRoute } from "../logic/service/carService";
import { convertWaypointsArrayFromSvgToMath, convertWaypointFromSvgToMath } from "../logic/utils/coordinateConverter";
import { getHousesByScenarioKey, getHousesLinkedToRoutesByScenarioKey, buildRoutesWithOrderedHouses } from "../logic/service/houseService";
import { useMapStore } from "./mapStore";
import { MAX_CARS } from "../constants/constants";

// Dashboard parameters refs
const cars = ref([]);
const carTargetSpeed = ref(50);
const scenario = ref('rustig');
const isSimulating = ref(false);

// Import mapData from useMap store
const { mapData } = useMapStore();

// ---
// adding and removing cars
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
    if (cars.value.length > 0) {
        cars.value.pop();
    }
}

// ---
// updating max package count and route for a car
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
// setting dashboard parameters
// ---
function setCarTargetSpeed(value) {
    carTargetSpeed.value = value;
}

function setScenario(value) {
    scenario.value = value;
}

// ---
// computed properties derived from dashboard parameters
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

const carsAndRoutesWithConvertedCoordinates = computed(() => {
    return allCarsWithRoutes.value.map((car) => ({
        ...car,
        routeWaypoints: convertWaypointsArrayFromSvgToMath(car.routeWaypoints),
    }));
});

const baseHousesFromScenario = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return getHousesByScenarioKey(scenario.value);
    } catch (error) {
        console.error("Error building scenario payload:", error);
        return [];
    }
});

const housesLinkedToRoutes = computed(() => {
    if (!mapData.value.length) {
        return [];
    }

    try {
        return getHousesLinkedToRoutesByScenarioKey(scenario.value);
    } catch (error) {
        console.error("Error building scenario payload with routes:", error);
        return [];
    }
});

const housesWithConvertedCoordinates = computed(() => {
    return housesLinkedToRoutes.value.map((house) => ({
        ...house,
        labelCoords: convertWaypointFromSvgToMath(house.labelCoords),
        roadCoords: convertWaypointsArrayFromSvgToMath(house.roadCoords),
    }));
});

const housesOnRoutesWithConvertedCoordinates = computed(() => {
    if (!mapData.value.length) {
        return {};
    }

    // TODO: filter on selected routes only?
    // TODO: console log when a simulation is started in which a house on the selected scenario isn't serviced by any of the selected routes (for future toast.info)
    return buildRoutesWithOrderedHouses(scenario.value);
});

// ---
// simulation start payload
// ---
const simulationStartPayload = computed(() => {
    return {
        cars: carsAndRoutesWithConvertedCoordinates.value,
        carTargetSpeed: carTargetSpeed.value,
        simulationSpeed: 1, // TODO: make this configurable from dashboard parameters
        seed: 123, // TODO: make this configurable from dashboard parameters
        scenario: {
            name: scenario.value,
            houses: housesWithConvertedCoordinates.value,
        },
        housesOnRoutes: housesOnRoutesWithConvertedCoordinates.value,
    };
});

function collectParameters() {
    return simulationStartPayload.value;
}

// ---
// exporting composable
// ---
export function useDashboardParametersStore() {
    return {
        // refs
        cars,
        carTargetSpeed,
        scenario,
        isSimulating,
        mapData,

        // constants
        routeOptions: ROUTE_OPTIONS,
        scenarioOptions: SCENARIO_OPTIONS,

        // car management functions
        addCar,
        removeCar,
        updateCarMaxPackageCount,
        updateCarRoute,
        toggleCarRouteVisibility,

        // parameter setters
        setCarTargetSpeed,
        setScenario,

        // computed properties
        listOfCarsWithRouteVisibilityToggledOn,
        selectedCarsWithRoutes,
        allCarsWithRoutes,
        baseHousesFromScenario,
        housesLinkedToRoutes,
        housesWithConvertedCoordinates,
        simulationStartPayload,

        // utilities
        collectParameters,
    };
}
