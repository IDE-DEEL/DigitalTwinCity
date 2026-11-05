import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ scenario: vi.fn(), coords: vi.fn(), routes: vi.fn(), houses: vi.fn(), store: vi.fn() }));
vi.mock('../../domain/scenarios', () => ({ getHousesForScenarioByValue: m.scenario }));
vi.mock('../../domain/houseInstances', () => ({ HOUSE_INSTANCES: [{ id: 'H1', tileX: 2, tileY: 3 }, { id: 'H2', tileX: 4, tileY: 5 }] }));
vi.mock('../../domain/houseBuilder.js', () => ({ buildHouseCoordinates: m.coords }));
vi.mock('../houseRouteMatchingService', () => ({ findRoutesForHouse: m.routes, findHousesForRoute: m.houses }));
vi.mock('../../domain/routes', () => ({ ROUTES_TILES: { A: {}, B: {} } }));
vi.mock('../../../stores/index.js', () => ({ useMapStore: m.store }));
import { getHousesByScenarioKey, getHousesWithRoutesByScenarioKey, buildOrderedHouseInstancesOnRoutes, getAllHouseInstances, getHousesForScenario } from '../houseService.js';
describe('houseService', () => {
 beforeEach(() => { vi.clearAllMocks(); m.scenario.mockReturnValue({ H1: 3, H2: 0 }); m.store.mockReturnValue({ mapData: [{ x: 2, y: 3, type: 'house', rotation: 90 }] }); m.coords.mockReturnValue({ roadCoords: [1], labelCoords: [2], supportedLanes: ['N'] }); m.routes.mockReturnValue(['A']); m.houses.mockImplementation(name => name === 'A' ? ['H1'] : []); });
 it('builds house payload with package counts', () => { const h = getHousesByScenarioKey('demo'); expect(h).toHaveLength(2); expect(h[0]).toMatchObject({ houseInstanceId: 'H1', expectedPackages: 3, tileX: 2, tileY: 3, roadCoords: [1], labelCoords: [2], supportedLanes: ['N'] }); });
 it('enriches coordinates with map tile data', () => { getHousesByScenarioKey('demo'); expect(m.coords).toHaveBeenCalledWith(expect.objectContaining({ id: 'H1', tileType: 'house', tileRotation: 90 })); });
 it('handles houses with no matching map tile', () => { getHousesByScenarioKey('demo'); expect(m.coords).toHaveBeenCalledWith(expect.objectContaining({ id: 'H2', tileType: undefined, tileRotation: undefined })); });
 it('attaches matching route names', () => { expect(getHousesWithRoutesByScenarioKey('demo')[0].routeNames).toEqual(['A']); expect(m.routes).toHaveBeenCalledTimes(2); });
 it('keeps only routes containing houses', () => { expect(buildOrderedHouseInstancesOnRoutes([])).toEqual({ A: ['H1'] }); expect(m.houses).toHaveBeenCalledWith('B', []); });
 it('returns all house definitions', () => { expect(getAllHouseInstances()).toHaveLength(2); });
 it('returns scenario definitions unchanged', () => { expect(getHousesForScenario('demo')).toEqual({ H1: 3, H2: 0 }); expect(m.scenario).toHaveBeenCalledWith('demo'); });
});
