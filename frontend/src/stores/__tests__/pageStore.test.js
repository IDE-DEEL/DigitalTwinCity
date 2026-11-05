import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { reactive } from 'vue';

const route = reactive({ path: '/digital-twin' });

vi.mock('vue-router', () => ({
    useRoute: () => route
}));

import { usePageStore } from '../pageStore.js';

describe('pageStore route selection', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        route.path = '/digital-twin';
    });

    afterEach(() => {
        setActivePinia(undefined);
    });

    it('selects the Digital Twin page for the default route', () => {
        const store = usePageStore();
        expect(store.currentPage).toBe('digital_twin');
        expect(store.isDigitalTwin).toBe(true);
        expect(store.isSimulation).toBe(false);
    });

    it('selects the simulation page for /simulation', () => {
        route.path = '/simulation';
        const store = usePageStore();
        expect(store.currentPage).toBe('simulation');
        expect(store.isDigitalTwin).toBe(false);
        expect(store.isSimulation).toBe(true);
    });

    it('reacts when the route changes', () => {
        const store = usePageStore();
        route.path = '/simulation';
        expect(store.isSimulation).toBe(true);
        route.path = '/digital-twin';
        expect(store.isDigitalTwin).toBe(true);
    });

    it('uses the Digital Twin fallback for unknown routes', () => {
        route.path = '/unknown';
        const store = usePageStore();
        expect(store.currentPage).toBe('digital_twin');
    });
});
