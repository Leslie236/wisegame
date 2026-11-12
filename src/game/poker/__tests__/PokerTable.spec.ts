import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import PokerTable from '@/components/poker/PokerTable.vue'
import type { Card } from '@/game/cards'
import { evaluate } from '../evaluator'
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
