import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ buildLaneSequenceFromTilePath: vi.fn() }));
vi.mock('../../domain/routes', () => ({
  ROUTES_TILES: {
    inactive: { tiles: ['inactive'] },
    north: { tiles: ['north'] },
    south: { tiles: ['south'] },
    loop: { tiles: ['loop'] },
  },
}));
vi.mock('../../domain/routeBuilder', () => ({ buildLaneSequenceFromTilePath: mocks.buildLaneSequenceFromTilePath }));
import { findRoutesForHouse, findHousesForRoute } from '../houseRouteMatchingService.js';

const lane = (tileX, tileY, from, to) => ({ tileX, tileY, from, to });
const house = (houseInstanceId, tileX, tileY, from, to) => ({
  houseInstanceId, tileX, tileY, supportedLanes: [{ from, to }],
});

describe('houseRouteMatchingService - route and house matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildLaneSequenceFromTilePath.mockImplementation(tiles => {
      switch (tiles[0]) {
        case 'north': return [lane(1, 2, 'west', 'east'), lane(2, 2, 'west', 'east')];
        case 'south': return [lane(1, 2, 'north', 'south')];
        case 'loop': return [lane(2, 2, 'west', 'east'), lane(1, 2, 'west', 'east'), lane(2, 2, 'west', 'east')];
        default: return [];
      }
    });
  });

  it('finds routes that cross a house on a matching lane', () => {
    expect(findRoutesForHouse(house('A', 1, 2, 'west', 'east'))).toEqual(['north', 'loop']);
  });

  it('matches direction as well as tile coordinates', () => {
    expect(findRoutesForHouse(house('A', 1, 2, 'north', 'south'))).toEqual(['south']);
  });

  it('does not match a house on a different tile', () => {
    expect(findRoutesForHouse(house('A', 9, 9, 'west', 'east'))).toEqual([]);
  });

  it('does not match a house with an unsupported lane direction', () => {
    expect(findRoutesForHouse(house('A', 1, 2, 'east', 'west'))).toEqual([]);
  });

  it('skips the inactive route', () => {
    findRoutesForHouse(house('A', 1, 2, 'west', 'east'));
    expect(mocks.buildLaneSequenceFromTilePath).not.toHaveBeenCalledWith(['inactive']);
  });

  it('returns no houses for unknown or inactive routes', () => {
    expect(findHousesForRoute('missing', [house('A', 1, 2, 'west', 'east')])).toEqual([]);
    expect(findHousesForRoute('inactive', [house('A', 1, 2, 'west', 'east')])).toEqual([]);
    expect(mocks.buildLaneSequenceFromTilePath).not.toHaveBeenCalled();
  });

  it('returns matching house IDs in route order, not input order', () => {
    const houses = [house('B', 2, 2, 'west', 'east'), house('A', 1, 2, 'west', 'east')];
    expect(findHousesForRoute('north', houses)).toEqual(['A', 'B']);
  });

  it('returns repeated houses when a route visits them more than once', () => {
    const houses = [
      house('B', 2, 2, 'west', 'east'),
      house('A', 1, 2, 'west', 'east'),
    ];

    expect(findHousesForRoute('loop', houses)).toEqual(['B', 'A', 'B']);
  });

  it('ignores houses with a different lane on the same tile', () => {
    const houses = [house('wrong', 1, 2, 'north', 'south'), house('right', 1, 2, 'west', 'east')];
    expect(findHousesForRoute('north', houses)).toEqual(['right']);
  });

  it('returns an empty list when no houses are on the route', () => {
    expect(findHousesForRoute('north', [house('A', 8, 8, 'west', 'east')])).toEqual([]);
  });
});
