import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { getTileMetadata, getRotatedHouseCoordinatesForTile } from "./houseBuilder";
import { findRoutesForHouse, findHousesForRoute } from "./houseRouteMatchingService";
import { ROUTES_TILES } from "../domain/routes";

/**
 * Builds necessary house data for the simulation payload and package overlay based on the selected scenario and map data.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @returns {Array<Object>} An array of house objects with coordinates and package counts for the simulation.
 */
export function getHousesByScenarioKey(scenarioKey) {
    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, expectedPackages]) => {
        const instance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);
        const tileMetadata = getTileMetadata(instance.tileX, instance.tileY);
        
        const coordinates = getRotatedHouseCoordinatesForTile(
            tileMetadata.type,
            tileMetadata.rotation,
            instance.tileX,
            instance.tileY,
            instance.positionId
        );

        return {
            houseInstanceId,
            tileX: instance.tileX,
            tileY: instance.tileY,
            expectedPackages,
            roadCoords: coordinates.roadCoords,
            labelCoords: coordinates.labelCoords,
            supportedLanes: coordinates.supportedLanes,
        };
    });
}

/**
 * Builds house data for the simulation payload including the routes that pass through each house.
 * This is the extended version used when actually starting the simulation.
 *
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @returns {Array<Object>} An array of house objects with coordinates, package counts, and route names.
 */
export function getHousesLinkedToRoutesByScenarioKey(scenarioKey) {
    const houses = getHousesByScenarioKey(scenarioKey);

    return houses.map(house => ({
        ...house,
        routeNames: findRoutesForHouse(house),
    }));
}

/**
 * Builds route data with houses ordered by their appearance on each route.
 * This is used to determine package pickup order based on route progression.
 * 
 * @param {string} scenarioKey - The key/name of the scenario to retrieve houses for.
 * @returns {Object} An object with route names as keys and arrays of ordered houses as values.
 */
export function buildRoutesWithOrderedHouses(scenarioKey) {
    const baseHouses = getHousesByScenarioKey(scenarioKey);
    const routesWithHouses = {};

    // For each route, find all houses that lie on it, in route order
    for (const [routeName] of Object.entries(ROUTES_TILES)) {
        const housesOnRoute = findHousesForRoute(routeName, baseHouses);
        if (housesOnRoute.length > 0) {
            routesWithHouses[routeName] = housesOnRoute;
        }
    }

    return routesWithHouses;
}
