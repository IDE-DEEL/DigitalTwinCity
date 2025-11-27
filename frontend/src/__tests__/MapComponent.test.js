import { describe, it, expect } from 'vitest';
import { MapComponent } from '../logic/domain/MapComponent.js';

describe('MapComponent', () => {
  it('should create a MapComponent with all properties', () => {
    const component = new MapComponent('straight', 'Straight Road', '/assets/straight.svg');
    
    expect(component.id).toBe('straight');
    expect(component.name).toBe('Straight Road');
    expect(component.image).toBe('/assets/straight.svg');
  });

  it('should create different component types', () => {
    const straight = new MapComponent('straight', 'Straight Road', '/assets/straight.svg');
    const curve = new MapComponent('curve', 'Curve Road', '/assets/curve.svg');
    const tSplit = new MapComponent('t_split', 'T-Junction', '/assets/t_split.svg');
    
    expect(straight.id).toBe('straight');
    expect(curve.id).toBe('curve');
    expect(tSplit.id).toBe('t_split');
  });
});
