import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PokerTable from '@/components/poker/PokerTable.vue'
import type { Card } from '@/game/cards'
import { evaluate } from '../evaluator'
import { createTable } from '../engine'
import type { HandResult, Seat, TableState } from '../types'

const c = (rank: string, suit: string): Card => ({ rank, suit })

function seat(id: number, name: string, hole: Card[], options: Partial<Seat> = {}): Seat {
  return {
    id,
    name,
    isHero: id === 0,
    stack: 935,
    hole,
    streetBet: 0,
    totalBet: 65,
    status: 'active',
    lastAction: null,
    hasActed: true,
    canRaise: true,
    cheatsUsed: [],
    cheatSpent: 0,
    ...options,
  }
}

describe('poker table showdown rendering', () => {
  function liveTable(): TableState {
    const state = createTable({
      seats: [0, 1, 2, 3].map((id) => ({ name: `P${id}`, isHero: id === 0 })),
      startingStack: 1000,
      smallBlind: 10,
      bigBlind: 20,
    })
    state.street = 'preflop'
    state.seats[0]!.hole = [c('A', '♠'), c('2', '♥')]
    return state
  }

  it('shows preflop high card and updates to a pair when a hole card changes', async () => {
    const state = liveTable()
    const wrapper = mount(PokerTable, { props: { state, thinkingSeat: null } })
    expect(wrapper.text()).toContain('当前最佳：高牌 · A')
    expect(wrapper.findAll('.poker-card--highlight')).toHaveLength(1)
    await wrapper.setProps({
      state: {
        ...state,
        seats: state.seats.map((s) => (s.isHero ? { ...s, hole: [c('A', '♠'), c('A', '♥')] } : s)),
      },
    })
    expect(wrapper.text()).toContain('当前最佳：一对 · A')
    expect(wrapper.findAll('.poker-card--highlight')).toHaveLength(2)
    expect(
      wrapper.findAll('.poker-seat:not(.poker-seat--hero) .poker-card--highlight'),
    ).toHaveLength(0)
    wrapper.unmount()
  })

  it('updates the best five as the board grows and clears the hint after folding', async () => {
    const state = liveTable()
    state.street = 'turn'
    state.board = [c('3', '♣'), c('4', '♦'), c('5', '♠'), c('K', '♥')]
    const wrapper = mount(PokerTable, { props: { state, thinkingSeat: null } })
    expect(wrapper.text()).toContain('当前最佳：顺子')
    expect(wrapper.findAll('.poker-card--highlight')).toHaveLength(5)
    expect(wrapper.findAll('.poker-board__cards .poker-card--highlight')).toHaveLength(3)
    expect(wrapper.get('[aria-label="K♥"]').classes()).toContain('poker-card--dim')
    await wrapper.setProps({
      state: { ...state, street: 'river', board: [...state.board, c('6', '♣')] },
    })
    expect(wrapper.findAll('.poker-table__seat--hero .poker-card--highlight')).toHaveLength(1)
    expect(wrapper.findAll('.poker-board__cards .poker-card--highlight')).toHaveLength(4)
    await wrapper.setProps({
      state: {
        ...state,
        seats: state.seats.map((s) => (s.isHero ? { ...s, status: 'folded' as const } : s)),
      },
    })
    expect(wrapper.text()).not.toContain('当前最佳')
    expect(wrapper.findAll('.poker-card--highlight')).toHaveLength(0)
    wrapper.unmount()
  })

  it('highlights only the board when it makes the best hand', () => {
    const state = liveTable()
    state.street = 'river'
    state.board = ['10', 'J', 'Q', 'K', 'A'].map((rank) => c(rank, '♦'))
    const wrapper = mount(PokerTable, { props: { state, thinkingSeat: null } })
    expect(wrapper.text()).toContain('当前最佳：同花顺')
    expect(wrapper.findAll('.poker-board__cards .poker-card--highlight')).toHaveLength(5)
    expect(wrapper.findAll('.poker-table__seat--hero .poker-card--highlight')).toHaveLength(0)
    wrapper.unmount()
  })

  it('highlights the winning five and only dims board cards nobody uses', () => {
    const board = [c('Q', '♦'), c('2', '♥'), c('7', '♥'), c('9', '♦'), c('4', '♦')]
    const seats = [
      seat(0, '你', [c('4', '♠'), c('3', '♠')]),
      seat(1, '薇拉', [c('Q', '♥'), c('A', '♣')]),
      seat(2, '幸运儿', [c('Q', '♠'), c('6', '♥')]),
      seat(3, '老莫', [], { status: 'folded', totalBet: 50 }),
    ]
    const hands = {
      0: evaluate([...seats[0]!.hole, ...board]),
      1: evaluate([...seats[1]!.hole, ...board]),
      2: evaluate([...seats[2]!.hole, ...board]),
    }
    const result: HandResult = {
      pots: [{ amount: 215, eligible: [0, 1, 2], winners: [1], best: hands[1] }],
      awards: { 1: 215 },
      net: { 0: -65, 1: 150, 2: -65, 3: -50 },
      revealed: true,
      hands,
    }
    const state: TableState = {
      seats,
      button: 0,
      smallBlind: 10,
      bigBlind: 20,
      smallBlindSeat: 1,
      bigBlindSeat: 2,
      street: 'complete',
      board,
      deck: [],
      currentBet: 0,
      lastFullRaise: 20,
      actor: null,
      lastAggressor: null,
      handNo: 1,
      pots: [{ amount: 215, eligible: [0, 1, 2] }],
      result,
      log: [],
    }

    const wrapper = mount(PokerTable, { props: { state, thinkingSeat: null } })
    expect(wrapper.findAll('.poker-card--highlight')).toHaveLength(5)
    expect(wrapper.findAll('.poker-seat--winner')).toHaveLength(1)
    expect(wrapper.findAll('.poker-table__seat--left .poker-card--highlight')).toHaveLength(2)

    const boardCards = wrapper.findAll('.poker-board__cards .poker-card')
    expect(boardCards[0]!.classes()).toContain('poker-card--highlight')
    expect(boardCards[1]!.classes()).toContain('poker-card--dim')
    expect(boardCards[4]!.classes()).not.toContain('poker-card--dim')
  })
})
