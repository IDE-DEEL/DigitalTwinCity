import { describe, it, expect } from 'vitest';
import { getComponentById } from '../logic/service/mapService.js';
import { MapComponent } from '../logic/domain/MapComponent.js';

describe('mapService', () => {
  describe('getComponentById', () => {
    const components = [
      new MapComponent('straight', 'Straight Road', '/assets/straight.svg'),
      new MapComponent('curve', 'Curve Road', '/assets/curve.svg'),
      new MapComponent('t_split', 'T-Junction', '/assets/t_split.svg'),
      new MapComponent('cross_split', 'Crossroads', '/assets/cross_split.svg'),
      new MapComponent('roundabout', 'Roundabout', '/assets/roundabout.svg')
    ];

    it('should find component by id', () => {
      const result = getComponentById(components, 'straight');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('straight');
      expect(result.name).toBe('Straight Road');
    });

    it('should find curve component', () => {
      const result = getComponentById(components, 'curve');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('curve');
    });

    it('should find t_split component', () => {
      const result = getComponentById(components, 't_split');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('t_split');
    });

    it('should return undefined for non-existent component', () => {
      const result = getComponentById(components, 'nonexistent');
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty components array', () => {
      const result = getComponentById([], 'straight');
      
      expect(result).toBeUndefined();
    });
  });
});
