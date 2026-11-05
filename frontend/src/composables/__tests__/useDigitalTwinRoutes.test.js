import { describe, expect, it } from 'vitest';
import { reactive, nextTick } from 'vue';
import { useDigitalTwinRoutes } from '../useDigitalTwinRoutes';

const fixture = () => reactive({
  routes: [{ route: 'route_1', tags: ['a', 'b'] }],
  car_depot_routes: [{ auto_id: 'auto_A', tags_suffix: ['start'], tags_prefix: ['end'] }],
  tag_positions: [
    { tag_id: 'start', tag_pos: { x: 0, y: 0 } },
    { tag_id: 'a', tag_pos: { x: 10, y: 0 } },
    { tag_id: 'b', tag_pos: { x: 10, y: 10 } },
    { tag_id: 'end', tag_pos: { x: 20, y: 10 } },
  ], factor_x: 2, factor_y: 3,
});

describe('Digital Twin routes', () => {
  it('combines depot and route tags in the correct order', () => {
    const api = useDigitalTwinRoutes(fixture());
    expect(api.getRouteTags('auto_A', 'route_1')).toEqual(['start', 'a', 'b', 'end']);
    expect(api.getRouteTags('auto_A', 'inactive')).toEqual([]);
    expect(api.getRouteTags('unknown', 'missing')).toEqual([]);
  });
  it('exposes reactive tag positions', async () => {
    const store = fixture(); const api = useDigitalTwinRoutes(store);
    expect(api.tagMap.value.a).toEqual({ x: 10, y: 0 });
    store.tag_positions[1].tag_pos.x = 12;
    await nextTick();
    expect(api.tagMap.value.a.x).toBe(12);
  });
  it('returns no SVG path for inactive or unknown routes', () => {
    const api = useDigitalTwinRoutes(fixture());
    expect(api.generatePath('auto_A', 'inactive')).toBe('');
    expect(api.generatePath('unknown', 'missing')).toBe('');
  });
  it('draws straight sections with scaled coordinates', () => {
    const path = useDigitalTwinRoutes(fixture()).generatePath('auto_A', 'route_1');
    expect(path).toContain('M 0.00 0.00');
    expect(path).toContain('L 20.00 0.00');
    expect(path).toContain('L 20.00 30.00');
    expect(path).toContain('L 40.00 30.00');
    expect(path).not.toContain('C ');
    expect(path.endsWith('Z')).toBe(true);
  });
  it('draws a smooth curve for a diagonal segment', () => {
    const store = fixture();
    store.tag_positions[2].tag_pos.x = 15;
    const path = useDigitalTwinRoutes(store).generatePath('auto_A', 'route_1');
    expect(path).toContain('C ');
    expect(path).toContain('30.00 30.00');
    expect(path.endsWith('Z')).toBe(true);
  });
  it('handles a route containing only one known position', () => {
    const store = fixture(); store.routes = [{ route: 'single', tags: ['a'] }]; store.car_depot_routes = [];
    expect(useDigitalTwinRoutes(store).generatePath('auto_A', 'single')).toBe('M 20.00 0.00');
  });
});
