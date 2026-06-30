import { TILE_LANES } from "./laneCoords";
import {normalizeDegree,
    rotatePointNormalized,
    rotateCardinalDirection
} from "../utils/rotation";

function getRotation(tileType, rotation){
    const snapped = normalizeDegree(rotation || 0);
    const rotationStep = 180;

    if (tileType === 'straight') {
        return snapped % rotationStep;
    }
    return snapped;
}

/**
 * Builds the lane layer for the simulation based on the map tiles.
 */

export function buildLane(mapTiles) {
    const lanes = [];
    let laneId = 0;
    
    for (const tile of mapTiles) {
        const laneDefintions = TILE_LANES[tile.type];
        if (!laneDefintions) continue;

        const rotation = getRotation(tile.type, tile.rotation);

        for (const laneTemplate of laneDefintions.lanes) {
            const rotatedPoints = laneTemplate.points.map(p => 
                rotatePointNormalized(p, rotation)
            );

            const simulationPoints = rotatedPoints.map(p => ({
                x: tile.position.x + p.x,
                y: tile.position.y + p.y,
            }));

            const fromDirection = rotateCardinalDirection(laneTemplate.from, rotation);
            const toDirection = rotateCardinalDirection(laneTemplate.to, rotation);

            lanes.push({
                id: laneId++,
                tileId: tile.id,
                x: tile.position.x,
                y: tile.position.y,
                type: tile.type,
                from: fromDirection,
                to: toDirection,
                isLoop: !!laneTemplate.isLoop,
                points: simulationPoints,
            });
        }      
    }    
    return lanes;
}