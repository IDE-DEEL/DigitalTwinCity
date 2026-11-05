import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ build: vi.fn(), store: vi.fn() }));
vi.mock('../../domain/laneBuilder.js', () => ({ buildLane: m.build }));
vi.mock('../../../stores/index.js', () => ({ useMapStore: m.store }));
import { getLaneLayerForSimulation } from '../laneService.js';
describe('laneService', () => {
 beforeEach(() => { vi.clearAllMocks(); m.build.mockReturnValue([{ lane: 1 }]); });
 it('converts map tiles into lane-builder input', () => { m.store.mockReturnValue({ mapData: [{ x: 2, y: 4, type: 'road', rotation: 90 }] }); expect(getLaneLayerForSimulation()).toEqual([{ lane: 1 }]); expect(m.build).toHaveBeenCalledWith([{ id: '2-4', type: 'road', rotation: 90, position: { x: 2, y: 4 } }]); });
 it('normalizes negative and overflowing angles', () => { m.store.mockReturnValue({ mapData: [{ x: 0, y: 0, type: 'a', rotation: -90 }, { x: 1, y: 0, type: 'b', rotation: 450 }] }); getLaneLayerForSimulation(); expect(m.build.mock.calls[0][0].map(t => t.rotation)).toEqual([270, 90]); });
 it('defaults missing rotation to zero', () => { m.store.mockReturnValue({ mapData: [{ x: 0, y: 0, type: 'road' }] }); getLaneLayerForSimulation(); expect(m.build.mock.calls[0][0][0].rotation).toBe(0); });
 it('handles an empty map', () => { m.store.mockReturnValue({ mapData: [] }); getLaneLayerForSimulation(); expect(m.build).toHaveBeenCalledWith([]); });
});
