import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initRfidMapper, convertTagToPosition, verifyTag } from '../rfidTagMapper.js';

const map = [
  { tileNumber: 7, type: 'straight', x: 3, y: 4, rotation: 0 },
  { tileNumber: 8, type: 'cross_split', x: 5, y: 6, rotation: 0 },
  { tileNumber: 9, type: 'straight', x: 1, y: 2, rotation: 180 },
];
const rfid = {
  tiles: [{ tile_nr: 7, template: 'road' }, { tile_nr: 9, template: 'road' }],
  tile_templates: { road: { type: 'straight', tags: [1, 2, 3, 4, 5, 6] } },
};

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  initRfidMapper(map, rfid);
});

describe('RFID tag mapper', () => {
  it('converts a known straight-tile tag to absolute coordinates', () => {
    expect(convertTagToPosition(7, 1)).toEqual({ x: 3.125, y: 4.375 });
  });
  it('accepts split tag indices', () => {
    expect(convertTagToPosition(7, '2a')).toEqual({ x: 3.375, y: 4.375 });
    expect(convertTagToPosition(7, '2b')).toEqual({ x: 3.625, y: 4.375 });
  });
  it('applies tile rotation', () => {
    const position = convertTagToPosition(9, 1);
    expect(position.x).toBeCloseTo(1.875);
    expect(position.y).toBeCloseTo(2.625);
  });
  it('returns null when the tile is absent', () => {
    expect(convertTagToPosition(999, 1)).toBeNull();
  });
  it('uses map tile type when RFID configuration does not contain the tile', () => {
    expect(convertTagToPosition(8, 1)).toEqual({ x: 5.375, y: 6.125 });
  });
  it('returns null for unknown tag positions', () => {
    expect(convertTagToPosition(7, 999)).toBeNull();
  });
  it('verifies registered tags and split variants', () => {
    expect(verifyTag(7, 1)).toBe(true);
    expect(verifyTag(7, '2a')).toBe(true);
    expect(verifyTag(7, '5b')).toBe(true);
    expect(verifyTag(7, 999)).toBe(false);
  });
  it('rejects unknown tiles and missing configuration', () => {
    expect(verifyTag(999, 1)).toBe(false);
    initRfidMapper(map, null);
    expect(verifyTag(7, 1)).toBe(false);
    expect(convertTagToPosition(7, 1)).toEqual({ x: 3.125, y: 4.375 });
  });
  it('handles an uninitialized map', () => {
    initRfidMapper(null, rfid);
    expect(convertTagToPosition(7, 1)).toBeNull();
  });
});
