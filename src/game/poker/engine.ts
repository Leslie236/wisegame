import { createDeck, type Card } from '@/game/cards'

import { compareHands, evaluate } from './evaluator'
import { buildPots, splitPot } from './pot'
import type {
  Action,
  ActionType,
  HandResult,
  HandValue,
  LegalActions,
  PotResult,
  Seat,
  SeatStatus,
  Street,
  TableConfig,
  TableState,
} from './types'

const NEXT_STREET: Partial<Record<Street, Street>> = {
  preflop: 'flop',
  flop: 'turn',
  turn: 'river',
}

function isInHand(seat: Seat): boolean {
  return seat.status !== 'folded' && seat.status !== 'out'
}

function isActive(seat: Seat): boolean {
  return seat.status === 'active'
}

function nextSeat(seats: Seat[], from: number, predicate: (seat: Seat) => boolean): number | null {
  const count = seats.length
  for (let offset = 0; offset < count; offset++) {
    const index = (((from + offset) % count) + count) % count
    if (predicate(seats[index]!)) return index
  }
  return null
}

function normalizeSeat(index: number, seatCount: number): number {
  return ((index % seatCount) + seatCount) % seatCount
}

function draw(deck: Card[]): Card {
  const card = deck.pop()
  if (!card) throw new Error('牌堆已经空了')
  return card
}

function commit(seat: Seat, amount: number): number {
  const paid = Math.min(Math.max(amount, 0), seat.stack)
  seat.stack -= paid
  seat.streetBet += paid
  seat.totalBet += paid
  if (seat.stack === 0) seat.status = 'all-in'
  return paid
}

function postBlind(seat: Seat, amount: number) {
  const paid = Math.min(amount, seat.stack)
  seat.stack -= paid
  seat.streetBet += paid
  seat.totalBet += paid
  if (seat.stack === 0) seat.status = 'all-in'
}

function registerAggression(state: TableState, seatId: number, previousBet: number) {
  const seat = state.seats[seatId]!
  if (seat.streetBet <= previousBet) return
  const increment = seat.streetBet - previousBet
  state.currentBet = seat.streetBet
  if (increment >= state.lastFullRaise) state.lastFullRaise = increment
  state.lastAggressor = seatId
  // Simplified rule (confirmed for v1): any all-in raise reopens the action.
  for (const other of state.seats) {
    if (other.id !== seatId && other.status === 'active') {
      other.hasActed = false
      other.canRaise = true
    }
  }
}

export function createTable(config: TableConfig): TableState {
  if (config.seats.length < 2) throw new Error('至少需要两名玩家')
  if (config.smallBlind <= 0 || config.bigBlind < config.smallBlind) {
    throw new Error('盲注配置不合法')
  }
  const seats: Seat[] = config.seats.map((seat, index) => ({
    id: index,
    name: seat.name,
    isHero: seat.isHero ?? false,
    stack: seat.stack ?? config.startingStack,
    hole: [],
    streetBet: 0,
    totalBet: 0,
    status: (seat.stack ?? config.startingStack) > 0 ? 'active' : 'out',
    lastAction: null,
    hasActed: false,
    canRaise: true,
  }))
  return {
    seats,
    button: normalizeSeat(config.button ?? 0, seats.length),
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    smallBlindSeat: null,
    bigBlindSeat: null,
    street: 'idle',
    board: [],
    deck: [],
    currentBet: 0,
    lastFullRaise: config.bigBlind,
    actor: null,
    lastAggressor: null,
    handNo: 0,
    pots: [],
    result: null,
    log: [],
  }
}

export function startHand(state: TableState, deck?: Card[]): TableState {
  const seats = state.seats.map<Seat>((seat) => ({
    ...seat,
    hole: [],
    streetBet: 0,
    totalBet: 0,
    status: seat.stack > 0 ? 'active' : 'out',
    lastAction: null,
    hasActed: false,
    canRaise: true,
  }))
  const players = seats.filter((seat) => seat.stack > 0)
  if (players.length < 2) throw new Error('至少需要两名有筹码的玩家')

  let button = normalizeSeat(state.button, seats.length)
  if (state.handNo > 0) {
    button = nextSeat(seats, button + 1, (seat) => seat.stack > 0) ?? button
  } else if (seats[button]!.stack <= 0) {
    button = nextSeat(seats, button, (seat) => seat.stack > 0) ?? button
  }

  let smallBlindSeat: number
  let bigBlindSeat: number
  if (players.length === 2) {
    smallBlindSeat = button
    bigBlindSeat = nextSeat(seats, smallBlindSeat + 1, (seat) => seat.stack > 0)!
  } else {
    smallBlindSeat = nextSeat(seats, button + 1, (seat) => seat.stack > 0)!
    bigBlindSeat = nextSeat(seats, smallBlindSeat + 1, (seat) => seat.stack > 0)!
  }

  postBlind(seats[smallBlindSeat]!, state.smallBlind)
  postBlind(seats[bigBlindSeat]!, state.bigBlind)

  const cards = deck ? [...deck] : createDeck()
  for (let round = 0; round < 2; round++) {
    for (const seat of seats) {
      if (seat.status !== 'out') seat.hole.push(draw(cards))
    }
  }

  const actor = nextSeat(seats, bigBlindSeat + 1, isActive)
  const next: TableState = {
    ...state,
    seats,
    button,
    smallBlindSeat,
    bigBlindSeat,
    street: 'preflop',
    board: [],
    deck: cards,
    currentBet: state.bigBlind,
    lastFullRaise: state.bigBlind,
    actor,
    lastAggressor: null,
    handNo: state.handNo + 1,
    pots: [],
    result: null,
    log: [],
  }
  if (actor === null) return runoutAndShowdown(next)
  return next
}

export function legalActions(state: TableState, seatId: number): LegalActions {
  const none: LegalActions = {
    fold: false,
    check: false,
    call: null,
    bet: null,
    raise: null,
    allIn: null,
  }
  if (state.actor !== seatId) return none
  if (
    state.street !== 'preflop' &&
    state.street !== 'flop' &&
    state.street !== 'turn' &&
    state.street !== 'river'
  ) {
    return none
  }
  const seat = state.seats[seatId]
  if (!seat || seat.status !== 'active') return none

  const toCall = Math.max(0, state.currentBet - seat.streetBet)
  const legal: LegalActions = {
    fold: true,
    check: toCall === 0,
    call: toCall > 0 ? { amount: Math.min(toCall, seat.stack) } : null,
    bet: null,
    raise: null,
    allIn: seat.stack > 0 ? { amount: seat.stack } : null,
  }

  if (state.currentBet === 0) {
    legal.bet = { min: Math.min(state.bigBlind, seat.stack), max: seat.stack }
  } else {
    const max = seat.streetBet + seat.stack
    const min = state.currentBet + state.lastFullRaise
    if (seat.canRaise && max >= min) legal.raise = { min, max }
  }
  return legal
}

export function applyAction(state: TableState, seatId: number, action: Action): TableState {
  if (state.actor !== seatId) throw new Error('还没轮到该玩家行动')
  const legal = legalActions(state, seatId)
  const seat = state.seats[seatId]
  if (!seat) throw new Error('玩家不存在')
  if (seat.status !== 'active') throw new Error('该玩家无法行动')

  const next: TableState = {
    ...state,
    seats: state.seats.map((item) => ({ ...item, hole: [...item.hole] })),
    log: [...state.log],
  }
  const actor = next.seats[seatId]!
  const previousBet = next.currentBet
  let logAmount = 0

  switch (action.type) {
    case 'fold': {
      if (!legal.fold) throw new Error('当前不能弃牌')
      actor.status = 'folded'
      actor.lastAction = 'fold'
      break
    }
    case 'check': {
      if (!legal.check) throw new Error('当前不能过牌')
      actor.lastAction = 'check'
      break
    }
    case 'call': {
      if (!legal.call) throw new Error('当前不能跟注')
      logAmount = commit(actor, legal.call.amount)
      actor.lastAction = 'call'
      break
    }
    case 'bet': {
      if (!legal.bet) throw new Error('当前不能下注')
      if (!Number.isInteger(action.to)) throw new Error('下注额必须是整数')
      if (action.to < legal.bet.min || action.to > legal.bet.max) {
        throw new Error('下注额超出允许范围')
      }
      logAmount = commit(actor, action.to - actor.streetBet)
      registerAggression(next, seatId, previousBet)
      actor.lastAction = 'bet'
      break
    }
    case 'raise': {
      if (!legal.raise) throw new Error('当前不能加注')
      if (!Number.isInteger(action.to)) throw new Error('加注额必须是整数')
      if (action.to < legal.raise.min || action.to > legal.raise.max) {
        throw new Error('加注额超出允许范围')
      }
      logAmount = commit(actor, action.to - actor.streetBet)
      registerAggression(next, seatId, previousBet)
      actor.lastAction = 'raise'
      break
    }
    case 'all-in': {
      if (!legal.allIn) throw new Error('当前不能全下')
      const to = actor.streetBet + actor.stack
      logAmount = commit(actor, actor.stack)
      if (to > previousBet) registerAggression(next, seatId, previousBet)
      actor.lastAction = 'all-in'
      break
    }
    default:
      throw new Error('未知动作')
  }

  actor.hasActed = true
  next.log.push({
    handNo: next.handNo,
    street: next.street,
    seatId,
    action: action.type as ActionType,
    amount: logAmount,
  })
  return progress(next)
}

function progress(state: TableState): TableState {
  const remaining = state.seats.filter(isInHand)
  if (remaining.length <= 1) return settleUncontested(state)

  const active = remaining.filter(isActive)
  if (active.length === 0) return runoutAndShowdown(state)

  const roundComplete = active.every((seat) => seat.hasActed && seat.streetBet === state.currentBet)
  if (roundComplete) return advanceStreet(state)

  const actor = nextSeat(state.seats, (state.actor ?? state.button) + 1, isActive)
  if (actor === null) return advanceStreet(state)
  return { ...state, actor }
}

function advanceStreet(state: TableState): TableState {
  const remaining = state.seats.filter(isInHand)
  if (remaining.length <= 1) return settleUncontested(state)
  if (state.street === 'river') return showdown(state)

  const nextStreet = NEXT_STREET[state.street]
  if (!nextStreet) return showdown(state)

  const deck = [...state.deck]
  const board = [...state.board]
  draw(deck) // burn
  if (nextStreet === 'flop') {
    board.push(draw(deck), draw(deck), draw(deck))
  } else {
    board.push(draw(deck))
  }

  const seats = state.seats.map<Seat>((seat) => ({
    ...seat,
    streetBet: 0,
    hasActed: false,
    lastAction: null,
    canRaise: true,
  }))
  const next: TableState = {
    ...state,
    seats,
    board,
    deck,
    street: nextStreet,
    currentBet: 0,
    lastFullRaise: state.bigBlind,
    actor: null,
    lastAggressor: null,
  }

  const active = seats.filter(isActive)
  if (active.length <= 1) return runoutAndShowdown(next)
  const actor = nextSeat(seats, state.button + 1, isActive)
  if (actor === null) return runoutAndShowdown(next)
  return { ...next, actor }
}

function runoutAndShowdown(state: TableState): TableState {
  const deck = [...state.deck]
  const board = [...state.board]
  while (board.length < 5) {
    draw(deck) // burn
    if (board.length === 0) {
      board.push(draw(deck), draw(deck), draw(deck))
    } else {
      board.push(draw(deck))
    }
  }
  const seats = state.seats.map<Seat>((seat) => ({
    ...seat,
    streetBet: 0,
    hasActed: false,
    lastAction: null,
  }))
  return showdown({ ...state, seats, board, deck })
}

function settleUncontested(state: TableState): TableState {
  const winner = state.seats.find(isInHand)
  if (!winner) throw new Error('没有可结算的玩家')
  const potTotal = state.seats.reduce((sum, seat) => sum + seat.totalBet, 0)
  const awards: Record<number, number> = { [winner.id]: potTotal }
  const net: Record<number, number> = {}
  for (const seat of state.seats) net[seat.id] = (awards[seat.id] ?? 0) - seat.totalBet
  const seats = state.seats.map<Seat>((seat) => ({
    ...seat,
    stack: seat.stack + (awards[seat.id] ?? 0),
    streetBet: 0,
    hasActed: false,
  }))
  const result: HandResult = {
    pots: [{ amount: potTotal, eligible: [winner.id], winners: [winner.id], best: null }],
    awards,
    net,
    revealed: false,
    hands: {},
  }
  return {
    ...state,
    seats,
    street: 'complete',
    actor: null,
    pots: [{ amount: potTotal, eligible: [winner.id] }],
    result,
  }
}

function showdown(state: TableState): TableState {
  const remaining = state.seats.filter(isInHand)
  const hands: Record<number, HandValue> = {}
  for (const seat of remaining) {
    hands[seat.id] = evaluate([...seat.hole, ...state.board])
  }

  const pots = buildPots(state.seats)
  const awards: Record<number, number> = {}
  const potResults: PotResult[] = []

  for (const pot of pots) {
    let best: HandValue | null = null
    let winners: number[] = []
    for (const id of pot.eligible) {
      const hand = hands[id]
      if (!hand) continue
      if (!best || compareHands(hand, best) > 0) {
        best = hand
        winners = [id]
      } else if (compareHands(hand, best) === 0) {
        winners.push(id)
      }
    }
    if (!best || winners.length === 0) continue
    const split = splitPot(pot.amount, winners, state.button, state.seats.length)
    for (const [id, amount] of Object.entries(split)) {
      const seatId = Number(id)
      awards[seatId] = (awards[seatId] ?? 0) + amount
    }
    potResults.push({ ...pot, winners, best })
  }

  const net: Record<number, number> = {}
  for (const seat of state.seats) net[seat.id] = (awards[seat.id] ?? 0) - seat.totalBet
  const seats = state.seats.map<Seat>((seat) => ({
    ...seat,
    stack: seat.stack + (awards[seat.id] ?? 0),
    streetBet: 0,
    hasActed: false,
  }))
  const result: HandResult = {
    pots: potResults,
    awards,
    net,
    revealed: remaining.length > 1,
    hands,
  }
  return {
    ...state,
    seats,
    street: 'complete',
    actor: null,
    pots,
    result,
  }
}

export type { Action, LegalActions, Seat, TableState } from './types'
export type { SeatStatus }
