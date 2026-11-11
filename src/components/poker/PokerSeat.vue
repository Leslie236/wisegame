<script setup lang="ts">
import { computed } from 'vue'

import PokerCard from '@/components/poker/PokerCard.vue'
import type { Card } from '@/game/cards'
import type { Seat } from '@/game/poker/types'

const props = defineProps<{
  seat: Seat
  active: boolean
  dealer: boolean
  smallBlind: boolean
  bigBlind: boolean
  thinking: boolean
  revealed: boolean
  handLabel?: string
  winner: boolean
  bestCards?: Card[]
}>()

const ACTION_LABELS: Record<string, string> = {
  fold: '弃牌',
  check: '过牌',
  call: '跟注',
  bet: '下注',
  raise: '加注',
  'all-in': '全下',
}

const showCards = computed(
  () => props.seat.isHero || (props.revealed && props.seat.status !== 'folded'),
)
const actionLabel = computed(() =>
  props.seat.lastAction ? ACTION_LABELS[props.seat.lastAction] : '',
)
const bestKeys = computed(
  () => new Set((props.bestCards ?? []).map((card) => card.rank + card.suit)),
)
const hasBest = computed(() => bestKeys.value.size > 0)

function cardInBest(card: Card): boolean {
  return bestKeys.value.has(card.rank + card.suit)
}
</script>

<template>
  <div
    class="poker-seat"
    :class="{
      'poker-seat--active': active,
      'poker-seat--folded': seat.status === 'folded',
      'poker-seat--winner': winner,
      'poker-seat--hero': seat.isHero,
    }"
  >
    <div class="poker-seat__badges">
      <span v-if="dealer" class="poker-seat__badge poker-seat__badge--dealer">D</span>
      <span v-if="smallBlind" class="poker-seat__badge">SB</span>
      <span v-if="bigBlind" class="poker-seat__badge">BB</span>
      <span v-if="seat.status === 'all-in'" class="poker-seat__badge all-in">ALL-IN</span>
      <span v-else-if="seat.status === 'folded'" class="poker-seat__badge">弃牌</span>
    </div>

    <div class="poker-seat__cards">
      <PokerCard
        v-for="(card, index) in seat.hole"
        :key="index"
        :card="card"
        :face-down="!showCards"
        :size="seat.isHero ? 'lg' : 'sm'"
        :dim="hasBest && !cardInBest(card)"
        :highlight="hasBest && cardInBest(card)"
      />
      <template v-if="!seat.hole.length">
        <PokerCard empty :size="seat.isHero ? 'lg' : 'sm'" />
        <PokerCard empty :size="seat.isHero ? 'lg' : 'sm'" />
      </template>
    </div>

    <div class="poker-seat__meta">
      <span class="poker-seat__name"
        >{{ seat.name }}<span v-if="thinking" class="poker-seat__dots">…</span></span
      >
      <span class="poker-seat__stack">{{ seat.stack.toLocaleString() }}</span>
    </div>

    <div v-if="handLabel" class="poker-seat__hand">{{ handLabel }}</div>
    <div v-if="seat.streetBet > 0" class="poker-seat__bet">{{ seat.streetBet }}</div>
    <div v-if="actionLabel && !handLabel" class="poker-seat__action">{{ actionLabel }}</div>
  </div>
</template>

<style scoped>
.poker-seat {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #00000022;
  transition:
    border-color 0.18s,
    box-shadow 0.18s,
    opacity 0.18s;
}
.poker-seat--hero {
  background: #00000030;
}
.poker-seat--active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px #c4db8122;
}
.poker-seat--folded {
  opacity: 0.42;
}
.poker-seat--winner {
  border-color: #e7c96a;
  box-shadow: 0 0 22px #e7c96a44;
  animation: winner-glow 1.1s ease-in-out 2;
}
@keyframes winner-glow {
  0%,
  100% {
    box-shadow: 0 0 22px #e7c96a44;
  }
  50% {
    box-shadow: 0 0 34px #e7c96a88;
  }
}
.poker-seat__badges {
  position: absolute;
  top: -8px;
  left: -6px;
  display: flex;
  gap: 3px;
}
.poker-seat__badge {
  background: var(--chip);
  color: var(--table-text);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 8px;
  letter-spacing: 0.5px;
  padding: 1px 5px;
  line-height: 1.4;
}
.poker-seat__badge--dealer {
  background: #f2f3eb;
  color: #1f2b24;
  font-weight: 700;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  padding: 0;
}
.poker-seat__badge.all-in {
  background: #a8503f;
  color: #fff6ec;
  border-color: #a8503f;
}
.poker-seat__cards {
  display: flex;
  gap: 4px;
  min-height: 64px;
  align-items: center;
}
.poker-seat__meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 10px;
  color: var(--table-text);
  white-space: nowrap;
}
.poker-seat__name {
  font-weight: 600;
  letter-spacing: 1px;
}
.poker-seat__stack {
  color: var(--table-muted);
  font-size: 10px;
}
.poker-seat__dots {
  animation: seat-dots 1.2s ease-in-out infinite;
}
.poker-seat__hand {
  font-size: 9px;
  letter-spacing: 1px;
  color: #e7c96a;
}
.poker-seat__bet {
  position: absolute;
  right: -8px;
  bottom: 10px;
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--accent);
  color: var(--primary-text);
  font-size: 9px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 2px 6px #00000033;
}
.poker-seat__action {
  position: absolute;
  top: 4px;
  right: -4px;
  font-size: 8px;
  color: var(--table-muted);
}
@keyframes seat-dots {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
@media (max-width: 720px) {
  .poker-seat {
    padding: 6px 7px;
    gap: 3px;
  }
  .poker-seat__cards {
    min-height: 48px;
    gap: 3px;
  }
  .poker-seat__meta {
    font-size: 9px;
    flex-direction: column;
    align-items: center;
    gap: 0;
    line-height: 1.35;
  }
  .poker-seat__stack {
    font-size: 9px;
  }
  .poker-seat__badge {
    font-size: 7px;
    padding: 0 4px;
  }
  .poker-seat__badge--dealer {
    width: 16px;
    height: 16px;
  }
  .poker-seat__hand {
    font-size: 8px;
  }
  .poker-seat__bet {
    right: -4px;
    bottom: 2px;
    font-size: 8px;
    padding: 1px 5px;
  }
  .poker-seat__action {
    display: none;
  }
}
</style>
