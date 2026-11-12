import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyCheat, cheatAvailability } from '../cheats'
import { applyAction, createTable, legalActions, startHand } from '../engine'

function table() {
  return startHand(
    createTable({
      seats: [0, 1, 2, 3].map((id) => ({ name: `P${id}`, stack: 2000 })),
      startingStack: 2000,
      smallBlind: 10,
      bigBlind: 20,
    }),
  )
}

afterEach(() => vi.restoreAllMocks())

describe('swap-card ability', () => {
  it.each([
    [999, false, 100],
    [1000, true, 100],
    [1001, true, 101],
  ])('checks the raw 10%% threshold before rounding (%s)', (stack, allowed, cost) => {
    const state = table()
    state.seats[state.actor!]!.stack = stack
    expect(cheatAvailability(state, state.actor!, 'swap-card')).toMatchObject({ allowed, cost })
    if (!allowed)
      expect(() => applyCheat(state, state.actor!, { type: 'swap-card', cardIndex: 0 })).toThrow(
        '不足 100',
      )
  })

  it('replaces only the selected card, removes it from the deck, and leaves betting untouched', () => {
    const state = table()
    const id = state.actor!
    const before = structuredClone(state)
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const next = applyCheat(state, id, { type: 'swap-card', cardIndex: 1 })
    expect(state).toEqual(before)
    expect(next.seats[id]!.hole).toEqual([state.seats[id]!.hole[0], state.deck[0]])
    expect(next.deck).toEqual(state.deck.slice(1))
    expect(next.actor).toBe(id)
    expect(next.seats[id]!.stack).toBe(1800)
    expect(next.seats[id]!.totalBet).toBe(state.seats[id]!.totalBet)
    expect(next.seats[id]!.hasActed).toBe(false)
    expect(next.log).toEqual(state.log)
    const cards = [...next.deck, ...next.board, ...next.seats.flatMap((seat) => seat.hole)]
    expect(new Set(cards.map((c) => c.rank + c.suit)).size).toBe(cards.length)
    expect(cards).not.toContainEqual(state.seats[id]!.hole[1])
    expect(() => applyCheat(next, id, { type: 'swap-card', cardIndex: 0 })).toThrow('本局已使用')
  })

  it('rejects invalid turns, statuses, indexes and an empty deck without charging', () => {
    const state = table()
    const id = state.actor!
    expect(() => applyCheat(state, (id + 1) % 4, { type: 'swap-card', cardIndex: 0 })).toThrow()
    for (const cardIndex of [-1, 2, 0.5, NaN]) {
      expect(() => applyCheat(state, id, { type: 'swap-card', cardIndex })).toThrow('请选择')
    }
    for (const status of ['folded', 'out', 'all-in'] as const) {
      expect(
        cheatAvailability(
          { ...state, seats: state.seats.map((s) => (s.id === id ? { ...s, status } : s)) },
          id,
          'swap-card',
        ).allowed,
      ).toBe(false)
    }
    expect(() =>
      applyCheat({ ...state, deck: [] }, id, { type: 'swap-card', cardIndex: 0 }),
    ).toThrow()
    expect(state.seats[id]!.cheatSpent).toBe(0)
  })

  it.each([false, true])(
    'accounts for fees in settlement and resets usage next hand (folds: %s)',
    (folds) => {
      let state = table()
      const id = state.actor!
      state = applyCheat(state, id, { type: 'swap-card', cardIndex: 0 })
      let actions = 0
      while (state.actor !== null && actions++ < 40) {
        const legal = legalActions(state, state.actor)
        state = applyAction(
          state,
          state.actor,
          folds ? { type: 'fold' } : legal.check ? { type: 'check' } : { type: 'call' },
        )
      }
      expect(state.street).toBe('complete')
      expect(state.seats.reduce((sum, s) => sum + s.stack, 0)).toBe(7800)
      expect(Object.values(state.result!.net).reduce((sum, n) => sum + n, 0)).toBe(-200)
      for (const seat of state.seats) expect(state.result!.net[seat.id]).toBe(seat.stack - 2000)
      expect(cheatAvailability(state, id, 'swap-card').allowed).toBe(false)
      const next = startHand(state)
      expect(next.seats[id]!.cheatsUsed).toEqual([])
      expect(next.seats[id]!.cheatSpent).toBe(0)
    },
  )
})
