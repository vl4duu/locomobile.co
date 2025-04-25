import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadingAnimation from '../../src/components/LoadingAnimation.vue';

describe('LoadingAnimation', () => {
  it('renders properly', () => {
    const wrapper = mount(LoadingAnimation);
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.boxes').exists()).toBe(true);
    expect(wrapper.findAll('.box')).toHaveLength(4);
  });
});