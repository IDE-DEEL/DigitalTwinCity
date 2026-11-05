import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSimulationParameterStore } from '../simulationParameterStore.js';
import { useMapStore } from '../mapStore.js';
import { addWaypointsToCarRoute } from '../../logic/service/carService.js';
import {
  getHousesWithRoutesByScenarioKey,
  buildOrderedHouseInstancesOnRoutes
} from '../../logic/service/houseService.js';

vi.mock('../../logic/service/carService.js', () => ({
  addWaypointsToCarRoute: vi.fn(cars => cars.map(car => ({
    ...car, routeWaypoints: [1, 2]
  })))
}));
vi.mock('../../logic/service/houseService.js', () => ({
  getHousesWithRoutesByScenarioKey: vi.fn(() => [{ id: 'house1' }]),
  buildOrderedHouseInstancesOnRoutes: vi.fn(() => ({ route1: ['house1'] }))
}));

describe('simulationParameterStore additional regression cases', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function withMap() {
    const map = useMapStore();
    map.mapData = [{ x: 0, y: 0 }];
    return useSimulationParameterStore();
  }

  it('toggles route visibility for a car and ignores unknown IDs', () => {
    const store = useSimulationParameterStore();
    const first = store.cars[0];
    expect(first.routeVisibility).toBe(false);
    store.toggleCarRouteVisibility(first.id);
    expect(first.routeVisibility).toBe(true);
    expect(store.listOfCarsWithRouteVisibilityToggledOn).toHaveLength(1);
    store.toggleCarRouteVisibility(first.id);
    expect(first.routeVisibility).toBe(false);
    store.toggleCarRouteVisibility(-999);
    expect(store.listOfCarsWithRouteVisibilityToggledOn).toHaveLength(0);
  });

  it('keeps derived routes empty until map data is available', () => {
    const store = useSimulationParameterStore();
    expect(store.selectedCarsWithRoutes).toEqual([]);
    expect(store.allCarsWithRoutes).toEqual([]);
    expect(store.housesLinkedToRoutes).toEqual([]);
    expect(store.baseHousesFromScenario).toEqual([]);
    expect(store.collectParameters().housesOnRoutes).toEqual({});
  });

  it('builds visible and configured routes when map data is loaded', () => {
    const store = withMap();
    store.toggleCarRouteVisibility(store.cars[0].id);
    expect(store.selectedCarsWithRoutes).toHaveLength(1);
    expect(store.allCarsWithRoutes).toHaveLength(5);
    expect(addWaypointsToCarRoute).toHaveBeenCalled();
  });

  it('builds scenario houses and ordered route instances', () => {
    const store = withMap();
    expect(store.housesLinkedToRoutes).toEqual([{ id: 'house1' }]);
    expect(store.baseHousesFromScenario).toEqual([{ id: 'house1' }]);
    expect(store.collectParameters().housesOnRoutes).toEqual({ route1: ['house1'] });
    expect(getHousesWithRoutesByScenarioKey).toHaveBeenCalled();
    expect(buildOrderedHouseInstancesOnRoutes).toHaveBeenCalled();
  });

  it('returns empty visible routes if waypoint generation fails', () => {
    const store = withMap();
    store.toggleCarRouteVisibility(store.cars[0].id);
    addWaypointsToCarRoute.mockImplementationOnce(() => { throw new Error('route failed'); });
    expect(store.selectedCarsWithRoutes).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns empty configured routes if waypoint generation fails', () => {
    const store = withMap();
    addWaypointsToCarRoute.mockImplementationOnce(() => { throw new Error('route failed'); });
    expect(store.allCarsWithRoutes).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns empty houses if scenario resolution fails', () => {
    const store = withMap();
    getHousesWithRoutesByScenarioKey.mockImplementationOnce(() => { throw new Error('scenario failed'); });
    expect(store.housesLinkedToRoutes).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });

  it('returns empty ordered instances if house ordering fails', () => {
    const store = withMap();
    buildOrderedHouseInstancesOnRoutes.mockImplementationOnce(() => { throw new Error('ordering failed'); });
    expect(store.collectParameters().housesOnRoutes).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  it('includes changed parameters in the simulation start payload', () => {
    const store = withMap();
    store.setCarTargetSpeed(70);
    store.setSimulationSpeed(2);
    store.setScenario('scenario-test');
    const payload = store.collectParameters();
    expect(payload.carTargetSpeed).toBe(70);
    expect(payload.simulationSpeed).toBe(2);
    expect(payload.scenario.name).toBe('scenario-test');
    expect(payload.cars).toHaveLength(5);
    expect(payload.mapRows).toBeDefined();
  });
});
