import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  mounted: [], unmounted: [], watchers: [],
  toast: { error: vi.fn(), info: vi.fn() },
  ws: { isConnected: true, connect: vi.fn(), disconnect: vi.fn(), send: vi.fn(() => true), registerResponseHandler: vi.fn() },
  state: { isSimulating: false, isPaused: false, cachedCsvData: null, cachedCsvStep: null, currentStep: 1,
    resetSimulationState: vi.fn(), handleSimulationStarted: vi.fn(), handleSimulationEnded: vi.fn(), updateSimulationState: vi.fn() },
  params: { simulationSpeed: 50, cars: [{ id: 'auto_A' }], routeOptions: [{ value: 'route_1' }], simulationStartPayload: { cars: [{ routeName: 'route_1' }], scenario: { houses: [{ routeNames: ['route_1'] }] } } },
  language: { getToastMessage: vi.fn(key => key) },
}));
vi.mock('vue', () => ({ onMounted: cb => deps.mounted.push(cb), onBeforeUnmount: cb => deps.unmounted.push(cb), watch: (getter, cb) => deps.watchers.push(cb) }));
vi.mock('vue-toastification', () => ({ useToast: () => deps.toast }));
vi.mock('../../stores/index.js', () => ({ useSimulationWebSocketStore: () => deps.ws, useSimulationStateStore: () => deps.state, useSimulationParameterStore: () => deps.params, useLanguageStore: () => deps.language }));
vi.mock('../../logic/service/carService', () => ({ addWaypointsToCarRoute: cars => cars.map(c => ({ ...c, routeWaypoints: ['a', 'b'] })) }));
import { useDigitalSimulation } from '../useDigitalSimulation.js';

beforeEach(() => {
  vi.clearAllMocks(); deps.mounted.length = 0; deps.unmounted.length = 0; deps.watchers.length = 0;
  deps.ws.isConnected = true; deps.ws.send.mockReturnValue(true);
  deps.state.isSimulating = false; deps.state.isPaused = false; deps.state.cachedCsvData = null; deps.state.cachedCsvStep = null; deps.state.currentStep = 1;
  deps.params.simulationStartPayload = { cars: [{ routeName: 'route_1' }], scenario: { houses: [{ routeNames: ['route_1'] }] } };
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('Digital simulation orchestration', () => {
  it('connects on mount and disconnects on unmount', () => {
    useDigitalSimulation(); deps.mounted[0]();
    expect(deps.state.resetSimulationState).toHaveBeenCalledOnce();
    expect(deps.ws.connect).toHaveBeenCalledOnce();
    deps.unmounted[0](); expect(deps.ws.disconnect).toHaveBeenCalledOnce();
  });
  it('stops active simulation on unmount', () => {
    useDigitalSimulation(); deps.state.isSimulating = true; deps.unmounted[0]();
    expect(deps.ws.send).toHaveBeenCalledWith({ command: 'stop' });
  });
  it('rejects start when disconnected or send fails', () => {
    const api = useDigitalSimulation(); deps.ws.isConnected = false;
    expect(api.startSimulation()).toBeUndefined(); expect(deps.toast.error).toHaveBeenCalled();
    deps.ws.isConnected = true; deps.ws.send.mockReturnValue(false);
    expect(api.startSimulation()).toBe(false);
  });
  it('starts a normal simulation and validates unreachable houses', () => {
    const api = useDigitalSimulation();
    deps.params.simulationStartPayload.scenario.houses = [{ routeNames: ['missing'] }];
    expect(api.startSimulation()).toBe(true);
    expect(deps.ws.send).toHaveBeenCalledWith(expect.objectContaining({ command: 'start', parameters: expect.objectContaining({ demoMode: false, demoRoutes: [] }) }));
    expect(deps.toast.info).toHaveBeenCalled();
    expect(deps.state.handleSimulationStarted).toHaveBeenCalledOnce();
  });
  it('generates demo routes and skips house validation', () => {
    const api = useDigitalSimulation();
    expect(api.startSimulation(true)).toBe(true);
    expect(deps.ws.send).toHaveBeenCalledWith(expect.objectContaining({ parameters: expect.objectContaining({ demoMode: true, demoRoutes: [{ carId: 'auto_A', routeName: 'route_1', routeWaypoints: ['a', 'b'] }] }) }));
    expect(deps.toast.info).not.toHaveBeenCalled();
  });
  it('registers pause and resume acknowledgement handlers', () => {
    const api = useDigitalSimulation(); deps.state.isSimulating = true;
    api.pauseSimulation();
    const pause = deps.ws.registerResponseHandler.mock.calls.find(([key]) => key === 'simulation_paused')[1];
    pause(); expect(deps.state.isPaused).toBe(true);
    api.resumeSimulation();
    const resume = deps.ws.registerResponseHandler.mock.calls.find(([key]) => key === 'simulation_resumed')[1];
    resume(); expect(deps.state.isPaused).toBe(false);
  });
  it('rejects invalid pause and resume conditions', () => {
    const api = useDigitalSimulation(); api.pauseSimulation(); api.resumeSimulation();
    expect(deps.toast.error).toHaveBeenCalledTimes(2);
  });
  it('reconnects and invokes end callback', () => {
    const ended = vi.fn(); const api = useDigitalSimulation(ended);
    api.reconnectWebSocket(); expect(deps.ws.disconnect).toHaveBeenCalledOnce();
    const callback = deps.ws.connect.mock.calls[0][1]; callback();
    expect(deps.state.handleSimulationEnded).toHaveBeenCalledOnce(); expect(ended).toHaveBeenCalledOnce();
    api.stopSimulation(); expect(deps.ws.send).toHaveBeenCalledWith({ command: 'stop' });
  });
  it('sends changed speed only during connected active simulation', () => {
    useDigitalSimulation(); deps.mounted[0]();
    deps.watchers[0](30); expect(deps.ws.send).not.toHaveBeenCalled();
    deps.state.isSimulating = true; deps.watchers[0](30);
    expect(deps.ws.send).toHaveBeenCalledWith({ command: 'set_speed', parameters: { simulationSpeed: 30 } });
  });
  it('uses cached CSV for the current step', async () => {
    deps.state.cachedCsvData = 'cached'; deps.state.cachedCsvStep = 1;
    expect(await useDigitalSimulation().exportDataAsCSV()).toBe('cached');
    expect(deps.ws.send).not.toHaveBeenCalled();
  });
  it('requests and caches CSV on success', async () => {
    const promise = useDigitalSimulation().exportDataAsCSV();
    const handler = deps.ws.registerResponseHandler.mock.calls.find(([key]) => key === 'export_data')[1];
    handler({ status: 'success', data: 'csv' });
    expect(await promise).toBe('csv'); expect(deps.state.cachedCsvData).toBe('csv');
  });
  it('rejects CSV errors and times out unanswered requests', async () => {
    const api = useDigitalSimulation();
    const promise = api.exportDataAsCSV();
    const handler = deps.ws.registerResponseHandler.mock.calls.find(([key]) => key === 'export_data')[1];
    handler({ status: 'error', message: 'failed' }); await expect(promise).rejects.toThrow('failed');
    const timeout = api.exportDataAsCSV(); const assertion = expect(timeout).rejects.toThrow('Request timeout');
    vi.advanceTimersByTime(120000); await assertion;
  });
});
