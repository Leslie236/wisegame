/** Shared playing-card model and deck factory used by every game in the room. */

export interface Card {
  rank: string
  suit: string
}

export const SUITS = ['♠', '♥', '♣', '♦'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export type Rng = () => number

/** Builds a freshly shuffled 52-card deck. Pass a seeded rng for deterministic tests. */
export function createDeck(rng: Rng = Math.random): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit })
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const card = deck[i]!
    deck[i] = deck[j]!
    deck[j] = card
  }
  return deck
}
