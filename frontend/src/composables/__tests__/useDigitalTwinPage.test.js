// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useDigitalTwinPage } from '../useDigitalTwinPage'

function setup() {
  const store = {
    connect: vi.fn(), fetchTagPositions: vi.fn(), fetchDepotRoutes: vi.fn(),
    fetchRoutes: vi.fn(), fetchHouses: vi.fn(), fetchHousesPerScenario: vi.fn(),
    sendData: vi.fn(() => true), table_data: [{ auto_id: 1 }], active: false,
  }
  let controls
  const wrapper = mount(defineComponent({
    setup() { controls = useDigitalTwinPage(store); return () => h('div') },
  }))
  return { store, controls, wrapper }
}

describe('Digital Twin page orchestration', () => {
  it('connects and loads all initial data on mount', () => {
    const { store, wrapper } = setup()
    for (const name of ['connect', 'fetchTagPositions', 'fetchDepotRoutes', 'fetchRoutes', 'fetchHouses', 'fetchHousesPerScenario']) {
      expect(store[name]).toHaveBeenCalledOnce()
    }
    wrapper.unmount()
  })
  it('starts the timer and sends package configuration after activation', () => {
    const { store, controls, wrapper } = setup()
    controls.handleTimerStart()
    expect(store.sendData).toHaveBeenNthCalledWith(1, 'activation', true)
    expect(store.sendData).toHaveBeenNthCalledWith(2, 'load_max_packages', store.table_data)
    expect(store.active).toBe(true)
    wrapper.unmount()
  })
  it('does not activate if the activation message cannot be sent', () => {
    const { store, controls, wrapper } = setup()
    store.sendData.mockReturnValue(false)
    controls.handleTimerStart()
    expect(store.active).toBe(false)
    expect(store.sendData).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
  it('stops the timer when deactivation succeeds', () => {
    const { store, controls, wrapper } = setup()
    store.active = true
    controls.handleTimerStop()
    expect(store.sendData).toHaveBeenCalledWith('activation', false)
    expect(store.active).toBe(false)
    wrapper.unmount()
  })
  it('retains active state when deactivation fails', () => {
    const { store, controls, wrapper } = setup()
    store.active = true
    store.sendData.mockReturnValue(false)
    controls.handleTimerStop()
    expect(store.active).toBe(true)
    wrapper.unmount()
  })
  it('reloads scenario houses and sends reset', () => {
    const { store, controls, wrapper } = setup()
    controls.handleTimerReset()
    expect(store.fetchHousesPerScenario).toHaveBeenCalledTimes(2)
    expect(store.sendData).toHaveBeenCalledWith('reset', {})
    wrapper.unmount()
  })
})
