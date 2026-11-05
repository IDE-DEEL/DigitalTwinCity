import { describe, it, expect } from 'vitest'
import { useDigitalTwinVisuals } from '../useDigitalTwinVisuals'

const makeStore = () => ({
  factor_x: 2, factor_y: 3,
  table_data: [{ auto_id: 1, color: '#ff0000', pakketje: 4 }, { auto_id: 2, pakketje: 0 }],
  chosen_tag: null, chosen_scenario: 'A',
  scenario_houses: [{ Scenario: 'A', tags: [{ tag_id: 10, undeliverd_packages: 3 }] }],
  houses: [{ tag_id: 10, pos: { x: 1, y: 2 } }],
})

describe('Digital Twin visuals', () => {
  it('converts coordinates to pixel styles', () => {
    const visuals = useDigitalTwinVisuals(makeStore())
    expect(visuals.getStyle({ x: 4, y: 5 })).toEqual({ left: '8px', top: '15px' })
  })
  it('creates CSS rotation', () => {
    expect(useDigitalTwinVisuals(makeStore()).getRotation({ rotation: 90 })).toEqual({ transform: 'rotate(90deg)' })
  })
  it('uses configured car color and fallback', () => {
    const visuals = useDigitalTwinVisuals(makeStore())
    expect(visuals.getCarColor(1)).toBe('#ff0000')
    expect(visuals.getCarColor(999)).toBe('#808080')
    expect(visuals.getCarColor(2)).toBe('#808080')
  })
  it('darkens RGB channels using the default percentage', () => {
    expect(useDigitalTwinVisuals(makeStore()).darkenColor('#ffffff')).toBe('rgb(204, 204, 204)')
  })
  it('accepts a custom darkening percentage', () => {
    expect(useDigitalTwinVisuals(makeStore()).darkenColor('#ff0000', 50)).toBe('rgb(127, 0, 0)')
  })
  it('updates selected tag on the store', () => {
    const store = makeStore()
    useDigitalTwinVisuals(store).selectTag('tag-12')
    expect(store.chosen_tag).toBe('tag-12')
  })
  it('returns package counts and zero for unknown cars', () => {
    const visuals = useDigitalTwinVisuals(makeStore())
    expect(visuals.getPackages(1)).toBe(4)
    expect(visuals.getPackages(2)).toBe(0)
    expect(visuals.getPackages(999)).toBe(0)
  })
  it('maps scenario tags to house positions and package counts', () => {
    expect(useDigitalTwinVisuals(makeStore()).createHousePackagesList()).toEqual([
      { tag_id: 10, pos: { x: 1, y: 2 }, undeliverd_packages: 3 },
    ])
  })
  it('returns an empty list for an unknown scenario', () => {
    const store = makeStore()
    store.chosen_scenario = 'unknown'
    expect(useDigitalTwinVisuals(store).createHousePackagesList()).toEqual([])
  })
})
