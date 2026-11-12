import { computed, onUnmounted, ref, watch, type Ref } from 'vue'

import { STARTING_BALANCE, useWallet } from '@/composables/useWallet'
import { BOT_PROFILES, chooseAction } from '@/game/poker/ai'
import { applyAction, createTable, legalActions, startHand } from '@/game/poker/engine'
import { buildPots } from '@/game/poker/pot'
import type { Action, LegalActions, TableState } from '@/game/poker/types'

export const BIG_BLIND = 20
export const SMALL_BLIND = 10

const AI_PROFILES = BOT_PROFILES.slice(1)
const AI_STARTING_STACK = 1000

const STREET_LABELS: Record<string, string> = {
  idle: '等待开局',
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
  complete: '结算',
}

function emptyLegal(): LegalActions {
  return { fold: false, check: false, call: null, bet: null, raise: null, allIn: null }
}

export interface HoldemOptions {
  /** Pauses bot timers, e.g. while the rules dialog is open. */
  paused?: Ref<boolean>
}

/** Drives a 4-handed no-limit hold'em table against three bots. */
export function useHoldem(options: HoldemOptions = {}) {
  const paused = options.paused
  const { balance } = useWallet()

  function freshTable(): TableState {
    return createTable({
      seats: [
        { name: '你', isHero: true, stack: balance.value },
        ...AI_PROFILES.map((profile) => ({ name: profile.name, stack: AI_STARTING_STACK })),
      ],
      startingStack: AI_STARTING_STACK,
      smallBlind: SMALL_BLIND,
      bigBlind: BIG_BLIND,
      button: 0,
    })
  }

  const state = ref<TableState>(freshTable())
  const message = ref('入座，准备开局。')
  const detail = ref('点击「开始新的一手」发牌。')
  const thinkingSeat = ref<number | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  const hero = computed(() => state.value.seats[0]!)
  const legal = computed<LegalActions>(() =>
    state.value.actor === 0 ? legalActions(state.value, 0) : emptyLegal(),
  )
  const isHeroTurn = computed(() => state.value.actor === 0)
  const inHand = computed(() => state.value.street !== 'idle' && state.value.street !== 'complete')
  const handComplete = computed(() => state.value.street === 'complete')
  const canStart = computed(() => !inHand.value && state.value.seats[0]!.stack >= BIG_BLIND)
  const needsRebuy = computed(() => !inHand.value && state.value.seats[0]!.stack < BIG_BLIND)
  const pot = computed(() => state.value.seats.reduce((sum, seat) => sum + seat.totalBet, 0))
  const sidePots = computed(() => buildPots(state.value.seats))
  const handNo = computed(() => state.value.handNo)
  const streetLabel = computed(() => STREET_LABELS[state.value.street] ?? '牌桌')
  const heroNet = computed(() => state.value.result?.net[0] ?? 0)
  const winnerIds = computed(
    () => new Set(state.value.result?.pots.flatMap((potResult) => potResult.winners) ?? []),
  )

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  function resultMessage(current: TableState): string {
    const result = current.result
    if (!result) return '本手结束。'
    if (current.seats[0]!.status === 'folded') return '你已弃牌。'
    const net = result.net[0] ?? 0
    if (net > 0) return `你赢了 ${net} 筹码。`
    if (net === 0) return '平局，下注退回。'
    return `本手输了 ${Math.abs(net)} 筹码。`
  }

  function syncMessage() {
    const current = state.value
    if (current.street === 'idle') {
      message.value = '入座，准备开局。'
      detail.value = '点击「开始新的一手」发牌。'
      return
    }
    if (current.street === 'complete') {
      message.value = resultMessage(current)
      detail.value = `底池 ${pot.value.toLocaleString()} · ${heroNet.value > 0 ? '+' : ''}${heroNet.value} 筹码`
      return
    }
    const heroSeat = current.seats[0]!
    if (heroSeat.status === 'folded') {
      message.value = '你已弃牌。'
      detail.value = '等待本手结算。'
      return
    }
    if (heroSeat.status === 'all-in') {
      message.value = '你已全下，等待发牌。'
      detail.value = `底池 ${pot.value.toLocaleString()} 筹码`
      return
    }
    if (current.actor === 0) {
      message.value = '轮到你行动。'
      const callAmount = legal.value.call?.amount ?? 0
      detail.value =
        callAmount > 0
          ? `需跟注 ${callAmount} 筹码 · 底池 ${pot.value}`
          : `可以过牌或下注 · 底池 ${pot.value}`
      return
    }
    if (current.actor !== null) {
      message.value = `${current.seats[current.actor]!.name} 思考中…`
      detail.value = `底池 ${pot.value.toLocaleString()} 筹码 · 等待对手行动`
    }
  }

  let newcomerCount = 0

  function replaceBustedAi(current: TableState): TableState {
    return {
      ...current,
      seats: current.seats.map((seat) =>
        seat.isHero || seat.stack > 0
          ? seat
          : {
              ...seat,
              name: `新玩家 ${++newcomerCount}`,
              stack: 1000 + Math.floor(Math.random() * 4001),
            },
      ),
    }
  }

  function startNext() {
    if (inHand.value) return
    clearTimer()
    if (state.value.seats[0]!.stack < BIG_BLIND) {
      message.value = '筹码不足。'
      detail.value = '请先重新买入 1,000 筹码。'
      return
    }
    try {
      state.value = startHand(replaceBustedAi(state.value))
      syncMessage()
    } catch (error) {
      message.value = error instanceof Error ? error.message : '无法开始新的一手。'
    }
  }

  function fallbackAction(current: TableState, seatId: number): Action {
    const options = legalActions(current, seatId)
    if (options.check) return { type: 'check' }
    if (options.call) return { type: 'call' }
    return { type: 'fold' }
  }

  function act(action: Action) {
    if (state.value.actor !== 0) return
    try {
      state.value = applyAction(state.value, 0, action)
      syncMessage()
    } catch (error) {
      message.value = error instanceof Error ? error.message : '这个动作现在不能做。'
    }
  }

  function rebuy() {
    if (inHand.value) return
    balance.value = STARTING_BALANCE
    state.value = freshTable()
    clearTimer()
    thinkingSeat.value = null
    syncMessage()
  }

  watch(
    () => state.value.seats[0]?.stack,
    (stack) => {
      if (typeof stack === 'number' && stack !== balance.value) balance.value = stack
    },
  )

  function scheduleAiTurn() {
    clearTimer()
    const current = state.value
    const actor = current.actor
    if (paused?.value) {
      thinkingSeat.value = null
      return
    }
    if (actor === null || actor === 0) {
      thinkingSeat.value = null
      return
    }
    thinkingSeat.value = actor
    const expectedHand = current.handNo
    const expectedStreet = current.street
    const delay = 550 + Math.round(Math.random() * 650)
    timer = setTimeout(() => {
      timer = null
      if (paused?.value) return
      const snapshot = state.value
      if (
        snapshot.handNo !== expectedHand ||
        snapshot.street !== expectedStreet ||
        snapshot.actor !== actor
      ) {
        return
      }
      const profile = AI_PROFILES[actor - 1] ?? AI_PROFILES[0]!
      let action: Action
      try {
        action = chooseAction(snapshot, actor, profile)
        state.value = applyAction(snapshot, actor, action)
      } catch {
        try {
          state.value = applyAction(snapshot, actor, fallbackAction(snapshot, actor))
        } catch (error) {
          message.value = error instanceof Error ? error.message : 'AI 无法行动。'
        }
      }
      thinkingSeat.value = null
      syncMessage()
    }, delay)
  }

  // Watch the whole state: the same seat can be first to act on the next street,
  // in which case watching only `actor` would never schedule its turn.
  watch(state, () => {
    syncMessage()
    scheduleAiTurn()
  })

  watch(
    () => paused?.value,
    (isPaused) => {
      if (isPaused) {
        clearTimer()
        thinkingSeat.value = null
        message.value = '牌局已暂停。'
        detail.value = '关闭玩法说明后继续。'
      } else {
        syncMessage()
        scheduleAiTurn()
      }
    },
  )

  onUnmounted(clearTimer)

  return {
    state,
    balance,
    message,
    detail,
    thinkingSeat,
    hero,
    legal,
    isHeroTurn,
    inHand,
    handComplete,
    canStart,
    needsRebuy,
    pot,
    sidePots,
    handNo,
    streetLabel,
    heroNet,
    winnerIds,
    startNext,
    act,
    rebuy,
  }
}
