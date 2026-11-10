export interface Card {
  rank: string
  suit: string
}
export function score(cards: Card[]) {
  let total = 0,
    aces = 0
  for (const card of cards) {
    if (card.rank === 'A') {
      total += 11
      aces++
    } else total += ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank)
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}
export function createDeck(): Card[] {
  const deck = ['♠', '♥', '♣', '♦'].flatMap((suit) =>
    ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].map((rank) => ({
      rank,
      suit,
    })),
  )
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const card = deck[i]!
    deck[i] = deck[j]!
    deck[j] = card
  }
  return deck
}
export function payout(player: Card[], dealer: Card[], bet: number, allowBlackjack = true) {
  const p = score(player),
    d = score(dealer)
  const pb = allowBlackjack && p === 21 && player.length === 2,
    db = d === 21 && dealer.length === 2
  if (p > 21) return 0
  if (pb && !db) return bet * 2.5
  if (db && !pb) return 0
  if (pb && db) return bet
  if (d > 21 || p > d) return bet * 2
  return p === d ? bet : 0
}
