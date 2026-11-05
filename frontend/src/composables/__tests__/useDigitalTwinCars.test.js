import { afterEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref, nextTick } from 'vue';
import { useDigitalTwinCars } from '../useDigitalTwinCars';

const makeStore = () => reactive({
  tag_positions: [{ tag_id: 'a', tag_pos: { x: 0, y: 0 } }, { tag_id: 'b', tag_pos: { x: 10, y: 0 } }],
  car_data: [{ auto_id: 'auto_A', tag_id: 'a' }],
  table_data: [{ auto_id: 'auto_A', status: true, route: 'route_1' }],
  active: false, speed: 100,
});
let frames = [];
function runFrame() { const cb = frames.shift(); if (cb) cb(); }
afterEach(() => { vi.unstubAllGlobals(); frames = []; });

describe('Digital Twin car positions', () => {
  it('initializes active cars at their scanned RFID position', () => {
    const store = makeStore();
    const { carState } = useDigitalTwinCars(store, ref({ a: { x: 0, y: 0 } }), () => ['a']);
    expect(carState.positions.auto_A).toMatchObject({ x: 0, y: 0, initialized: false, rotation: 90 });
  });
  it('does not initialize inactive cars or invalid tag coordinates', () => {
    const store = makeStore(); store.table_data[0].status = false;
    const api = useDigitalTwinCars(store, ref({}), () => []);
    expect(api.carState.positions.auto_A).toBeUndefined();
  });
  it('initializes movement when animation starts and stops at the last scan', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(cb => { frames.push(cb); return frames.length; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const store = makeStore();
    const api = useDigitalTwinCars(store, ref({ a: { x: 0, y: 0 }, b: { x: 10, y: 0 } }), () => ['a', 'b']);
    store.active = true; await nextTick(); runFrame();
    expect(api.carState.positions.auto_A.initialized).toBe(true);
    store.car_data[0].tag_id = 'b';
    runFrame();
    expect(api.carState.positions.auto_A.x).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) runFrame();
    expect(api.carState.positions.auto_A).toMatchObject({ x: 10, y: 0, arrived: true, lastTagId: 'b' });
  });
});
