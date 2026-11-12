import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PokerCheats from '@/components/poker/PokerCheats.vue'
import { createTable } from '@/game/poker/engine'

describe('cheat controls', () => {
  it('selects the requested hole card and disables payment when unavailable', async () => {
    const seat = createTable({
      seats: [{ name: '你' }, { name: 'NPC' }],
      startingStack: 1000,
      smallBlind: 10,
      bigBlind: 20,
    }).seats[0]!
    seat.hole = [
      { rank: 'A', suit: '♠' },
      { rank: '2', suit: '♥' },
    ]
    const wrapper = mount(PokerCheats, {
      props: { seat, availability: { cost: 100, allowed: true, reason: '' } },
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('swap')).toEqual([[1]])
    await wrapper.setProps({
      availability: { cost: 90, allowed: false, reason: '剩余筹码的 10% 不足 100，无法使用' },
    })
    expect(wrapper.text()).toContain('不足 100')
    for (const button of wrapper.findAll('button'))
      expect(button.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
