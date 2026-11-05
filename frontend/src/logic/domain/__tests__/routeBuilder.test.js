import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mapStore } = vi.hoisted(() => ({ mapStore: { mapData: [] } }));
vi.mock('../../../stores/mapStore.js', () => ({ useMapStore: () => mapStore }));
vi.mock('../laneCoords.js', () => ({
  TILE_LANES: {
    test_road: { lanes: [
      { from: 'W', to: 'E', points: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] },
      { from: 'E', to: 'W', points: [{ x: 1, y: 0.5 }, { x: 0, y: 0.5 }] },
    ] },
    t_split_out: { lanes: [{ from: 'S', to: 'E', points: [{ x: 0.5, y: 1 }] }] },
    t_split_in: { lanes: [{ from: 'W', to: 'E', points: [{ x: 0.5, y: 0 }] }] },
  },
}));

import {
  getDirectionBetweenTiles, getMapTile, getRotatedLanesForTile,
  findConnectingLane, buildLaneSequenceFromTilePath,
  buildWaypointsFromLaneSequence, buildWaypointRouteFromTilePath,
} from '../routeBuilder.js';

const start = { x: 0, y: 0, type: 't_split_out' };
const middle = { x: 1, y: 0, type: 'test_road' };
const end = { x: 2, y: 0, type: 't_split_in' };

beforeEach(() => { mapStore.mapData = [start, middle, end]; });

describe('routeBuilder regression', () => {
  it.each([
    [{ x: 0, y: 0 }, { x: 0, y: -1 }, 'N'],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, 'E'],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, 'S'],
    [{ x: 0, y: 0 }, { x: -1, y: 0 }, 'W'],
  ])('finds direction between neighboring tiles', (a, b, expected) => {
    expect(getDirectionBetweenTiles(a, b)).toBe(expected);
  });

  it('rejects diagonal and non-adjacent tiles', () => {
    expect(() => getDirectionBetweenTiles({ x: 0, y: 0 }, { x: 1, y: 1 })).toThrow('not cardinal neighbors');
    expect(() => getDirectionBetweenTiles({ x: 0, y: 0 }, { x: 2, y: 0 })).toThrow('not cardinal neighbors');
  });

  it('finds existing map tiles', () => {
    expect(getMapTile(1, 0)).toBe(middle);
  });

  it('rejects missing map tiles', () => {
    expect(() => getMapTile(9, 9)).toThrow('No tile found');
  });

  it('rotates lanes and converts their coordinates into global positions', () => {
    const lanes = getRotatedLanesForTile({ x: 3, y: 4, type: 'test_road', rotation: 0 });
    expect(lanes).toHaveLength(2);
    expect(lanes[0]).toMatchObject({ id: '3-4-0', tileX: 3, tileY: 4, from: 'W', to: 'E' });
    expect(lanes[0].points).toEqual([{ x: 3, y: 4.5 }, { x: 4, y: 4.5 }]);
  });

  it('rotates lane directions for rotated tiles', () => {
    const lanes = getRotatedLanesForTile({ x: 0, y: 0, type: 'test_road', rotation: 90 });
    expect(lanes[0].from).toBe('N');
    expect(lanes[0].to).toBe('S');
  });

  it('rejects tile types without lane definitions', () => {
    expect(() => getRotatedLanesForTile({ x: 0, y: 0, type: '__missing__' })).toThrow('No lane definition');
  });

  it('finds a connecting lane by incoming and outgoing direction', () => {
    const lanes = [{ from: 'W', to: 'E', id: 'ok' }, { from: 'E', to: 'W', id: 'other' }];
    expect(findConnectingLane(lanes, 'W', 'E').id).toBe('ok');
    expect(() => findConnectingLane(lanes, 'N', 'E')).toThrow('No connecting lane');
  });

  it('rejects routes with fewer than two tiles', () => {
    expect(() => buildLaneSequenceFromTilePath([])).toThrow('at least 2 tiles');
    expect(() => buildLaneSequenceFromTilePath(null)).toThrow('at least 2 tiles');
  });

  it('builds the depot-to-road-to-depot lane sequence', () => {
    const lanes = buildLaneSequenceFromTilePath([start, middle, end]);
    expect(lanes).toHaveLength(3);
    expect(lanes.map(l => [l.from, l.to])).toEqual([['S', 'E'], ['W', 'E'], ['W', 'E']]);
  });

  it('allows incomplete route previews and omits the last tile', () => {
    const lanes = buildLaneSequenceFromTilePath([start, middle, end], true);
    expect(lanes).toHaveLength(2);
  });

  it('rejects routes that do not start at an outgoing depot', () => {
    expect(() => buildLaneSequenceFromTilePath([middle, end])).toThrow('First tile in route');
  });

  it('rejects routes that do not end at an incoming depot', () => {
    mapStore.mapData = [start, middle];
    expect(() => buildLaneSequenceFromTilePath([start, middle])).toThrow('Last tile in route');
  });

  it('rejects routes without a suitable depot start lane', () => {
    mapStore.mapData = [start, { x: 0, y: 1, type: 'test_road' }];
    expect(() => buildLaneSequenceFromTilePath([{ x: 0, y: 0 }, { x: 0, y: 1 }])).toThrow('No depot start lane');
  });

  it('rounds lane waypoints to three decimals in sequence order', () => {
    expect(buildWaypointsFromLaneSequence([
      { points: [{ x: 1.12345, y: 2.98765 }] },
      { points: [{ x: 3, y: 4 }] },
    ])).toEqual([{ x: 1.123, y: 2.988 }, { x: 3, y: 4 }]);
  });

  it('builds a complete waypoint route from a tile path', () => {
    const result = buildWaypointRouteFromTilePath([start, middle, end]);
    expect(result).toHaveLength(4);
    expect(result.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });
});
