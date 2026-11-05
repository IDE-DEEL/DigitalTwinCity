// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WebSocketStatus from '../WebSocketStatus.vue';

vi.mock('../../../stores/index.js', () => ({
  useLanguageStore: () => ({ getLabel: (key) => key }),
}));
vi.mock('../../CustomComponents.js', () => ({
  BaseButton: { props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
}));

const mountStatus = (props = {}) => mount(WebSocketStatus, { props });

describe('WebSocketStatus interactions', () => {
  it('shows disconnected status and allows reconnect', async () => {
    const wrapper = mountStatus();
    expect(wrapper.text()).toContain('websocket.notConnected');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('reconnect')).toHaveLength(1);
  });

  it('hides status when connected', () => {
    const wrapper = mountStatus({ isConnected: true });
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('.websocket-status-container').exists()).toBe(false);
  });

  it('blocks reconnect during cooldown and re-enables afterward', async () => {
    const wrapper = mountStatus({ reconnectCooldown: true });
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('reconnect')).toBeUndefined();
    await wrapper.setProps({ reconnectCooldown: false });
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('reconnect')).toHaveLength(1);
  });
});
