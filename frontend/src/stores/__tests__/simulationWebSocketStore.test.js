import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const toast = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn() }));
vi.mock('vue-toastification', () => ({ useToast: () => toast }));
import { useSimulationWebSocketStore } from '../simulationWebSocketStore';

let sockets;
class MockSocket {
  static OPEN = 1;
  constructor(url) { this.url = url; this.readyState = 0; this.send = vi.fn(); sockets.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
  message(data) { this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) }); }
  close() { this.readyState = 3; this.onclose?.(); }
  error() { this.onerror?.(); }
}

beforeEach(() => {
  setActivePinia(createPinia());
  sockets = [];
  toast.error.mockClear(); toast.info.mockClear();
  vi.stubGlobal('WebSocket', MockSocket);
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('document', { documentElement: { lang: 'nl' } });
});
afterEach(() => vi.unstubAllGlobals());

describe('simulation WebSocket', () => {
  it('connects and updates connection flags', () => {
    const store = useSimulationWebSocketStore();
    store.connect();
    expect(store.isConnecting).toBe(true);
    sockets[0].open();
    expect(store.isConnected).toBe(true);
    expect(store.isConnecting).toBe(false);
  });
  it('does not open duplicate sockets', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); store.connect();
    expect(sockets).toHaveLength(1);
  });
  it('sends serialized messages only on an open connection', () => {
    const store = useSimulationWebSocketStore();
    expect(store.send({ command: 'pause' })).toBe(false);
    store.connect(); sockets[0].open();
    expect(store.send({ command: 'pause' })).toBe(true);
    expect(sockets[0].send).toHaveBeenCalledWith('{"command":"pause"}');
  });
  it('forwards simulation updates', () => {
    const callback = vi.fn();
    const store = useSimulationWebSocketStore();
    store.connect(callback); sockets[0].open();
    sockets[0].message({ command: 'simulation_update', result: { step: 3 } });
    expect(callback).toHaveBeenCalledWith({ step: 3 });
  });
  it.each(['simulation_ended', 'simulation_deadlocked'])('ends on %s', (command) => {
    const updated = vi.fn(); const ended = vi.fn();
    const store = useSimulationWebSocketStore();
    store.connect(updated, ended); sockets[0].open();
    sockets[0].message({ command, result: { step: 9 } });
    expect(updated).toHaveBeenCalledOnce();
    expect(ended).toHaveBeenCalledOnce();
  });
  it('handles registered response callbacks once', () => {
    const handler = vi.fn();
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open();
    store.registerResponseHandler('ack', handler);
    sockets[0].message({ command: 'ack', result: true });
    sockets[0].message({ command: 'ack', result: true });
    expect(handler).toHaveBeenCalledOnce();
  });
  it('reports malformed JSON only once per connection', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open();
    sockets[0].message('{bad json');
    sockets[0].message('null');
    expect(toast.error).toHaveBeenCalledOnce();
  });
  it('rejects simulation updates with missing result', () => {
    const updated = vi.fn();
    const store = useSimulationWebSocketStore();
    store.connect(updated); sockets[0].open();
    sockets[0].message({ command: 'simulation_update' });
    expect(updated).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledOnce();
  });
  it('reports validation errors', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open();
    sockets[0].message({ command: 'error', result: { type: 'validation_error' } });
    expect(toast.error).toHaveBeenCalledOnce();
  });
  it('does not notify on intentional disconnect', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open();
    store.disconnect();
    expect(store.isConnected).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });
  it('notifies once on unexpected socket failure', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open();
    sockets[0].error(); sockets[0].close();
    expect(store.isConnected).toBe(false);
    expect(toast.error).toHaveBeenCalledOnce();
  });
  it('allows reconnecting after an unexpected close', () => {
    const store = useSimulationWebSocketStore();
    store.connect(); sockets[0].open(); sockets[0].close();
    store.connect();
    expect(sockets).toHaveLength(2);
  });
});
