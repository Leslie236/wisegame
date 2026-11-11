import { describe, it, expect } from 'vitest'

import type { Card } from '@/game/cards'

import { compareHands, evaluate } from '../evaluator'

const c = (rank: string, suit: string): Card => ({ rank, suit })
const cards = (...specs: string[]): Card[] =>
  specs.map((spec) => c(spec.slice(0, -1), spec.slice(-1)))

function category(specs: string[]) {
  const value = evaluate(cards(...specs))
  return { value, category: value.category, label: value.label }
}

describe('poker hand evaluator', () => {
  it('recognizes every category from straight flush down to high card', () => {
    expect(category(['A♠', 'K♠', 'Q♠', 'J♠', '10♠']).category).toBe(8)
    expect(category(['9♥', '8♥', '7♥', '6♥', '5♥']).category).toBe(8)
    expect(category(['9♠', '9♥', '9♦', '9♣', 'K♠']).category).toBe(7)
    expect(category(['K♠', 'K♥', 'K♦', '7♣', '7♠']).category).toBe(6)
    expect(category(['A♠', 'J♠', '9♠', '5♠', '2♠']).category).toBe(5)
    expect(category(['9♠', '8♥', '7♦', '6♣', '5♠']).category).toBe(4)
    expect(category(['Q♠', 'Q♥', 'Q♦', '8♣', '3♠']).category).toBe(3)
    expect(category(['J♠', 'J♥', '8♦', '8♣', 'A♠']).category).toBe(2)
    expect(category(['10♠', '10♥', 'A♦', '7♣', '3♠']).category).toBe(1)
    expect(category(['A♠', 'J♥', '9♦', '6♣', '3♠']).category).toBe(0)
  })

  it('labels categories in Chinese', () => {
    expect(category(['A♠', 'K♠', 'Q♠', 'J♠', '10♠']).label).toBe('同花顺')
    expect(category(['K♠', 'K♥', 'K♦', '7♣', '7♠']).label).toBe('葫芦')
    expect(category(['A♠', 'J♥', '9♦', '6♣', '3♠']).label).toBe('高牌')
  })

  it('treats A-2-3-4-5 as a five-high straight', () => {
    const wheel = evaluate(cards('A♠', '2♥', '3♦', '4♣', '5♠'))
    expect(wheel.category).toBe(4)
    expect(wheel.tiebreak[0]).toBe(5)
    expect(compareHands(wheel, evaluate(cards('2♠', '3♥', '4♦', '5♣', '6♠')))).toBeLessThan(0)
  })

  it('picks the best five of seven and keeps the best kickers', () => {
    const value = evaluate(cards('A♠', 'A♥', 'A♦', 'K♣', 'K♠', '2♦', '3♥'))
    expect(value.category).toBe(6)
    expect(value.cards).toHaveLength(5)
    expect(value.tiebreak.slice(0, 2)).toEqual([14, 13])

    const flush = evaluate(cards('A♠', 'K♠', '9♠', '7♠', '4♠', '2♥', '3♦'))
    expect(flush.category).toBe(5)
    expect(flush.tiebreak.slice(0, 5)).toEqual([14, 13, 9, 7, 4])
  })

  it('ranks a made straight flush above a plain flush and quads above a full house', () => {
    expect(
      compareHands(
        evaluate(cards('9♥', '8♥', '7♥', '6♥', '5♥')),
        evaluate(cards('A♠', 'J♠', '9♠', '5♠', '2♠')),
      ),
    ).toBeGreaterThan(0)
    expect(
      compareHands(
        evaluate(cards('9♠', '9♥', '9♦', '9♣', 'K♠')),
        evaluate(cards('K♠', 'K♥', 'K♦', '7♣', '7♠')),
      ),
    ).toBeGreaterThan(0)
  })

  it('compares kickers and treats identical hands as a tie', () => {
    const aceKing = evaluate(cards('A♠', 'A♥', 'K♦', 'Q♣', '9♠'))
    const aceQueen = evaluate(cards('A♦', 'A♣', 'Q♥', 'J♠', '8♦'))
    expect(compareHands(aceKing, aceQueen)).toBeGreaterThan(0)

    const copyA = evaluate(cards('A♠', 'A♥', 'K♦', 'Q♣', '9♠'))
    const copyB = evaluate(cards('A♦', 'A♣', 'K♥', 'Q♦', '9♥'))
    expect(compareHands(copyA, copyB)).toBe(0)
  })

  it('uses full house before trips and two pair before one pair', () => {
    const fullHouse = evaluate(cards('K♠', 'K♥', 'K♦', '7♣', '7♠'))
    const trips = evaluate(cards('K♠', 'K♥', 'K♦', 'Q♣', 'J♠'))
    expect(compareHands(fullHouse, trips)).toBeGreaterThan(0)

    const twoPair = evaluate(cards('J♠', 'J♥', '8♦', '8♣', 'A♠'))
    const pair = evaluate(cards('J♠', 'J♥', 'A♦', '8♣', '3♠'))
    expect(compareHands(twoPair, pair)).toBeGreaterThan(0)
  })

  it('rejects impossible hand sizes', () => {
    expect(() => evaluate(cards('A♠', 'K♠', 'Q♠', 'J♠'))).toThrow('需要 5–7 张牌')
  })
})
