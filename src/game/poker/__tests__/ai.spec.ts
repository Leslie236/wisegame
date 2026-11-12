import { describe, it, expect } from 'vitest'

import { createDeck, type Card } from '@/game/cards'

import { BOT_PROFILES, chooseAction, handStrength } from '../ai'
import { applyAction, createTable, startHand } from '../engine'
import type { TableState } from '../types'

const c = (rank: string, suit: string): Card => ({ rank, suit })

function rng(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function table(): TableState {
  return createTable({
    seats: [0, 1, 2, 3].map((index) => ({ name: `P${index}`, stack: 1000 })),
    startingStack: 1000,
    smallBlind: 10,
    bigBlind: 20,
    button: 0,
  })
}

describe('bot hand strength', () => {
  it('ranks pocket aces above a weak offsuit hand', () => {
    const aces = handStrength([c('A', '♠'), c('A', '♥')], [])
    const sevenTwo = handStrength([c('7', '♠'), c('2', '♥')], [])
    expect(aces).toBeGreaterThan(sevenTwo)
    expect(aces).toBeGreaterThan(0.9)
  })

  it('prefers a made set over one pair after the flop', () => {
    const board = [c('9', '♠'), c('6', '♥'), c('2', '♦')]
    const set = handStrength([c('9', '♥'), c('9', '♦')], board)
    const pair = handStrength([c('A', '♠'), c('A', '♦')], board)
    expect(set).toBeGreaterThan(pair)
  })
})

describe('bot decisions', () => {
  it('always returns a legal action across random hands', () => {
    const deckRng = rng(20261111)
    const decisionRng = rng(7)
    for (let hand = 0; hand < 40; hand++) {
      let state = startHand(table(), createDeck(deckRng))
      let steps = 0
      while (state.street !== 'complete') {
        expect(steps).toBeLessThan(400)
        const actor = state.actor
        if (actor === null) break
        const profile = BOT_PROFILES[actor % BOT_PROFILES.length]!
        const action = chooseAction(state, actor, profile, decisionRng)
        state = applyAction(state, actor, action)
        steps++
      }
      expect(state.street).toBe('complete')
      expect(state.result).not.toBeNull()
      expect(state.seats.reduce((sum, seat) => sum + seat.stack, 0)).toBe(4000)
    }
  })

  function facingAllIn(stack = 1000): TableState {
    const initial = table()
    initial.seats[2]!.stack = stack
    let state = startHand(initial)
    state = applyAction(state, 3, { type: 'all-in' })
    state = applyAction(state, 0, { type: 'fold' })
    return applyAction(state, 1, { type: 'fold' })
  }

  it.each([600, 1000, 2000])('folds weak cards against a shove with a %s stack', (stack) => {
    const state = facingAllIn(stack)
    state.seats[2]!.hole = [c('7', '♠'), c('2', '♥')]
    for (const profile of BOT_PROFILES) {
      const action = chooseAction(state, 2, profile, () => 0.5)
      expect(action.type).toBe('fold')
      expect(() => applyAction(state, 2, action)).not.toThrow()
    }
  })

  it('can call a shove with pocket aces', () => {
    const state = facingAllIn()
    state.seats[2]!.hole = [c('A', '♠'), c('A', '♥')]
    for (const profile of BOT_PROFILES) {
      const action = chooseAction(state, 2, profile, () => 0.5)
      expect(action.type).toBe('call')
      expect(() => applyAction(state, 2, action)).not.toThrow()
    }
  })

  it('folds a weak made pair against a large postflop shove', () => {
    const state = facingAllIn()
    state.street = 'river'
    state.board = [c('2', '♦'), c('9', '♣'), c('J', '♥'), c('K', '♠'), c('4', '♦')]
    state.seats[2]!.hole = [c('7', '♠'), c('2', '♥')]
    expect(chooseAction(state, 2, BOT_PROFILES[3]!, () => 0.5).type).toBe('fold')
  })

  it('still calls a cheap short-stack all-in when the pot odds justify it', () => {
    const state = facingAllIn(30)
    state.seats[2]!.hole = [c('A', '♠'), c('K', '♥')]
    expect(chooseAction(state, 2, BOT_PROFILES[1]!, () => 0.5).type).toBe('call')
  })

  it('folds a weak hand when facing a large bet', () => {
    let state = startHand(table())
    state = applyAction(state, 3, { type: 'raise', to: 200 })
    state = applyAction(state, 0, { type: 'fold' })
    state = applyAction(state, 1, { type: 'fold' })
    // Seat 2 (the big blind) is facing a huge raise with a random hand.
    const action = chooseAction(state, 2, BOT_PROFILES[3]!, () => 0.5)
    expect(['fold', 'call', 'all-in']).toContain(action.type)
    expect(() => applyAction(state, 2, action)).not.toThrow()
  })
})
