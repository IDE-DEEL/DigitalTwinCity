import { describe, expect, it } from 'vitest';
import { useCarColors } from '../useCarColors';
import { CAR_ROUTE_COLORS } from '../../constants/constants';

describe('car route colors', () => {
  it('returns the configured color for every known car', () => {
    const { getColorForCarAndRoute } = useCarColors();
    for (const [carId, color] of Object.entries(CAR_ROUTE_COLORS)) {
      expect(getColorForCarAndRoute(carId)).toBe(color);
    }
  });
  it('uses blue for unknown cars', () => {
    expect(useCarColors().getColorForCarAndRoute('unknown')).toBe('blue');
  });
});
