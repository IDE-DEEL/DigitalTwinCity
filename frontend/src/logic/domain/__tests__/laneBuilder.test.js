import { describe, expect, it } from 'vitest';
import { buildLane } from '../laneBuilder.js';

describe('laneBuilder regression', () => {
  it('returns no lanes for an empty map', () => {
    expect(buildLane([])).toEqual([]);
  });

  it('ignores tiles without lane definitions', () => {
    expect(buildLane([{ id: 9, type: '__unknown__', position: { x: 0, y: 0 } }])).toEqual([]);
  });

  it('builds lanes with sequential ids and global coordinates', () => {
    const result = buildLane([{ id: 7, type: 'straight', rotation: 0, position: { x: 3, y: 4 } }]);
    expect(result.length).toBeGreaterThan(0);
    result.forEach((lane, index) => {
      expect(lane.id).toBe(index);
      expect(lane.tileId).toBe(7);
      expect(lane.x).toBe(3);
      expect(lane.y).toBe(4);
      expect(lane.type).toBe('straight');
      expect(typeof lane.isLoop).toBe('boolean');
      expect(lane.points.length).toBeGreaterThan(0);
      lane.points.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(3);
        expect(x).toBeLessThanOrEqual(4);
        expect(y).toBeGreaterThanOrEqual(4);
        expect(y).toBeLessThanOrEqual(5);
      });
    });
  });

  it('treats a straight tile rotated 180 degrees as equivalent to 0 degrees', () => {
    const make = rotation => buildLane([{ id: 1, type: 'straight', rotation, position: { x: 0, y: 0 } }]);
    expect(make(180)).toEqual(make(0));
  });

  it('does not mutate the supplied map tiles', () => {
    const tiles = [{ id: 1, type: 'straight', rotation: 90, position: { x: 2, y: 2 } }];
    const snapshot = JSON.parse(JSON.stringify(tiles));
    buildLane(tiles);
    expect(tiles).toEqual(snapshot);
  });
});
