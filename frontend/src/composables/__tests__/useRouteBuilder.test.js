import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../constants/constants', () => ({
  DEPOT_EXIT: { x: 0, y: 0 },
  DEPOT_ENTRANCE: { x: 1, y: 0 },
  MAP_COLUMNS: 3,
  MAP_ROWS: 3,
}));
vi.mock('../../logic/domain/routeBuilder.js', () => ({
  OPPOSITE_DIRECTION: { N: 'S', E: 'W', S: 'N', W: 'E' },
  getDirectionBetweenTiles: vi.fn((from, to) => to.x > from.x ? 'E' : to.x < from.x ? 'W' : to.y > from.y ? 'S' : 'N'),
  getMapTile: vi.fn((x, y) => ({ x, y, type: x === 2 && y === 0 ? 'depot_middle' : 'straight' })),
  getRotatedLanesForTile: vi.fn(() => [
    { from: 'N', to: 'S' }, { from: 'S', to: 'N' },
    { from: 'E', to: 'W' }, { from: 'W', to: 'E' },
  ]),
}));
vi.mock('../../logic/service/routeService.js', () => ({
  getWaypointPreviewFromTilePath: vi.fn((tiles) => tiles.map(t => ({ x: t.x, y: t.y }))),
}));

import { useRouteBuilder } from '../useRouteBuilder.js';
import { getMapTile, getRotatedLanesForTile } from '../../logic/domain/routeBuilder.js';
import { getWaypointPreviewFromTilePath } from '../../logic/service/routeService.js';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe('Route builder composable', () => {
  it('starts at depot exit with an incomplete route', () => {
    const builder = useRouteBuilder();
    expect(builder.routeTiles.value).toEqual([{ x: 0, y: 0 }]);
    expect(builder.currentTile.value).toEqual({ x: 0, y: 0 });
    expect(builder.routeComplete.value).toBe(false);
  });
  it('offers connected neighboring tiles within bounds, excluding depot tiles', () => {
    const builder = useRouteBuilder();
    expect(builder.possibleNextTiles.value).toEqual([
      { x: 1, y: 0, dir: 'E' }, { x: 0, y: 1, dir: 'S' },
    ]);
  });
  it('marks a route complete when it reaches depot entrance', () => {
    const builder = useRouteBuilder();
    builder.selectTile({ x: 1, y: 0, dir: 'E' });
    expect(builder.routeComplete.value).toBe(true);
    expect(builder.currentTile.value.x).toBe(1);
    expect(builder.routeWaypoints.value).toHaveLength(2);
  });
  it('resets route and copy feedback', () => {
    const builder = useRouteBuilder();
    builder.selectTile({ x: 1, y: 0 });
    builder.setCopyFeedback('Copied');
    builder.resetRoute();
    expect(builder.routeTiles.value).toEqual([{ x: 0, y: 0 }]);
    expect(builder.copyFeedback.value).toBe('');
  });
  it('clears copy feedback after two seconds', () => {
    vi.useFakeTimers();
    const builder = useRouteBuilder();
    builder.setCopyFeedback('Copied');
    expect(builder.copyFeedback.value).toBe('Copied');
    vi.advanceTimersByTime(2000);
    expect(builder.copyFeedback.value).toBe('');
  });
  it('returns no waypoints if preview calculation fails', () => {
    getWaypointPreviewFromTilePath.mockImplementationOnce(() => { throw new Error('invalid route'); });
    const builder = useRouteBuilder();
    expect(builder.routeWaypoints.value).toEqual([]);
  });
  it('skips tiles whose map lookup fails', () => {
    getMapTile.mockImplementationOnce(() => { throw new Error('missing tile'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const builder = useRouteBuilder();
    expect(builder.possibleNextTiles.value).toEqual([{ x: 0, y: 1, dir: 'S' }]);
  });
  it('rejects neighbors without a connecting lane', () => {
    getRotatedLanesForTile.mockReturnValueOnce([]);
    const builder = useRouteBuilder();
    expect(builder.possibleNextTiles.value).not.toContainEqual({ x: 1, y: 0, dir: 'E' });
  });
});
