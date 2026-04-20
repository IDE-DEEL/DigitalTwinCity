import { ref, computed } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { buildCarsWithRoutes } from "../logic/service/routeService";

// refs
const cars = ref([]);
const carSpeed = ref(50);
const scenario = ref('Rustig');
const isSimulating = ref(false);
const mapData = ref([]);

// constants
const MAX_CARS = 5;

// ---
// adding and removing cars
// ---
function addCar() {
    // TODO: potentially refactor to use early return in sprint 6
    if (cars.value.length < MAX_CARS) {
        const newCar = {
            id: `${cars.value.length + 1}`,
            packageCount: 1,
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
function updateCarPackageCount(carId, packageCount) {
    const car = cars.value.find((c) => c.id === carId);

    if (!car) {
        return;
    }

    car.packageCount = packageCount;
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
function setCarSpeed(value) {
    carSpeed.value = value;
}

function setScenario(value) {
    scenario.value = value;
}

function startSimulation() {
    isSimulating.value = true;
}

function stopSimulation() {
    isSimulating.value = false;
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

// ---
// collecting simulation parameters to build payload
// ---
const simulationStartPayload = computed(() => {
    if (!mapData.value.length) {
        return null;
    }

    return {
        carSettings: carsWithRoutes.value.map((car) => ({
            id: car.id,
            packageCount: car.packageCount,
            routeName: car.route,
            routeWaypoints: car.waypoints,
        })),
        carSpeed: carSpeed.value,
        scenario: scenario.value,
    };
});

function collectParameters() {
    return simulationStartPayload.value;
}

// ---
// exporting composable
// ---
export function useSimulationState() {
    return {
        cars,
        carSpeed,
        scenario,
        isSimulating,
        mapData,
        MAX_CARS,
        routeOptions: ROUTE_OPTIONS,

        addCar,
        removeCar,
        updateCarPackageCount,
        updateCarRoute,
        toggleCarRouteVisibility,
        setCarSpeed,
        setScenario,
        setMapData,
        startSimulation,
        stopSimulation,
        collectParameters,

        visibleCars,
        visibleCarsWithRoutes,
        carsWithRoutes,
        simulationStartPayload,
    };
}