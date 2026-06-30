import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { buildHouseCoordinates } from "../domain/houseBuilder.js";
import { findRoutesForHouse, findHousesForRoute } from "./houseRouteMatchingService";
import { ROUTES_TILES } from "../domain/routes";
import { useMapStore } from "../../stores/index.js";

/**
 * Builds necessary house data for the simulation payload and package overlay based on the selected scenario and map data.
*
* @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
* @returns {Array<Object>} An array of house objects with coordinates and package counts for the simulation.
*/
export function getHousesByScenarioKey(scenarioKey) {
    const mapStore = useMapStore();

    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, expectedPackages]) => {
        const houseInstance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);

        const tileData = mapStore.mapData.find(
            tile => tile.x === houseInstance.tileX && tile.y === houseInstance.tileY
        );
        
        // add tile types to the houses for better detection zone building
        const enrichedHouseInstances = {
            ...houseInstance,
            tileType: tileData?.type,
            tileRotation: tileData?.rotation,
        };

        const coordinates = buildHouseCoordinates(enrichedHouseInstances);

        return {
            houseInstanceId,
            tileX: enrichedHouseInstances.tileX,
            tileY: enrichedHouseInstances.tileY,
            expectedPackages,
            roadCoords: coordinates.roadCoords,
            labelCoords: coordinates.labelCoords,
            supportedLanes: coordinates.supportedLanes,
        };
    });
}

/**
 * Builds house data including the routes that pass through each house.
 * Shared internal function to avoid recalculating getHousesByScenarioKey.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @returns {Array<Object>} An array of house objects with coordinates, package counts, and route names.
 */
export function getHousesWithRoutesByScenarioKey(scenarioKey) {
    const houses = getHousesByScenarioKey(scenarioKey);

    return houses.map(house => ({
        ...house,
        routeNames: findRoutesForHouse(house),
    }));
}

/**
 * Builds ordered house instance IDs for each route.
 * Houses are ordered by their appearance on the route.
 * This is used to determine package pickup order based on route progression.
 * 
 * @param {Array<Object>} housesWithRoutes - Array of house objects with routeNames property.
 * @returns {Object} An object with route names as keys and arrays of ordered houseInstanceIds as values.
 */
export function buildOrderedHouseInstancesOnRoutes(housesWithRoutes) {
    const routesWithHouseIds = {};

    // For each route, find all houses that lie on it, in route order
    for (const [routeName] of Object.entries(ROUTES_TILES)) {
        const housesOnRoute = findHousesForRoute(routeName, housesWithRoutes);
        if (housesOnRoute.length > 0) {
            routesWithHouseIds[routeName] = housesOnRoute;
        }
    }

    return routesWithHouseIds;
}

export function getAllHouseInstances() {
    return HOUSE_INSTANCES;
}

export function getHousesForScenario(scenarioKey) {
    return getHousesForScenarioByValue(scenarioKey);
}