import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import { score, payout, createDeck, type Card } from '../game/blackjack'
const hand = (...ranks: string[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }))
describe('blackjack rules', () => {
  it('adjusts multiple aces without busting', () => {
    expect(score(hand('A', 'A', '9'))).toBe(21)
    expect(score(hand('A', '7', '9'))).toBe(17)
  })
  it('settles blackjack, ties, dealer busts and player busts', () => {
    expect(payout(hand('A', 'K'), hand('7', '7', '7'), 50)).toBe(125)
    expect(payout(hand('7', '7', '7'), hand('A', 'K'), 50)).toBe(0)
    expect(payout(hand('A', 'K'), hand('A', 'Q'), 50)).toBe(50)
    expect(payout(hand('10', '8'), hand('10', '7', '9'), 50)).toBe(100)
    expect(payout(hand('10', '8', '9'), hand('10', '7', '9'), 50)).toBe(0)
  })
  it('creates a full unique deck', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => c.rank + c.suit)).size).toBe(52)
  })
})
describe('game interface', () => {
  beforeEach(() => window.localStorage.clear())
  it('persists all four themes without disturbing the game', async () => {
    const wrapper = mount(App)
    expect(wrapper.get('.app').attributes('data-theme')).toBe('charcoal')
    for (const [name, id] of [
      ['午夜蓝', 'midnight'],
      ['暖色浅色', 'ivory'],
      ['经典绿桌', 'forest'],
      ['炭黑深色', 'charcoal'],
    ]) {
      await wrapper.get(`button[aria-label="${name}"]`).trigger('click')
      expect(wrapper.get('.app').attributes('data-theme')).toBe(id)
      expect(window.localStorage.getItem('wise21-theme')).toBe(id)
    }
    expect(wrapper.get('.balance').text()).toContain('1,000')
    await wrapper.get('button[aria-label="午夜蓝"]').trigger('click')
    wrapper.unmount()
    const reopened = mount(App)
    expect(reopened.get('.app').attributes('data-theme')).toBe('midnight')
    reopened.unmount()
  })
  it('deals and prevents changing bets while playing', async () => {
    const wrapper = mount(App)
    await wrapper.get('.controls > .primary').trigger('click')
    expect(wrapper.findAll('.player-area .card')).toHaveLength(2)
    expect(wrapper.findAll('.dealer-area .card')).toHaveLength(2)
    if (wrapper.find('.action-row').exists()) {
      expect(wrapper.get('.chips button').attributes('disabled')).toBeDefined()
      await wrapper.get('.secondary').trigger('click')
    }
    expect(wrapper.get('.controls > .primary').text()).toContain('再来一局')
    expect(wrapper.find('.dealer-area .back').exists()).toBe(false)
  })
})
