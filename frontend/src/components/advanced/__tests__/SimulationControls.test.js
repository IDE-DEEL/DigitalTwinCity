// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SimulationControls from '../SimulationControls.vue';

vi.mock('../../../stores/index.js', () => ({
  useLanguageStore: () => ({ getLabel: (key) => key }),
}));

const BaseButtonStub = {
  props: ['disabled', 'variant'],
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
};
const TimerStub = { props: ['isActive', 'isPaused'], template: '<div data-testid="timer" />' };
const mountControls = (props = {}) => mount(SimulationControls, {
  props: { isActive: false, ...props },
  global: { stubs: { BaseButton: BaseButtonStub, Timer: TimerStub } },
});
const button = (wrapper, label) => wrapper.findAll('button').find(b => b.text().includes(label));

describe('SimulationControls interactions', () => {
  it('emits start and reset when idle', async () => {
    const wrapper = mountControls();
    await button(wrapper, 'controls.startButton').trigger('click');
    await button(wrapper, 'controls.resetButton').trigger('click');
    expect(wrapper.emitted('start')).toHaveLength(1);
    expect(wrapper.emitted('reset')).toHaveLength(1);
  });

  it('disables start while active and enables stop', async () => {
    const wrapper = mountControls({ isActive: true });
    expect(button(wrapper, 'controls.startButton').attributes('disabled')).toBeDefined();
    await button(wrapper, 'controls.stopButton').trigger('click');
    expect(wrapper.emitted('stop')).toHaveLength(1);
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('disables start when startDisabled is set', async () => {
    const wrapper = mountControls({ startDisabled: true });
    expect(button(wrapper, 'controls.startButton').attributes('disabled')).toBeDefined();
    await button(wrapper, 'controls.startButton').trigger('click');
    expect(wrapper.emitted('start')).toBeUndefined();
  });

  it('disables stop and pause when stopDisabled is set', async () => {
    const wrapper = mountControls({ isActive: true, variant: 'simulation', stopDisabled: true });
    expect(button(wrapper, 'controls.stopButton').attributes('disabled')).toBeDefined();
    expect(button(wrapper, 'controls.pauseButton').attributes('disabled')).toBeDefined();
    await button(wrapper, 'controls.stopButton').trigger('click');
    await button(wrapper, 'controls.pauseButton').trigger('click');
    expect(wrapper.emitted('stop')).toBeUndefined();
    expect(wrapper.emitted('pause')).toBeUndefined();
  });

  it('emits pause for simulation variant and shows resume label when paused', async () => {
    const wrapper = mountControls({ isActive: true, variant: 'simulation' });
    await button(wrapper, 'controls.pauseButton').trigger('click');
    expect(wrapper.emitted('pause')).toHaveLength(1);
    await wrapper.setProps({ isPaused: true });
    expect(button(wrapper, 'controls.resumeButton').exists()).toBe(true);
  });

  it('hides reset and pause controls when configured', () => {
    const wrapper = mountControls({ showResetButton: false });
    expect(button(wrapper, 'controls.resetButton')).toBeUndefined();
    expect(button(wrapper, 'controls.pauseButton')).toBeUndefined();
  });
});
