import type { CheatAction, CheatType, TableState } from './types'

/** Add future abilities here, keeping their rules separate from betting actions. */
export const CHEATS: Record<CheatType, { label: string; rate: number; minimum: number }> = {
  'swap-card': { label: '随机换牌', rate: 0.1, minimum: 100 },
}

export function cheatAvailability(state: TableState, seatId: number, type: CheatType) {
  const seat = state.seats[seatId]
  const ability = CHEATS[type]
  const rawCost = (seat?.stack ?? 0) * ability.rate
  const cost = Math.ceil(rawCost)
  let reason = ''
  if (
    !seat ||
    state.actor !== seatId ||
    seat.status !== 'active' ||
    !['preflop', 'flop', 'turn', 'river'].includes(state.street)
  ) {
    reason = '仅可在自己的行动回合使用'
  } else if (seat.cheatsUsed.includes(type)) {
    reason = '本局已使用'
  } else if (rawCost < ability.minimum) {
    reason = '剩余筹码的 10% 不足 100，无法使用'
  } else if (seat.stack < cost || state.deck.length === 0 || seat.hole.length !== 2) {
    reason = '当前无法使用'
  }
  return { cost, allowed: reason === '', reason }
}

/** Fees leave the table; discarded cards never return to the live deck. */
export function applyCheat(state: TableState, seatId: number, action: CheatAction): TableState {
  if (action.type !== 'swap-card') throw new Error('未知作弊功能')
  const availability = cheatAvailability(state, seatId, action.type)
  if (!availability.allowed) throw new Error(availability.reason)
  if (!Number.isInteger(action.cardIndex) || action.cardIndex < 0 || action.cardIndex > 1) {
    throw new Error('请选择一张自己的底牌')
  }
  const deck = [...state.deck]
  const [card] = deck.splice(Math.floor(Math.random() * deck.length), 1)
  const seats = state.seats.map((seat) => {
    if (seat.id !== seatId) return seat
    const hole = [...seat.hole]
    hole[action.cardIndex] = card!
    return {
      ...seat,
      hole,
      stack: seat.stack - availability.cost,
      cheatSpent: seat.cheatSpent + availability.cost,
      cheatsUsed: [...seat.cheatsUsed, action.type],
    }
  })
  return { ...state, seats, deck }
}
