import type { Card } from '@/game/cards'

export type Street = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete'
export type SeatStatus = 'active' | 'folded' | 'all-in' | 'out'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export interface Seat {
  id: number
  name: string
  isHero: boolean
  stack: number
  hole: Card[]
  /** Chips committed on the current street. */
  streetBet: number
  /** Chips committed during the whole hand. */
  totalBet: number
  status: SeatStatus
  lastAction: ActionType | null
  hasActed: boolean
  canRaise: boolean
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; to: number }
  | { type: 'raise'; to: number }
  | { type: 'all-in' }

export interface LegalActions {
  fold: boolean
  check: boolean
  call: { amount: number } | null
  bet: { min: number; max: number } | null
  raise: { min: number; max: number } | null
  allIn: { amount: number } | null
}

/** 0 = high card … 8 = straight flush. */
export interface HandValue {
  category: number
  tiebreak: number[]
  cards: Card[]
  label: string
}

export interface Pot {
  amount: number
  eligible: number[]
}

export interface PotResult extends Pot {
  winners: number[]
  best: HandValue | null
}

export interface HandResult {
  pots: PotResult[]
  awards: Record<number, number>
  net: Record<number, number>
  revealed: boolean
  hands: Record<number, HandValue>
}

export interface LogEntry {
  handNo: number
  street: Street
  seatId: number
  action: ActionType
  amount: number
}

export interface TableSeatConfig {
  name: string
  isHero?: boolean
  stack?: number
}

export interface TableConfig {
  seats: TableSeatConfig[]
  startingStack: number
  smallBlind: number
  bigBlind: number
  button?: number
}

export interface TableState {
  seats: Seat[]
  button: number
  smallBlind: number
  bigBlind: number
  smallBlindSeat: number | null
  bigBlindSeat: number | null
  street: Street
  board: Card[]
  deck: Card[]
  currentBet: number
  lastFullRaise: number
  actor: number | null
  lastAggressor: number | null
  handNo: number
  pots: Pot[]
  result: HandResult | null
  log: LogEntry[]
}
