import { describe, expect, it } from 'vitest';
import { buildHouseCoordinates, generateRoadCoordsFromCenter, localToGlobalCoords } from '../houseBuilder.js';

describe('houseBuilder regression', () => {
  it('creates four square detection corners for straight tiles', () => {
    expect(generateRoadCoordsFromCenter({ x: 0.5, y: 0.5 }, 'straight')).toEqual([
      { x: 0.38, y: 0.38 }, { x: 0.62, y: 0.38 },
      { x: 0.62, y: 0.62 }, { x: 0.38, y: 0.62 },
    ]);
  });

  it('uses a wider detection zone for t-splits', () => {
    const corners = generateRoadCoordsFromCenter({ x: 0.5, y: 0.5 }, 't_split', 0);
    expect(corners[0].x).toBeCloseTo(0.26);
    expect(corners[0].y).toBeCloseTo(0.38);
    expect(corners[2].x).toBeCloseTo(0.74);
    expect(corners[2].y).toBeCloseTo(0.62);
  });

  it('rotates a curve detection zone by 45 degrees', () => {
    const corners = generateRoadCoordsFromCenter({ x: 0.5, y: 0.5 }, 'curve');
    expect(corners).toHaveLength(4);
    expect(corners[0].x).toBeCloseTo(0.5);
    expect(corners[0].y).toBeLessThan(0.38);
  });

  it('rotates a t-split zone by the tile rotation', () => {
    const original = generateRoadCoordsFromCenter({ x: 0.5, y: 0.5 }, 't_split', 0);
    const rotated = generateRoadCoordsFromCenter({ x: 0.5, y: 0.5 }, 't_split', 90);
    expect(rotated[0].x).toBeCloseTo(1 - original[0].y);
    expect(rotated[0].y).toBeCloseTo(original[0].x);
  });

  it('converts one local point into global coordinates', () => {
    expect(localToGlobalCoords({ x: 0.2, y: 0.8 }, 4, 7)).toEqual({ x: 4.2, y: 7.8 });
  });

  it('converts an array of local points into global coordinates', () => {
    expect(localToGlobalCoords([{ x: 0, y: 1 }, { x: 1, y: 0 }], 2, 3)).toEqual([
      { x: 2, y: 4 }, { x: 3, y: 3 },
    ]);
  });

  it('builds house road and label coordinates without altering supported lanes', () => {
    const supportedLanes = ['N', 'E'];
    const house = {
      roadCenter: { x: 0.5, y: 0.5 }, tileType: 'straight', tileRotation: 0,
      tileX: 3, tileY: 4, labelCoords: { x: 0.2, y: 0.3 }, supportedLanes,
    };
    const result = buildHouseCoordinates(house);
    expect(result.roadCoords).toHaveLength(4);
    expect(result.roadCoords[0].x).toBeCloseTo(3.38);
    expect(result.labelCoords).toEqual({ x: 3.2, y: 4.3 });
    expect(result.supportedLanes).toBe(supportedLanes);
  });
});
