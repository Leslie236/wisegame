import { computed, ref } from 'vue'

import { useWallet, STARTING_BALANCE } from '@/composables/useWallet'
import { payout, score, type Card } from '@/game/blackjack'
import { createDeck } from '@/game/cards'

export type Phase = 'ready' | 'playing' | 'done'

export interface PlayerHand {
  cards: Card[]
  bet: number
  done: boolean
  surrendered: boolean
  split: boolean
  returned: number
}

export const DEFAULT_BET = 50

/** Owns every rule and state transition of a single twenty-one round. */
export function useBlackjack() {
  const { balance } = useWallet()

  const bet = ref(DEFAULT_BET)
  const hands = ref<PlayerHand[]>([])
  const activeIndex = ref(0)
  const dealer = ref<Card[]>([])
  const phase = ref<Phase>('ready')
  const message = ref('好牌，从这一手开始。')
  const detail = ref('选择筹码，开启你的第一局。')
  const rounds = ref(0)
  const wins = ref(0)

  let deck: Card[] = []

  const currentHand = computed(() => hands.value[activeIndex.value])
  const player = computed(() => currentHand.value?.cards ?? [])
  const activeBet = computed(() => hands.value.reduce((sum, hand) => sum + hand.bet, 0))
  const playerScore = computed(() => score(player.value))
  const canDouble = computed(
    () =>
      phase.value === 'playing' &&
      player.value.length === 2 &&
      !!currentHand.value &&
      balance.value >= currentHand.value.bet,
  )
  const canSplit = computed(
    () =>
      phase.value === 'playing' &&
      hands.value.length === 1 &&
      player.value.length === 2 &&
      score([player.value[0]!]) === score([player.value[1]!]) &&
      balance.value >= currentHand.value!.bet,
  )
  const canSurrender = computed(
    () => phase.value === 'playing' && hands.value.length === 1 && player.value.length === 2,
  )

  function draw() {
    return deck.pop()!
  }

  function finish() {
    let returned = 0
    for (const hand of hands.value) {
      hand.done = true
      hand.returned = hand.surrendered
        ? hand.bet / 2
        : payout(hand.cards, dealer.value, hand.bet, !hand.split)
      returned += hand.returned
    }
    const profit = returned - activeBet.value
    balance.value += returned
    phase.value = 'done'
    rounds.value++
    if (profit > 0) wins.value++
    message.value = hands.value[0]?.surrendered
      ? '已投降，退回一半下注。'
      : hands.value.length > 1
        ? '两手牌均已结算。'
        : playerScore.value > 21
          ? '爆牌了，下手再来。'
          : profit > 0
            ? player.value.length === 2 && playerScore.value === 21
              ? 'BLACKJACK！漂亮的一手。'
              : '这一手，你赢了。'
            : profit === 0
              ? '势均力敌，平局。'
              : '庄家赢了，机会还在。'
    detail.value = `${profit > 0 ? '+' : ''}${profit} 筹码 · ${profit === 0 ? '下注已退回' : '本局已结算'}`
  }

  function start() {
    if (phase.value === 'playing' || balance.value < bet.value) return
    deck = createDeck()
    balance.value -= bet.value
    hands.value = [
      {
        cards: [draw(), draw()],
        bet: bet.value,
        done: false,
        surrendered: false,
        split: false,
        returned: 0,
      },
    ]
    activeIndex.value = 0
    dealer.value = [draw(), draw()]
    phase.value = 'playing'
    message.value = '轮到你了。'
    detail.value = '再来一张，还是见好就收？'
    if (score(player.value) === 21 || score(dealer.value) === 21) finish()
  }

  function advance() {
    const next = hands.value.findIndex((hand) => !hand.done)
    if (next >= 0) {
      activeIndex.value = next
      message.value = `轮到第 ${next + 1} 手。`
      detail.value = `本手下注 ${currentHand.value!.bet} 筹码 · 每手独立结算`
      return
    }
    if (hands.value.some((hand) => !hand.surrendered && score(hand.cards) <= 21)) {
      while (score(dealer.value) < 17) dealer.value.push(draw())
    }
    finish()
  }

  function hit() {
    if (phase.value !== 'playing') return
    player.value.push(draw())
    if (playerScore.value >= 21) {
      currentHand.value!.done = true
      advance()
    }
  }

  function stand() {
    if (phase.value !== 'playing') return
    currentHand.value!.done = true
    advance()
  }

  function double() {
    if (!canDouble.value) return
    const hand = currentHand.value!
    balance.value -= hand.bet
    hand.bet *= 2
    hand.cards.push(draw())
    hand.done = true
    advance()
  }

  function split() {
    if (!canSplit.value) return
    const original = currentHand.value!
    balance.value -= original.bet
    const aces = original.cards[0]!.rank === 'A'
    hands.value = original.cards.map((card) => {
      const cards = [card, draw()]
      return {
        cards,
        bet: original.bet,
        done: aces || score(cards) === 21,
        surrendered: false,
        split: true,
        returned: 0,
      }
    })
    advance()
  }

  function surrender() {
    if (!canSurrender.value) return
    currentHand.value!.surrendered = true
    finish()
  }

  function refill() {
    if (phase.value === 'playing') return
    balance.value = STARTING_BALANCE
    bet.value = DEFAULT_BET
    message.value = '筹码就位，重新出发。'
    detail.value = '选择下注，开始新的一局。'
  }

  return {
    balance,
    bet,
    hands,
    activeIndex,
    activeBet,
    phase,
    dealer,
    message,
    detail,
    rounds,
    wins,
    playerScore,
    canDouble,
    canSplit,
    canSurrender,
    start,
    hit,
    stand,
    double,
    split,
    surrender,
    refill,
  }
}
