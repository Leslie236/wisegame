import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import PokerView from '@/views/PokerView.vue'

describe('poker interface', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders a four-handed table with the shared wallet', () => {
    window.localStorage.setItem('wise21-balance', '640')
    const wrapper = mount(PokerView)
    expect(wrapper.findAll('.poker-seat')).toHaveLength(4)
    expect(wrapper.get('.balance').text()).toContain('640')
    expect(wrapper.get('.poker-controls .primary').text()).toContain('开始新的一手')
    wrapper.unmount()
  })

  it('starts a hand and posts the blinds', async () => {
    window.localStorage.setItem('wise21-balance', '1000')
    const wrapper = mount(PokerView)
    await wrapper.get('.poker-controls .primary').trigger('click')
    expect(wrapper.get('.poker-controls .section-label').text()).toContain('翻牌前')
    expect(wrapper.get('.poker-board__pot').text()).toContain('30')
    expect(wrapper.findAll('.poker-seat .poker-card:not(.poker-card--empty)')).toHaveLength(8)
    wrapper.unmount()
  })

  it('disables starting when the wallet is below the big blind', () => {
    window.localStorage.setItem('wise21-balance', '10')
    const wrapper = mount(PokerView)
    expect(wrapper.get('.poker-controls .primary').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.low-balance').exists()).toBe(true)
    wrapper.unmount()
  })
})
