import type { Pot, Seat } from './types'

/**
 * Splits all committed chips into main/side pots.
 * Folded players' chips stay in the pot but they are not eligible to win it.
 */
export function buildPots(seats: Seat[]): Pot[] {
  const levels = [...new Set(seats.map((seat) => seat.totalBet).filter((value) => value > 0))].sort(
    (a, b) => a - b,
  )
  const pots: Pot[] = []
  let previous = 0
  for (const level of levels) {
    let amount = 0
    for (const seat of seats) {
      amount += Math.max(0, Math.min(seat.totalBet, level) - previous)
    }
    const eligible = seats
      .filter((seat) => seat.status !== 'folded' && seat.status !== 'out' && seat.totalBet >= level)
      .map((seat) => seat.id)
    const previousPot = pots[pots.length - 1]
    if (eligible.length > 0) {
      const sameEligibility =
        previousPot &&
        previousPot.eligible.length === eligible.length &&
        previousPot.eligible.every((id, index) => id === eligible[index])
      if (sameEligibility) previousPot.amount += amount
      else pots.push({ amount, eligible })
    } else if (previousPot) {
      // Dead money from folded players is merged into the previous layer.
      previousPot.amount += amount
    }
    previous = level
  }
  return pots
}

/** Seats in clockwise order starting immediately left of the button. */
export function seatOrderFromButton(
  seatIds: number[],
  button: number,
  seatCount: number,
): number[] {
  const distance = (id: number) => (id - button - 1 + seatCount * 2) % seatCount
  return [...seatIds].sort((a, b) => distance(a) - distance(b) || a - b)
}

/** Splits a pot, awarding odd chips clockwise from the button. */
export function splitPot(
  amount: number,
  winners: number[],
  button: number,
  seatCount: number,
): Record<number, number> {
  const awards: Record<number, number> = {}
  if (winners.length === 0) return awards
  const base = Math.floor(amount / winners.length)
  let remainder = amount % winners.length
  for (const id of seatOrderFromButton(winners, button, seatCount)) {
    awards[id] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }
  return awards
}
