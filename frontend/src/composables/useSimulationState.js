import { ref } from "vue";
import { ROUTE_OPTIONS } from "../logic/domain/routes";
import { buildCarsWithRoutes } from "../logic/service/routeService";

// refs
const cars = ref([]);

// constants
const MAX_CARS = 5;

// ---
// adding and removing cars
// ---
function addCar() {
    // TODO: refactor to use early return
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
