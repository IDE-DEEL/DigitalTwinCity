import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { mapRenderer } from '../mapRenderer'

describe('mapRenderer', () => {
  it('provides a fixed five-by-five grid style', () => {
    const { gridStyle } = mapRenderer(ref([]), ref({}))
    expect(gridStyle.value).toMatchObject({
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
      gridTemplateRows: 'repeat(5, 1fr)', width: '70vmin', height: '70vmin',
    })
  })
  it('skips map items without a matching component definition', () => {
    const mapData = ref([{ x: 0, y: 0, type: 'unknown' }])
    expect(mapRenderer(mapData, ref({})).mapComponents.value).toEqual([])
  })
  it('constructs map cells from matching definitions', () => {
    const mapData = ref([{ x: 1, y: 2, type: 'road', rotation: 0 }])
    const definitions = ref({ road: { label: 'Road', imagePath: '/road.png' } })
    const { mapComponents } = mapRenderer(mapData, definitions)
    expect(mapComponents.value).toHaveLength(1)
    expect(mapComponents.value[0]).toMatchObject({ x: 1, y: 2, key: '1-2', type: 'road', label: 'Road' })
  })
  it('updates computed cells when the source map changes', () => {
    const mapData = ref([])
    const renderer = mapRenderer(mapData, ref({ road: { label: 'Road', imagePath: '/road.png' } }))
    expect(renderer.mapComponents.value).toHaveLength(0)
    mapData.value = [{ x: 0, y: 0, type: 'road' }]
    expect(renderer.mapComponents.value).toHaveLength(1)
  })
  it('converts zero-based tile coordinates to one-based CSS grid positions', () => {
    expect(mapRenderer(ref([]), ref({})).getComponentPosition({ x: 2, y: 3 }))
      .toEqual({ gridColumnStart: 3, gridRowStart: 4 })
  })
})
