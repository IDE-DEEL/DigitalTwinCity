import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSimulationParameterStore } from '../simulationParameterStore';
import { useMapStore } from '../mapStore';

beforeEach(() => setActivePinia(createPinia()));

describe('simulation parameters', () => {
  it('starts with five configured cars', () => {
    expect(useSimulationParameterStore().cars).toHaveLength(5);
  });
  it('toggles route visibility twice', () => {
    const store = useSimulationParameterStore();
    const original = store.cars[0].routeVisibility;
    store.toggleCarRouteVisibility(store.cars[0].id);
    expect(store.cars[0].routeVisibility).toBe(!original);
    store.toggleCarRouteVisibility(store.cars[0].id);
    expect(store.cars[0].routeVisibility).toBe(original);
  });
  it('ignores unknown car IDs', () => {
    const store = useSimulationParameterStore();
    const snapshot = JSON.stringify(store.cars);
    store.toggleCarRouteVisibility(-999);
    expect(JSON.stringify(store.cars)).toBe(snapshot);
  });
  it('filters cars by route visibility', () => {
    const store = useSimulationParameterStore();
    store.toggleCarRouteVisibility(store.cars[0].id);
    expect(store.listOfCarsWithRouteVisibilityToggledOn).toHaveLength(1);
  });
  it('updates simulation speed, car speed and scenario', () => {
    const store = useSimulationParameterStore();
    store.setSimulationSpeed(4);
    store.setCarTargetSpeed(35);
    store.setScenario('test-scenario');
    expect(store.simulationSpeed).toBe(4);
    expect(store.carTargetSpeed).toBe(35);
    expect(store.scenario).toBe('test-scenario');
  });
  it('does not calculate routes before map data is loaded', () => {
    const store = useSimulationParameterStore();
    expect(store.allCarsWithRoutes).toEqual([]);
    expect(store.selectedCarsWithRoutes).toEqual([]);
    expect(store.housesLinkedToRoutes).toEqual([]);
    expect(store.baseHousesFromScenario).toEqual([]);
  });
  it('creates a simulation payload from current parameters', () => {
    const store = useSimulationParameterStore();
    store.setCarTargetSpeed(42);
    store.setSimulationSpeed(2);
    const payload = store.collectParameters();
    expect(payload.carTargetSpeed).toBe(42);
    expect(payload.simulationSpeed).toBe(2);
    expect(payload.cars).toEqual([]);
    expect(payload.scenario.name).toBe(store.scenario);
  });
  it('stores loaded map data', () => {
    const store = useMapStore();
    store.setMapData([{ id: 'tile' }]);
    expect(store.mapData).toEqual([{ id: 'tile' }]);
  });
});
