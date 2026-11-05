import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ build: vi.fn() }));
vi.mock('../../domain/routes.js', () => ({ ROUTES_TILES: { demo: { tiles: [{ x: 1, y: 2 }] }, empty: { tiles: [] } } }));
vi.mock('../../domain/routeBuilder.js', () => ({ buildWaypointRouteFromTilePath: m.build }));
import { getWaypointRouteByName, getWaypointPreviewFromTilePath } from '../routeService.js';
describe('routeService', () => {
 beforeEach(() => { vi.clearAllMocks(); m.build.mockReturnValue([{ x: 0.5, y: 0.5 }]); });
 it('converts named routes into complete waypoints', () => { expect(getWaypointRouteByName('demo')).toEqual([{ x: 0.5, y: 0.5 }]); expect(m.build).toHaveBeenCalledWith([{ x: 1, y: 2 }], false); });
 it('rejects unknown routes', () => { expect(() => getWaypointRouteByName('missing')).toThrow('Unknown route "missing".'); expect(m.build).not.toHaveBeenCalled(); });
 it('supports an empty defined route', () => { getWaypointRouteByName('empty'); expect(m.build).toHaveBeenCalledWith([], false); });
 it('builds incomplete preview paths', () => { const path = [{ x: 2, y: 3 }]; expect(getWaypointPreviewFromTilePath(path)).toEqual([{ x: 0.5, y: 0.5 }]); expect(m.build).toHaveBeenCalledWith(path, true); });
 it('passes an empty preview path to the builder', () => { getWaypointPreviewFromTilePath([]); expect(m.build).toHaveBeenCalledWith([], true); });
});
