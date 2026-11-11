import type { Card } from '@/game/cards'

import type { HandValue } from './types'

export const CATEGORY_LABELS = [
  '高牌',
  '一对',
  '两对',
  '三条',
  '顺子',
  '同花',
  '葫芦',
  '四条',
  '同花顺',
] as const

export function rankValue(rank: string): number {
  if (rank === 'A') return 14
  if (rank === 'K') return 13
  if (rank === 'Q') return 12
  if (rank === 'J') return 11
  return Number(rank)
}

function straightHigh(ranks: number[]): number | null {
  const unique = [...new Set(ranks)].sort((a, b) => b - a)
  // The wheel A-2-3-4-5 plays as a five-high straight.
  if (unique.includes(14)) {
    unique.push(1)
    unique.sort((a, b) => b - a)
  }
  for (let i = 0; i <= unique.length - 5; i++) {
    if (unique[i]! - unique[i + 4]! === 4) return unique[i]!
  }
  return null
}

function makeValue(category: number, tiebreak: number[], cards: Card[]): HandValue {
  const padded = [...tiebreak]
  while (padded.length < 5) padded.push(0)
  return {
    category,
    tiebreak: padded,
    cards: [...cards].sort((a, b) => rankValue(b.rank) - rankValue(a.rank)),
    label: CATEGORY_LABELS[category]!,
  }
}

function evaluateFive(cards: Card[]): HandValue {
  const ranks = cards.map((card) => rankValue(card.rank)).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  for (const rank of ranks) counts.set(rank, (counts.get(rank) ?? 0) + 1)
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const flush = cards.every((card) => card.suit === cards[0]!.suit)
  const high = straightHigh(ranks)

  if (flush && high) return makeValue(8, [high], cards)

  if (groups[0]![1] === 4) {
    const quad = groups[0]![0]
    const kicker = ranks.find((rank) => rank !== quad)!
    return makeValue(7, [quad, kicker], cards)
  }

  if (groups[0]![1] === 3 && groups[1]?.[1] === 2) {
    return makeValue(6, [groups[0]![0], groups[1]![0]], cards)
  }

  if (flush) return makeValue(5, ranks.slice(0, 5), cards)

  if (high) return makeValue(4, [high], cards)

  if (groups[0]![1] === 3) {
    const kickers = ranks.filter((rank) => rank !== groups[0]![0]).slice(0, 2)
    return makeValue(3, [groups[0]![0], ...kickers], cards)
  }

  if (groups[0]![1] === 2 && groups[1]?.[1] === 2) {
    const kicker = ranks.find((rank) => rank !== groups[0]![0] && rank !== groups[1]![0])!
    return makeValue(2, [groups[0]![0], groups[1]![0], kicker], cards)
  }

  if (groups[0]![1] === 2) {
    const kickers = ranks.filter((rank) => rank !== groups[0]![0]).slice(0, 3)
    return makeValue(1, [groups[0]![0], ...kickers], cards)
  }

  return makeValue(0, ranks.slice(0, 5), cards)
}

function combinationsOfFive(cards: Card[]): Card[][] {
  const result: Card[][] = []
  const pick = (start: number, current: Card[]) => {
    if (current.length === 5) {
      result.push([...current])
      return
    }
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]!)
      pick(i + 1, current)
      current.pop()
    }
  }
  pick(0, [])
  return result
}

/** Evaluates a 5–7 card hand and returns its best five-card value. */
export function evaluate(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`需要 5–7 张牌，收到 ${cards.length} 张`)
  }
  if (cards.length === 5) return evaluateFive(cards)
  let best: HandValue | null = null
  for (const combo of combinationsOfFive(cards)) {
    const value = evaluateFive(combo)
    if (!best || compareHands(value, best) > 0) best = value
  }
  return best!
}

export function compareHands(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category
  for (let i = 0; i < 5; i++) {
    const diff = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
