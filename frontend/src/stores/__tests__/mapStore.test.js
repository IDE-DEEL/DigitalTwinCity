import { describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMapStore } from '../mapStore';
describe('map store', () => {
 it('starts with an empty map', () => { setActivePinia(createPinia()); expect(useMapStore().mapData).toEqual([]); });
 it('replaces map data', () => { setActivePinia(createPinia()); const s=useMapStore(); s.setMapData([{x:1}]); expect(s.mapData).toEqual([{x:1}]); });
});
