import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import BlackjackView from '../views/BlackjackView.vue'
import PokerView from '../views/PokerView.vue'
import * as cards from '../game/cards'
import { createDeck, type Card } from '../game/cards'
import { score, payout } from '../game/blackjack'

const hand = (...ranks: string[]): Card[] => ranks.map((rank) => ({ rank, suit: '♠' }))

async function mountApp() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'blackjack', component: BlackjackView },
      { path: '/poker', name: 'poker', component: PokerView },
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await nextTick()
  return { wrapper, router }
}

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
  afterEach(() => vi.restoreAllMocks())

  it('persists all four themes without disturbing the game', async () => {
    const { wrapper } = await mountApp()
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
    const { wrapper: reopened } = await mountApp()
    expect(reopened.get('.app').attributes('data-theme')).toBe('midnight')
    reopened.unmount()
  })

  it('deals and prevents changing bets while playing', async () => {
    vi.spyOn(cards, 'createDeck').mockReturnValue(hand('10', '6', '10', '7', '2').reverse())
    const wrapper = mount(BlackjackView)
    await wrapper.get('.controls > .primary').trigger('click')
    expect(wrapper.findAll('.player-area .card')).toHaveLength(2)
    expect(wrapper.findAll('.dealer-area .card')).toHaveLength(2)
    expect(wrapper.get('.chips button').attributes('disabled')).toBeDefined()
    await wrapper.get('.secondary').trigger('click')
    expect(wrapper.get('.controls > .primary').text()).toContain('再来一局')
    expect(wrapper.find('.dealer-area .back').exists()).toBe(false)
  })

  it('switches between the blackjack table and the poker room', async () => {
    const { wrapper, router } = await mountApp()
    expect(wrapper.find('.controls').exists()).toBe(true)

    await wrapper.get('a[href="/poker"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('poker')
    expect(wrapper.find('.poker-table').exists()).toBe(true)
    expect(wrapper.get('.poker-controls').text()).toContain('开始新的一手')

    await wrapper.get('a[href="/"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('blackjack')
    expect(wrapper.find('.controls').exists()).toBe(true)
  })
})

describe('split and surrender', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())
  function deal(...ranks: string[]) {
    vi.spyOn(cards, 'createDeck').mockReturnValue(hand(...ranks).reverse())
    return mount(BlackjackView)
  }
  it('surrenders the untouched hand and returns half the bet', async () => {
    const wrapper = deal('10', '6', '10', '7')
    await wrapper.get('.controls > .primary').trigger('click')
    await wrapper.get('.surrender-button').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('975')
    expect(wrapper.get('.status').text()).toContain('退回一半')
    expect(wrapper.get('.surrender-button').attributes('disabled')).toBeDefined()
  })
  it('settles split hands independently and only draws dealer cards after both hands finish', async () => {
    const wrapper = deal('8', '8', '10', '7', '10', '2', '9')
    await wrapper.get('.controls > .primary').trigger('click')
    await wrapper.get('.split-button').trigger('click')
    expect(wrapper.findAll('.player-area')).toHaveLength(2)
    expect(wrapper.get('.balance').text()).toContain('900')
    expect(wrapper.get('.surrender-button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.split-button').attributes('disabled')).toBeDefined()
    await wrapper.get('.secondary').trigger('click')
    expect(wrapper.findAll('.active-hand')[0]!.text()).toContain('第 2 手')
    expect(wrapper.find('.dealer-area .back').exists()).toBe(true)
    await wrapper.get('.action-row .primary').trigger('click')
    await wrapper.get('.secondary').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('1,100')
    expect(wrapper.find('.dealer-area .back').exists()).toBe(false)
  })
  it('splits aces with one draw each and pays ordinary 21 instead of blackjack', async () => {
    const wrapper = deal('A', 'A', '10', '9', 'K', '8')
    await wrapper.get('.controls > .primary').trigger('click')
    await wrapper.get('.split-button').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('1,050')
    expect(wrapper.find('.action-row').exists()).toBe(false)
    expect(wrapper.findAll('.player-area .card')).toHaveLength(4)
  })
  it('allows doubling one split hand without changing the other bet', async () => {
    const wrapper = deal('8', '8', '10', '7', '3', '10', '10')
    await wrapper.get('.controls > .primary').trigger('click')
    await wrapper.get('.split-button').trigger('click')
    await wrapper.get('.controls > .double-button').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('850')
    await wrapper.get('.secondary').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('1,150')
    expect(wrapper.findAll('.hand-summary').map((node) => node.text())).toEqual([
      '下注 100 · +100 筹码',
      '下注 50 · +50 筹码',
    ])
  })
  it('disables surrender after hitting and split without enough chips', async () => {
    vi.spyOn(cards, 'createDeck').mockReturnValue(hand('8', '8', '10', '7', '2').reverse())
    const wrapper = mount(BlackjackView)
    window.localStorage.setItem('wise21-balance', '50')
    wrapper.unmount()
    const limited = mount(BlackjackView)
    await limited.get('.controls > .primary').trigger('click')
    expect(limited.get('.split-button').attributes('disabled')).toBeDefined()
    await limited.get('.action-row .primary').trigger('click')
    expect(limited.get('.surrender-button').attributes('disabled')).toBeDefined()
  })
  it('does not allow surrender against dealer blackjack', async () => {
    const wrapper = deal('8', '8', 'A', 'K')
    await wrapper.get('.controls > .primary').trigger('click')
    expect(wrapper.get('.balance').text()).toContain('950')
    expect(wrapper.get('.surrender-button').attributes('disabled')).toBeDefined()
  })
})
