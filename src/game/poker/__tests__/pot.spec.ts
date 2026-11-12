import { describe, it, expect } from 'vitest'

import { buildPots, seatOrderFromButton, splitPot } from '../pot'
import type { Seat, SeatStatus } from '../types'

function seat(id: number, totalBet: number, status: SeatStatus = 'active'): Seat {
  return {
    id,
    name: `P${id}`,
    isHero: false,
    stack: 0,
    hole: [],
    streetBet: 0,
    totalBet,
    status,
    lastAction: null,
    hasActed: true,
    canRaise: true,
    cheatsUsed: [],
    cheatSpent: 0,
  }
}

describe('pot layering', () => {
  it('builds main and side pots for different all-in stacks', () => {
    const pots = buildPots([seat(0, 100), seat(1, 300), seat(2, 500)])
    expect(pots).toEqual([
      { amount: 300, eligible: [0, 1, 2] },
      { amount: 400, eligible: [1, 2] },
      { amount: 200, eligible: [2] },
    ])
    expect(pots.reduce((sum, pot) => sum + pot.amount, 0)).toBe(900)
  })

  it('keeps folded dead money in the pot without making it eligible', () => {
    const pots = buildPots([seat(0, 100, 'folded'), seat(1, 300), seat(2, 500)])
    expect(pots).toEqual([
      { amount: 700, eligible: [1, 2] },
      { amount: 200, eligible: [2] },
    ])
  })

  it('keeps an uncalled top layer separate for its only eligible player', () => {
    const pots = buildPots([seat(0, 100, 'folded'), seat(1, 200), seat(2, 500)])
    expect(pots).toEqual([
      { amount: 500, eligible: [1, 2] },
      { amount: 300, eligible: [2] },
    ])
  })
})

describe('pot splitting', () => {
  it('orders seats clockwise from the button', () => {
    expect(seatOrderFromButton([0, 3, 1], 2, 4)).toEqual([3, 0, 1])
  })

  it('awards odd chips clockwise from the button', () => {
    expect(splitPot(101, [1, 3], 0, 4)).toEqual({ 1: 51, 3: 50 })
    expect(splitPot(100, [3, 0, 1], 2, 4)).toEqual({ 3: 34, 0: 33, 1: 33 })
  })

  it('returns an empty award map when there are no winners', () => {
    expect(splitPot(50, [], 0, 4)).toEqual({})
  })
})
