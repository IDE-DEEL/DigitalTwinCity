import { getHousesForScenarioByValue } from "../domain/scenarios";
import { HOUSE_INSTANCES } from "../domain/houseInstances";
import { TILE_HOUSES } from "../domain/houseCoords";

export function getScenarioPayload(scenarioKey) {
    const houses = getHousesForScenarioByValue(scenarioKey);

    return Object.entries(houses).map(([houseInstanceId, packageCount]) => {
        const instance = HOUSE_INSTANCES.find(house => house.id === houseInstanceId);
        const coords = TILE_HOUSES[instance.tileType].roadCoords;

        return {
            houseInstanceId,
            tileX: instance.tileX,
            tileY: instance.tileY,
            packageCount,
            roadCoords: coords,
            packageCount
        };
    });
}