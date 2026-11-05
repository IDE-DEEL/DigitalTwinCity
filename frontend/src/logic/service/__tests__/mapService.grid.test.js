import { describe, expect, it } from 'vitest';
import { createMapGrid } from '../mapService.js';
import { MapCell } from '../../domain/MapCell.js';

const definitions = {
  road: {
    label: 'Road',
    imagePath: '/road.png',
    pathConnections: ['N', 'S'],
  },
  house: {
    label: 'House',
    imagePath: '/house.png',
  },
};

describe('mapService createMapGrid', () => {
  it('maakt een vierkant grid met de opgegeven dimensie', () => {
    const grid = createMapGrid([], definitions, 3);
    expect(grid).toHaveLength(3);
    expect(grid.every(row => row.length === 3)).toBe(true);
    expect(grid.flat().every(cell => cell instanceof MapCell)).toBe(true);
  });

  it('vult ontbrekende posities met lege MapCell-objecten', () => {
    const grid = createMapGrid([], definitions, 2);
    expect(grid[0][0]).toMatchObject({ x: 0, y: 0, key: '0-0', type: 'empty', label: 'Empty', imagePath: '', pathConnections: [] });
    expect(grid[1][1]).toMatchObject({ x: 1, y: 1, key: '1-1', type: 'empty', rotation: 0 });
    expect(grid[0][0].isRoad).toBe(false);
  });

  it('plaatst kaartcomponenten op de juiste x- en y-coördinaten', () => {
    const grid = createMapGrid([{ type: 'road', x: 2, y: 1, rotation: 90 }], definitions, 3);
    expect(grid[1][2]).toMatchObject({ x: 2, y: 1, key: '2-1', type: 'road', rotation: 90, label: 'Road', imagePath: '/road.png', pathConnections: ['N', 'S'] });
    expect(grid[1][2].isRoad).toBe(true);
    expect(grid[2][1].type).toBe('empty');
  });

  it('negeert onbekende componenttypes', () => {
    const grid = createMapGrid([{ type: 'missing', x: 0, y: 0, rotation: 0 }], definitions, 1);
    expect(grid[0][0].type).toBe('empty');
  });

  it('negeert componenten buiten de bovengrens van het grid', () => {
    const grid = createMapGrid([
      { type: 'road', x: 2, y: 0 },
      { type: 'road', x: 0, y: 2 },
    ], definitions, 2);
    expect(grid.flat().every(cell => cell.type === 'empty')).toBe(true);
  });

  it('gebruikt de laatst opgegeven component bij dubbele coördinaten', () => {
    const grid = createMapGrid([
      { type: 'road', x: 0, y: 0, rotation: 0 },
      { type: 'house', x: 0, y: 0, rotation: 180 },
    ], definitions, 1);
    expect(grid[0][0]).toMatchObject({ type: 'house', label: 'House', rotation: 180, pathConnections: [] });
  });

  it('geeft een leeg grid terug bij dimensie nul', () => {
    expect(createMapGrid([], definitions, 0)).toEqual([]);
  });
});
