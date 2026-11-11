import { describe, it, expect } from 'vitest'

import type { Card } from '@/game/cards'

import { applyAction, createTable, legalActions, startHand } from '../engine'
import type { Action, TableState } from '../types'

const c = (rank: string, suit: string): Card => ({ rank, suit })
const deckOf = (...popOrder: Card[]): Card[] => [...popOrder].reverse()

function table(stacks: number[] = [1000, 1000, 1000, 1000], button = 0): TableState {
  return createTable({
    seats: stacks.map((stack, index) => ({
      name: `P${index}`,
      isHero: index === 0,
      stack,
    })),
    startingStack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    button,
  })
}

function act(state: TableState, action: Action): TableState {
  return applyAction(state, state.actor!, action)
}

function check(state: TableState): TableState {
  return act(state, { type: 'check' })
}

function call(state: TableState): TableState {
  return act(state, { type: 'call' })
}

function fold(state: TableState): TableState {
  return act(state, { type: 'fold' })
}

function totalChips(state: TableState): number {
  const committed =
    state.street === 'complete' ? 0 : state.seats.reduce((sum, seat) => sum + seat.totalBet, 0)
  return state.seats.reduce((sum, seat) => sum + seat.stack, 0) + committed
}

describe('hand start and blinds', () => {
  it('posts blinds, deals two cards and starts action left of the big blind', () => {
    const state = startHand(table())
    expect(state.handNo).toBe(1)
    expect(state.button).toBe(0)
    expect(state.street).toBe('preflop')
    expect(state.seats[1]!.streetBet).toBe(10)
    expect(state.seats[2]!.streetBet).toBe(20)
    expect(state.currentBet).toBe(20)
    expect(state.actor).toBe(3)
    expect(state.board).toHaveLength(0)
    for (const seat of state.seats) expect(seat.hole).toHaveLength(2)
    expect(totalChips(state)).toBe(4000)
  })

  it('gives the big blind an option after everyone calls', () => {
    let state = startHand(table())
    state = call(state)
    state = call(state)
    state = call(state)
    expect(state.street).toBe('preflop')
    expect(state.actor).toBe(2)
    state = check(state)
    expect(state.street).toBe('flop')
    expect(state.board).toHaveLength(3)
    expect(state.actor).toBe(1)
  })

  it('handles heads-up blinds and postflop order', () => {
    let state = startHand(table([1000, 1000], 0))
    expect(state.button).toBe(0)
    expect(state.seats[0]!.streetBet).toBe(10)
    expect(state.seats[1]!.streetBet).toBe(20)
    expect(state.actor).toBe(0)
    state = call(state)
    expect(state.actor).toBe(1)
    state = check(state)
    expect(state.street).toBe('flop')
    expect(state.actor).toBe(1)
  })

  it('rotates the button and reassigns blinds on the next hand', () => {
    let state = startHand(table())
    state = fold(state)
    state = fold(state)
    state = fold(state)
    expect(state.street).toBe('complete')
    const next = startHand(state)
    expect(next.button).toBe(1)
    expect(next.seats[2]!.streetBet).toBe(10)
    expect(next.seats[3]!.streetBet).toBe(20)
    expect(next.actor).toBe(0)
  })
})

describe('betting rules', () => {
  it('enforces the minimum raise and exposes the correct legal range', () => {
    const state = startHand(table())
    expect(legalActions(state, 3).raise).toEqual({ min: 40, max: 1000 })
    expect(() => applyAction(state, 3, { type: 'raise', to: 30 })).toThrow('加注额超出允许范围')
    expect(() => applyAction(state, 3, { type: 'raise', to: 40.5 })).toThrow('加注额必须是整数')

    const raised = applyAction(state, 3, { type: 'raise', to: 60 })
    expect(raised.currentBet).toBe(60)
    expect(raised.lastFullRaise).toBe(40)
    expect(raised.actor).toBe(0)
    expect(legalActions(raised, 0).raise).toEqual({ min: 100, max: 1000 })
  })

  it('treats a short all-in as a raise that reopens action', () => {
    const state = startHand(table([1000, 1000, 1000, 30]))
    const pushed = applyAction(state, 3, { type: 'all-in' })
    expect(pushed.currentBet).toBe(30)
    expect(pushed.lastFullRaise).toBe(20)
    expect(pushed.seats[3]!.status).toBe('all-in')
    expect(pushed.seats[3]!.stack).toBe(0)
    expect(pushed.actor).toBe(0)
    expect(legalActions(pushed, 0).raise?.min).toBe(50)
  })

  it('rejects actions out of turn, checks facing a bet and bets while a bet is live', () => {
    const state = startHand(table())
    expect(() => applyAction(state, 0, { type: 'call' })).toThrow('还没轮到该玩家行动')
    expect(() => applyAction(state, 3, { type: 'check' })).toThrow('当前不能过牌')
    expect(() => applyAction(state, 3, { type: 'bet', to: 40 })).toThrow('当前不能下注')
    expect(legalActions(state, 0).fold).toBe(false)
  })

  it('offers postflop bets starting at one big blind', () => {
    let state = startHand(table())
    state = call(state)
    state = call(state)
    state = call(state)
    state = check(state)
    expect(state.street).toBe('flop')
    const legal = legalActions(state, state.actor!)
    expect(legal.bet).toEqual({ min: 20, max: 980 })
    expect(legal.check).toBe(true)
  })

  it('awards the pot immediately when everyone folds', () => {
    let state = startHand(table())
    state = fold(state)
    state = fold(state)
    state = fold(state)
    expect(state.street).toBe('complete')
    expect(state.result?.revealed).toBe(false)
    expect(state.result?.awards[2]).toBe(30)
    expect(state.seats[2]!.stack).toBe(1010)
    expect(state.result?.net[2]).toBe(10)
    expect(state.result?.net[1]).toBe(-10)
    expect(totalChips(state)).toBe(4000)
  })
})

describe('showdown and pots', () => {
  it('shows down, evaluates seven cards and pays the winner', () => {
    const deck = deckOf(
      c('A', '♠'),
      c('K', '♠'),
      c('A', '♥'),
      c('K', '♥'),
      c('2', '♣'),
      c('7', '♦'),
      c('9', '♠'),
      c('J', '♣'),
      c('3', '♣'),
      c('4', '♦'),
      c('5', '♣'),
      c('6', '♥'),
    )
    let state = startHand(table([1000, 1000], 0), deck)
    state = call(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)

    expect(state.street).toBe('complete')
    expect(state.board).toHaveLength(5)
    expect(state.result?.revealed).toBe(true)
    expect(state.result?.awards[0]).toBe(40)
    expect(state.seats[0]!.stack).toBe(1020)
    expect(state.seats[1]!.stack).toBe(980)
    expect(state.result?.hands[0]?.category).toBe(1)
    expect(state.result?.hands[1]?.category).toBe(1)
    expect(state.result?.net[0]).toBe(20)
    expect(totalChips(state)).toBe(2000)
  })

  it('splits a tied pot when the board plays', () => {
    const deck = deckOf(
      c('2', '♣'),
      c('4', '♣'),
      c('3', '♦'),
      c('5', '♦'),
      c('6', '♣'),
      c('A', '♠'),
      c('K', '♠'),
      c('Q', '♠'),
      c('7', '♣'),
      c('J', '♠'),
      c('8', '♣'),
      c('10', '♠'),
    )
    let state = startHand(table([1000, 1000], 0), deck)
    state = call(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)
    state = check(state)

    expect(state.street).toBe('complete')
    expect(state.result?.pots).toHaveLength(1)
    expect(state.result?.pots[0]?.winners).toEqual([0, 1])
    expect(state.result?.awards[0]).toBe(20)
    expect(state.result?.awards[1]).toBe(20)
    expect(state.result?.net[0]).toBe(0)
    expect(state.seats[0]!.stack).toBe(1000)
    expect(state.seats[1]!.stack).toBe(1000)
  })

  it('builds three layers for all-in stacks of 100 / 300 / 500', () => {
    const deck = deckOf(
      c('A', '♣'),
      c('K', '♣'),
      c('Q', '♣'),
      c('A', '♦'),
      c('K', '♦'),
      c('Q', '♦'),
      c('2', '♥'),
      c('7', '♠'),
      c('8', '♥'),
      c('9', '♣'),
      c('5', '♣'),
      c('J', '♦'),
      c('6', '♣'),
      c('3', '♥'),
    )
    let state = startHand(table([100, 300, 500], 0), deck)
    state = applyAction(state, 0, { type: 'all-in' })
    state = applyAction(state, 1, { type: 'all-in' })
    state = applyAction(state, 2, { type: 'all-in' })

    expect(state.street).toBe('complete')
    expect(state.result?.pots.map((pot) => pot.amount)).toEqual([300, 400, 200])
    expect(state.result?.pots.map((pot) => pot.winners)).toEqual([[0], [1], [2]])
    expect(state.result?.awards).toEqual({ 0: 300, 1: 400, 2: 200 })
    expect(state.seats.map((seat) => seat.stack)).toEqual([300, 400, 200])
    expect(state.result?.net[0]).toBe(200)
    expect(state.result?.net[1]).toBe(100)
    expect(state.result?.net[2]).toBe(-300)
    expect(totalChips(state)).toBe(900)
  })

  it('runs out the board when both blinds are all-in', () => {
    const deck = deckOf(
      c('2', '♣'),
      c('3', '♣'),
      c('4', '♦'),
      c('5', '♦'),
      c('6', '♣'),
      c('7', '♠'),
      c('8', '♥'),
      c('9', '♣'),
      c('10', '♣'),
      c('J', '♦'),
      c('Q', '♣'),
      c('K', '♥'),
    )
    const state = startHand(table([10, 20], 0), deck)
    expect(state.street).toBe('complete')
    expect(state.board).toHaveLength(5)
    expect(state.result?.revealed).toBe(true)
    expect(state.result?.pots.map((pot) => pot.amount)).toEqual([20, 10])
    expect(state.seats[0]!.stack).toBe(10)
    expect(state.seats[1]!.stack).toBe(20)
    expect(totalChips(state)).toBe(30)
  })
})
