import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { reactive, nextTick } from 'vue';

const methods = vi.hoisted(() => ({
  startSimulation: vi.fn(), pauseSimulation: vi.fn(), resumeSimulation: vi.fn(),
  stopSimulation: vi.fn(), reconnectWebSocket: vi.fn(), exportDataAsCSV: vi.fn(),
  ended: null,
}));
vi.mock('../useDigitalSimulation.js', () => ({ useDigitalSimulation: (cb) => { methods.ended = cb; return methods; } }));
import { useSimulationPageControls } from '../useSimulationPageControls.js';
const setup = () => {
  const paramStore = reactive({ cars: [{ id: 'auto_A', routeName: 'inactive' }], routeOptions: [{ value: 'route_1' }, { value: 'inactive' }] });
  const stateStore = reactive({ isPaused: false, isSimulating: false, autoOpenStatsModal: null, resetAutoOpenStatsModal: vi.fn(), handleSimulationEnded: vi.fn() });
  const wsStore = reactive({ isConnected: true });
  return { paramStore, stateStore, wsStore, api: useSimulationPageControls({ paramStore, stateStore, wsStore }) };
};
beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());
describe('Simulation page controls', () => {
  it('starts, stops, pauses and resumes via the simulation composable', () => {
    const { api, stateStore } = setup();
    api.handleSimulationStart(); expect(methods.startSimulation).toHaveBeenCalledWith();
    api.handleSimulationPauseToggle(); expect(methods.pauseSimulation).toHaveBeenCalledOnce();
    stateStore.isPaused = true; api.handleSimulationPauseToggle(); expect(methods.resumeSimulation).toHaveBeenCalledOnce();
    api.handleSimulationStop(); expect(methods.stopSimulation).toHaveBeenCalledOnce();
  });
  it('prevents rapid reconnect attempts and unlocks after five seconds', () => {
    const { api } = setup(); api.handleWebsocketReconnect(); api.handleWebsocketReconnect();
    expect(methods.reconnectWebSocket).toHaveBeenCalledOnce();
    expect(api.reconnectCooldown.value).toBe(true);
    vi.advanceTimersByTime(5000); expect(api.reconnectCooldown.value).toBe(false);
  });
  it('starts demo with an active route and stops when toggled off', () => {
    const { api, paramStore } = setup();
    expect(api.allCarsHaveInactiveRoute.value).toBe(true);
    api.toggleDemo();
    expect(api.demoEnabled.value).toBe(true);
    expect(paramStore.cars[0].routeName).toBe('route_1');
    expect(methods.startSimulation).toHaveBeenCalledWith(true);
    api.toggleDemo(); expect(methods.stopSimulation).toHaveBeenCalledOnce();
  });
  it('does not start demo without a connection', () => {
    const { api, wsStore } = setup(); wsStore.isConnected = false;
    api.toggleDemo(); expect(methods.startSimulation).not.toHaveBeenCalled();
  });
  it('ends demo on disconnection and opens statistics after normal simulation', async () => {
    const { api, wsStore, stateStore } = setup();
    api.toggleDemo(); wsStore.isConnected = false; await nextTick();
    expect(api.demoEnabled.value).toBe(false);
    expect(stateStore.handleSimulationEnded).toHaveBeenCalledOnce();
    methods.ended(); expect(api.isStatsModalOpen.value).toBe(true);
  });
  it('opens statistics when the state store requests it', async () => {
    const { api, stateStore } = setup();
    stateStore.autoOpenStatsModal = { value: true }; await nextTick();
    expect(api.isStatsModalOpen.value).toBe(true);
    expect(stateStore.resetAutoOpenStatsModal).toHaveBeenCalledOnce();
  });
});
