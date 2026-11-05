import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, reactive, ref } from 'vue';
import { useDigitalTwinCars } from '../useDigitalTwinCars.js';

let scope;
let frames;

function setup(overrides = {}, routeTags = ['a', 'b', 'c']) {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', vi.fn(callback => {
        frames.push(callback);
        return frames.length;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const store = reactive({
        tag_positions: [
            { tag_id: 'a', tag_pos: { x: 0, y: 0 } },
            { tag_id: 'b', tag_pos: { x: 10, y: 0 } },
            { tag_id: 'c', tag_pos: { x: 20, y: 0 } }
        ],
        car_data: [{ auto_id: 'car1', tag_id: 'a' }],
        table_data: [{ auto_id: 'car1', status: true, route: 'route1' }],
        active: false,
        speed: 100,
        ...overrides
    });
    const tagMap = ref({
        a: { x: 0, y: 0 },
        b: { x: 10, y: 0 },
        c: { x: 20, y: 0 }
    });
    const getRouteTags = vi.fn(() => routeTags);
    scope = effectScope();
    const result = scope.run(() => useDigitalTwinCars(store, tagMap, getRouteTags));
    return { store, tagMap, getRouteTags, ...result };
}

function frame() {
    const callback = frames.shift();
    expect(callback).toBeTypeOf('function');
    callback();
}

async function start(store) {
    store.active = true;
    await nextTick();
    frame(); // first scan initializes the position
}

afterEach(() => {
    scope?.stop();
    scope = undefined;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    frames = [];
});

describe('useDigitalTwinCars additional regression cases', () => {
    it('does not initialize a car when its RFID coordinates are invalid', () => {
        const { carState } = setup({
            tag_positions: [{ tag_id: 'a', tag_pos: { x: NaN, y: 0 } }]
        });
        expect(carState.positions.car1).toBeUndefined();
    });

    it('does not initialize a car without a matching RFID scan', () => {
        const { carState } = setup({ car_data: [{ auto_id: 'car1', tag_id: 'unknown' }] });
        expect(carState.positions.car1).toBeUndefined();
    });


    it('initializes a newly active car after store data changes', async () => {
        const { store, carState } = setup({
            table_data: [
                { auto_id: 'car1', status: false, route: 'route1' }
            ]
        });

        expect(carState.positions.car1).toBeUndefined();

        store.table_data = [
            { auto_id: 'car1', status: true, route: 'route1' }
        ];

        await nextTick();

        expect(carState.positions.car1).toMatchObject({
            x: 0,
            y: 0,
            initialized: false
        });
    });


    it('does not move an inactive car', async () => {
        const { store, carState } = setup();
        await start(store);
        store.table_data[0].status = false;
        store.car_data[0].tag_id = 'b';
        frame();
        expect(carState.positions.car1).toMatchObject({ x: 0, y: 0, routeIndex: 0 });
    });

    it('does not move when no route tags are available', async () => {
        const { store, carState } = setup({}, []);
        await start(store);
        expect(carState.positions.car1.initialized).toBe(false);
        frame();
        expect(carState.positions.car1.x).toBe(0);
    });

    it('does not move when car metadata is missing', async () => {
        const { store, carState } = setup();
        await start(store);
        store.car_data = [];
        frame();
        expect(carState.positions.car1).toMatchObject({ x: 0, y: 0 });
    });

    it('jumps to a scanned tag when multiple route steps were skipped', async () => {
        const { store, carState } = setup();
        await start(store);
        store.car_data[0].tag_id = 'c';
        frame();
        expect(carState.positions.car1).toMatchObject({
            x: 20, y: 0, routeIndex: 2, lastTagId: 'c', arrived: true
        });
    });

    it('stays at the arrived position until another tag is scanned', async () => {
        const { store, carState } = setup();
        await start(store);
        store.car_data[0].tag_id = 'c';
        frame();
        frame();
        expect(carState.positions.car1).toMatchObject({ x: 20, arrived: true });
    });

    it('ignores a scan outside the current route', async () => {
        const { store, carState } = setup();
        await start(store);
        store.car_data[0].tag_id = 'outside';
        frame();
        expect(carState.positions.car1).toMatchObject({ x: 0, targetTagId: null });
    });

    it('stops moving if the target tag has no coordinates', async () => {
        const { store, tagMap, carState } = setup();
        await start(store);
        store.car_data[0].tag_id = 'b';
        tagMap.value = { a: { x: 0, y: 0 } };
        frame();
        expect(carState.positions.car1).toMatchObject({ x: 0, targetTagId: null });
    });
});
