import { buildLane } from '../domain/laneBuilder.js';
import { useMapStore } from '../../stores/index.js';
import { normalizeDegree } from '../utils/rotation.js';

export function getLaneLayerForSimulation() {
    const mapStore = useMapStore();

    const tiles = mapStore.mapData.map(item => ({
        id: `${item.x}-${item.y}`,
        type: item.type,
        rotation: normalizeDegree(item.rotation || 0),
        position: { x: item.x, y: item.y },
    }));

    return buildLane(tiles);
}