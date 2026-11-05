import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { useSimulationStateStore } from '../simulationStateStore';
import { useSimulationParameterStore } from '../simulationParameterStore';
import { useSimulationWebSocketStore } from '../simulationWebSocketStore';

beforeEach(() => setActivePinia(createPinia()));

describe('simulation state regression tests', () => {
  it('starts a simulation and records that it has run', () => {
    const store = useSimulationStateStore();
    store.handleSimulationStarted();
    expect(store.isSimulating).toBe(true);
    expect(store.hasSimulated).toBe(true);
  });

  it('ends a simulation and clears the pause flag', () => {
    const store = useSimulationStateStore();
    store.handleSimulationStarted();
    store.isPaused = true;
    store.handleSimulationEnded();
    expect(store.isSimulating).toBe(false);
    expect(store.isPaused).toBe(false);
  });

  it('resets all live simulation data and the pause flag', () => {
    const store = useSimulationStateStore();
    store.handleSimulationStarted();
    store.isPaused = true;
    store.updateSimulationState({ agents: [{ id: 1 }], houses: [{ id: 2 }], step: 15 });
    store.resetSimulationState();
    expect(store.agentState).toEqual([]);
    expect(store.houseState).toEqual([]);
    expect(store.currentStep).toBe(0);
    expect(store.isSimulating).toBe(false);
    expect(store.isPaused).toBe(false);
  });

  it('ignores connection loss when no simulation is running', () => {
    const store = useSimulationStateStore();
    store.hasSimulated = true;
    store.handleConnectionLost();
    expect(store.hasSimulated).toBe(true);
  });

  it('resets running simulation and history on connection loss', () => {
    const store = useSimulationStateStore();
    store.handleSimulationStarted();
    store.isPaused = true;
    store.handleConnectionLost();
    expect(store.isSimulating).toBe(false);
    expect(store.isPaused).toBe(false);
    expect(store.hasSimulated).toBe(false);
  });

  it('uses default values when update fields are absent', () => {
    const store = useSimulationStateStore();
    store.updateSimulationState({});
    expect(store.agentState).toEqual([]);
    expect(store.houseState).toEqual([]);
    expect(store.currentStep).toBe(0);
    expect(store.tripScores.total).toBe(0);
  });

  it('updates the latest simulation payload', () => {
    const store = useSimulationStateStore();
    store.updateSimulationState({ agents: [{ id: 3 }], houses: [{ id: 4 }], step: 7, trip_scores: { total: 8 } });
    expect(store.agentState).toEqual([{ id: 3 }]);
    expect(store.houseState).toEqual([{ id: 4 }]);
    expect(store.currentStep).toBe(7);
    expect(store.tripScores.total).toBe(8);
  });

  it('resets when the scenario changes', async () => {
    const store = useSimulationStateStore();
    const parameters = useSimulationParameterStore();
    store.handleSimulationStarted();
    parameters.setScenario('regression-test-scenario');
    await nextTick();
    expect(store.isSimulating).toBe(false);
  });

  it('resets when a car route changes', async () => {
    const store = useSimulationStateStore();
    const parameters = useSimulationParameterStore();
    store.handleSimulationStarted();
    parameters.cars[0].routeName = 'regression-test-route';
    await nextTick();
    expect(store.isSimulating).toBe(false);
  });

  it('resets a running simulation when the WebSocket disconnects', async () => {
    const ws = useSimulationWebSocketStore();
    const store = useSimulationStateStore();
    ws.isConnected = true;
    await nextTick();
    store.handleSimulationStarted();
    store.isPaused = true;
    ws.isConnected = false;
    await nextTick();
    expect(store.isSimulating).toBe(false);
    expect(store.isPaused).toBe(false);
  });
});
