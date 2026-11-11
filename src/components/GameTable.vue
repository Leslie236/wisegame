<script setup lang="ts">
import { computed } from 'vue'

import PlayingCard from '@/components/PlayingCard.vue'
import type { PlayerHand, Phase } from '@/composables/useBlackjack'
import { score, type Card } from '@/game/blackjack'

const props = defineProps<{
  hands: PlayerHand[]
  dealer: Card[]
  phase: Phase
  activeIndex: number
}>()

const displayedHands = computed<PlayerHand[]>(() =>
  props.hands.length
    ? props.hands
    : [{ cards: [], bet: 0, done: false, surrendered: false, split: false, returned: 0 }],
)

const dealerScore = computed(() =>
  score(props.phase === 'playing' ? props.dealer.slice(0, 1) : props.dealer),
)

function handStatus(hand: PlayerHand) {
  if (props.phase === 'done') {
    const profit = hand.returned - hand.bet
    return hand.surrendered ? '投降 · 退回一半' : `${profit > 0 ? '+' : ''}${profit} 筹码`
  }
  return score(hand.cards) > 21 ? '爆牌' : hand.done ? '已停牌' : '等待操作'
}
</script>

<template>
  <section class="table" aria-label="21 点牌桌">
    <div class="table-topline"><span>WISE 21 · TABLE 01</span><span>♠ ♥ ♣ ♦</span></div>
    <div class="hand-area dealer-area">
      <div class="hand-label">
        庄家
        <span class="score"
          >{{ dealer.length ? dealerScore : '—' }}{{ phase === 'playing' ? ' + ?' : '' }}</span
        >
      </div>
      <div class="cards">
        <template v-if="dealer.length"
          ><PlayingCard
            v-for="(card, index) in dealer"
            :key="index"
            :card="card"
            :face-down="phase === 'playing' && index === 1"
        /></template>
        <template v-else>
          <PlayingCard face-down decorative />
          <PlayingCard face-down decorative />
        </template>
      </div>
    </div>
    <div class="table-center">
      <span class="line"></span>
      <div>
        <p>BLACKJACK PAYS 3 TO 2</p>
        <span>庄家 17 点停牌 · 每局一副新牌</span>
      </div>
      <span class="line"></span>
    </div>
    <div class="player-hands" :class="{ 'is-split': hands.length > 1 }">
      <div
        v-for="(hand, handIndex) in displayedHands"
        :key="handIndex"
        class="hand-area player-area"
        :class="{ 'active-hand': phase === 'playing' && activeIndex === handIndex }"
      >
        <div class="hand-label">
          {{ hands.length > 1 ? `第 ${handIndex + 1} 手` : '你的手牌' }}
          <span class="score" :class="{ bust: score(hand.cards) > 21 }">{{
            hand.cards.length ? score(hand.cards) : '—'
          }}</span>
        </div>
        <div class="cards">
          <template v-if="hand.cards.length"
            ><PlayingCard v-for="(card, index) in hand.cards" :key="index" :card="card"
          /></template>
          <template v-else>
            <PlayingCard empty />
            <PlayingCard empty />
          </template>
        </div>
        <div v-if="hand.cards.length" class="hand-summary">
          下注 {{ hand.bet }} ·
          {{
            phase === 'playing' && activeIndex === handIndex && !hand.done
              ? '正在操作'
              : handStatus(hand)
          }}
        </div>
      </div>
    </div>
    <div class="table-bottom"><span>放轻松，好好玩。</span><span>仅限虚拟筹码</span></div>
  </section>
</template>
