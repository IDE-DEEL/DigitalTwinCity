import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getWaypointRouteByName: vi.fn(),
  buildWaypointsFromLaneSequence: vi.fn(),
  convertWaypointFromLocalToGlobal: vi.fn(),
  useMapStore: vi.fn(),
}));

vi.mock('../routeService', () => ({ getWaypointRouteByName: mocks.getWaypointRouteByName }));
vi.mock('../../domain/laneCoords', () => ({
  DEPOT_ROUTE_SEQUENCES: {
    1: { start: ['depot_start'], end: ['depot_end'] },
    2: { start: ['depot_start'], end: ['depot_end'] },
  },
  TILE_LANES: {
    depot_start: { lanes: [
      { carId: [1], route: 'start', points: [{ x: 1, y: 2 }] },
      { carId: [2], route: 'start', points: [{ x: 3, y: 4 }] },
      { carId: [1], route: 'end', points: [{ x: 5, y: 6 }] },
    ] },
    depot_end: { lanes: [
      { carId: [1, 2], route: 'end', points: [{ x: 7, y: 8 }] },
      { carId: [1], route: 'start', points: [{ x: 9, y: 10 }] },
    ] },
  },
}));
vi.mock('../../domain/routeBuilder.js', () => ({ buildWaypointsFromLaneSequence: mocks.buildWaypointsFromLaneSequence }));
vi.mock('../../../stores/mapStore.js', () => ({ useMapStore: mocks.useMapStore }));
vi.mock('../../utils/coordinateConverter.js', () => ({ convertWaypointFromLocalToGlobal: mocks.convertWaypointFromLocalToGlobal }));

import { addWaypointsToCarRoute } from '../carService.js';

describe('carService - depot waypoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useMapStore.mockReturnValue({ mapData: [
      { type: 'depot_start', x: 10, y: 20 },
      { type: 'depot_end', x: 30, y: 40 },
    ] });
    mocks.getWaypointRouteByName.mockReturnValue([{ id: 'main-route' }]);
    mocks.convertWaypointFromLocalToGlobal.mockImplementation((point, x, y) => ({ x: point.x + x, y: point.y + y }));
    mocks.buildWaypointsFromLaneSequence.mockImplementation(lanes => lanes.flatMap(l => l.points));
  });

  it('leaves inactive cars unchanged without loading a route', () => {
    const inactive = { id: 1, routeName: 'inactive', routeWaypoints: ['unchanged'] };
    expect(addWaypointsToCarRoute([inactive])[0]).toBe(inactive);
    expect(mocks.getWaypointRouteByName).not.toHaveBeenCalled();
  });

  it('adds start and end depot points around the regular route', () => {
    const result = addWaypointsToCarRoute([{ id: 1, routeName: 'route-a' }]);
    expect(mocks.getWaypointRouteByName).toHaveBeenCalledWith('route-a');
    expect(result[0].routeWaypoints).toEqual([
      { x: 11, y: 22 }, { id: 'main-route' }, { x: 37, y: 48 },
    ]);
  });

  it('selects depot lanes for the specific car ID', () => {
    const [first, second] = addWaypointsToCarRoute([
      { id: 1, routeName: 'route-a' }, { id: 2, routeName: 'route-b' },
    ]);
    expect(first.routeWaypoints[0]).toEqual({ x: 11, y: 22 });
    expect(second.routeWaypoints[0]).toEqual({ x: 13, y: 24 });
    expect(first.routeWaypoints.at(-1)).toEqual({ x: 37, y: 48 });
    expect(second.routeWaypoints.at(-1)).toEqual({ x: 37, y: 48 });
  });

  it('preserves other car properties without mutating the input', () => {
    const car = { id: 1, routeName: 'route-a', maxPackages: 4 };
    const [enriched] = addWaypointsToCarRoute([car]);
    expect(enriched).not.toBe(car);
    expect(enriched.maxPackages).toBe(4);
    expect(car).not.toHaveProperty('routeWaypoints');
  });

  it('returns the base waypoints when the car has no depot sequence', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const [car] = addWaypointsToCarRoute([{ id: 99, routeName: 'route-a' }]);
      expect(car.routeWaypoints).toEqual([{ id: 'main-route' }]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('carId 99'));
      expect(mocks.buildWaypointsFromLaneSequence).not.toHaveBeenCalled();
    } finally { warn.mockRestore(); }
  });

  it('returns an empty array for no cars', () => {
    expect(addWaypointsToCarRoute([])).toEqual([]);
  });
});
