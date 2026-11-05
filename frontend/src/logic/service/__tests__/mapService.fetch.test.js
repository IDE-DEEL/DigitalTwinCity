import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMapData } from '../mapService.js';
describe('mapService fetchMapData', () => {
 beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); vi.spyOn(console, 'error').mockImplementation(() => {}); });
 afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
 it('loads map, component definitions and RFID data', async () => { const payloads = [[{ x: 1 }], [{ id: 'road', label: 'Road' }, { id: 'house', label: 'House' }], [{ tag: 7 }]]; fetch.mockImplementationOnce(() => Promise.resolve({ json: async () => payloads[0] })).mockImplementationOnce(() => Promise.resolve({ json: async () => payloads[1] })).mockImplementationOnce(() => Promise.resolve({ json: async () => payloads[2] })); expect(await fetchMapData()).toEqual({ mapData: payloads[0], componentDefinitions: { road: payloads[1][0], house: payloads[1][1] }, rfidData: payloads[2] }); expect(fetch.mock.calls.map(c => c[0])).toEqual(['/data/test-map4.json', '/data/map-components.json', '/data/rfid.json']); });
 it('handles empty component definitions', async () => { fetch.mockResolvedValue({ json: async () => [] }); expect((await fetchMapData()).componentDefinitions).toEqual({}); });
 it('reports fetch failures with a consistent error', async () => { fetch.mockRejectedValue(new Error('offline')); await expect(fetchMapData()).rejects.toThrow('Map data laden mislukt'); expect(console.error).toHaveBeenCalled(); });
 it('reports invalid JSON with a consistent error', async () => { fetch.mockResolvedValue({ json: async () => { throw new SyntaxError('bad JSON'); } }); await expect(fetchMapData()).rejects.toThrow('Map data laden mislukt'); });
});
