import { evaluate, rankValue } from './evaluator'
import { legalActions } from './engine'
import type { Action, TableState } from './types'
import type { Card } from '@/game/cards'

export interface BotProfile {
  name: string
  /** 0 = loose, 1 = tight. */
  tightness: number
  /** 0 = passive, 1 = aggressive. */
  aggression: number
  /** Bluff frequency when checked to. */
  bluff: number
}

export const BOT_PROFILES: BotProfile[] = [
  { name: '岩石', tightness: 0.85, aggression: 0.25, bluff: 0.03 },
  { name: '薇拉', tightness: 0.7, aggression: 0.65, bluff: 0.08 },
  { name: '幸运儿', tightness: 0.4, aggression: 0.8, bluff: 0.18 },
  { name: '老莫', tightness: 0.35, aggression: 0.15, bluff: 0.02 },
]

const POSTFLOP_STRENGTH = [0.18, 0.38, 0.58, 0.72, 0.82, 0.88, 0.93, 0.97, 1]

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Coarse 0–1 hand strength used by the bots. */
export function handStrength(hole: Card[], board: Card[]): number {
  if (hole.length < 2) return 0
  if (board.length === 0) {
    const ranks = hole.map((card) => rankValue(card.rank)).sort((a, b) => b - a)
    const high = ranks[0]!
    const low = ranks[1]!
    let value: number
    if (high === low) {
      value = 0.5 + ((high - 2) / 12) * 0.5
    } else {
      value = ((high + low) / 28) * 0.75
      if (high >= 11 && low >= 10) value += 0.1
      if (hole[0]!.suit === hole[1]!.suit) value += 0.06
      if (high - low === 1) value += 0.03
    }
    return clamp(value, 0, 1)
  }
  if (board.length + hole.length < 5) return 0.2
  const value = evaluate([...hole, ...board])
  return POSTFLOP_STRENGTH[value.category] ?? 0.2
}

/**
 * Picks a legal action for a bot. Only the bot's own cards and public state are
 * read, so this cannot leak opponents' hole cards.
 */
export function chooseAction(
  state: TableState,
  seatId: number,
  profile: BotProfile = BOT_PROFILES[1]!,
  rng: () => number = Math.random,
): Action {
  const seat = state.seats[seatId]
  if (!seat) throw new Error('玩家不存在')
  const legal = legalActions(state, seatId)
  if (!legal.fold) throw new Error('还没轮到该玩家行动')

  const pot = state.seats.reduce((sum, item) => sum + item.totalBet, 0)
  const strength = handStrength(seat.hole, state.board)
  const callAmount = legal.call?.amount ?? 0
  // A short stack cannot win the unmatched part of an opponent's bet.
  const contributionCap = seat.totalBet + callAmount
  const callablePot = state.seats.reduce(
    (sum, item) => sum + Math.min(item.totalBet, contributionCap),
    0,
  )
  const potOdds = callAmount > 0 ? callAmount / (callablePot + callAmount) : 0
  const random = rng()

  if (legal.check) {
    const wantsValueBet = strength > 0.62 + (1 - profile.aggression) * 0.08
    const wantsBluff = legal.bet !== null && random < profile.bluff
    if (legal.bet && (wantsValueBet || wantsBluff)) {
      const target = state.currentBet + Math.round(pot * (0.5 + rng() * 0.25))
      return { type: 'bet', to: clamp(target, legal.bet.min, legal.bet.max) }
    }
    return { type: 'check' }
  }

  const styleAdjustment = (profile.tightness - 0.5) * 0.12
  const stackFraction = callAmount / Math.max(seat.stack, 1)
  const expensiveCall = callAmount >= state.bigBlind * 5
  // Hand strength is a heuristic, not equity. Large commitments need a
  // separate quality floor even when the displayed pot odds look attractive.
  const pressureFloor = expensiveCall
    ? state.street === 'preflop'
      ? stackFraction >= 0.75
        ? 0.84
        : stackFraction >= 0.4
          ? 0.72
          : 0.58
      : stackFraction >= 0.75
        ? 0.55
        : stackFraction >= 0.4
          ? 0.44
          : 0.32
    : 0
  const required = Math.max(potOdds + styleAdjustment, pressureFloor + styleAdjustment)
  if (strength < required) {
    return { type: 'fold' }
  }

  const wantsRaise = legal.raise !== null && strength > 0.78 && random < profile.aggression
  if (wantsRaise) {
    const target =
      state.currentBet + Math.max(state.lastFullRaise, Math.round(pot * (0.5 + rng() * 0.25)))
    return { type: 'raise', to: clamp(target, legal.raise!.min, legal.raise!.max) }
  }

  if (legal.call) return { type: 'call' }
  return legal.check ? { type: 'check' } : { type: 'fold' }
}
