import { describe, it, expect } from 'vitest';
import { MapCell } from '../logic/domain/MapCell.js';

describe('MapCell', () => {
  it('should create a MapCell with componentId and default rotation', () => {
    const cell = new MapCell('straight');
    
    expect(cell.componentId).toBe('straight');
    expect(cell.rotation).toBe(0);
  });

  it('should create a MapCell with custom rotation', () => {
    const cell = new MapCell('curve', 90);
    
    expect(cell.componentId).toBe('curve');
    expect(cell.rotation).toBe(90);
  });

  it('should support different rotation values', () => {
    const cell0 = new MapCell('straight', 0);
    const cell90 = new MapCell('curve', 90);
    const cell180 = new MapCell('t_split', 180);
    const cell270 = new MapCell('cross_split', 270);
    
    expect(cell0.rotation).toBe(0);
    expect(cell90.rotation).toBe(90);
    expect(cell180.rotation).toBe(180);
    expect(cell270.rotation).toBe(270);
  });
});
