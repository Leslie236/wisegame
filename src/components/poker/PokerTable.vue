<script setup lang="ts">
import { computed } from 'vue'

import PokerCard from '@/components/poker/PokerCard.vue'
import PokerSeat from '@/components/poker/PokerSeat.vue'
import type { Card } from '@/game/cards'
import { buildPots } from '@/game/poker/pot'
import type { TableState } from '@/game/poker/types'

const props = defineProps<{
  state: TableState
  thinkingSeat: number | null
}>()

const STREET_LABELS: Record<string, string> = {
  idle: '等待开局',
  preflop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
  complete: '结算',
}

const pot = computed(() => props.state.seats.reduce((sum, seat) => sum + seat.totalBet, 0))
const pots = computed(() => buildPots(props.state.seats))
const revealed = computed(() => props.state.result?.revealed ?? false)
const winnerIds = computed(
  () => new Set(props.state.result?.pots.flatMap((potResult) => potResult.winners) ?? []),
)
const bestCardsBySeat = computed(() => {
  const map = new Map<number, Card[]>()
  const result = props.state.result
  if (!result) return map
  for (const potResult of result.pots) {
    for (const seatId of potResult.winners) {
      const cards = result.hands[seatId]?.cards
      if (cards) map.set(seatId, cards)
    }
  }
  return map
})
const boardBestKeys = computed(
  () => new Set([...bestCardsBySeat.value.values()].flat().map((card) => card.rank + card.suit)),
)
const boardUsedKeys = computed(() => {
  const hands = Object.values(props.state.result?.hands ?? {})
  return new Set(hands.flatMap((hand) => hand.cards).map((card) => card.rank + card.suit))
})
const streetLabel = computed(() => STREET_LABELS[props.state.street] ?? '牌桌')

function handLabel(seatId: number): string | undefined {
  return props.state.result?.hands[seatId]?.label
}

function bestCardsForSeat(seatId: number) {
  return bestCardsBySeat.value.get(seatId)
}

function isBoardBest(card: { rank: string; suit: string }): boolean {
  return boardBestKeys.value.has(card.rank + card.suit)
}

function isBoardUsed(card: { rank: string; suit: string }): boolean {
  return boardUsedKeys.value.has(card.rank + card.suit)
}

const seatSlots = computed(() => [
  { seat: props.state.seats[0]!, slot: 'hero' },
  { seat: props.state.seats[1]!, slot: 'left' },
  { seat: props.state.seats[2]!, slot: 'top' },
  { seat: props.state.seats[3]!, slot: 'right' },
])
</script>

<template>
  <section class="poker-table" aria-label="德州扑克牌桌">
    <div
      v-for="entry in seatSlots"
      :key="entry.seat.id"
      class="poker-table__seat"
      :class="`poker-table__seat--${entry.slot}`"
    >
      <PokerSeat
        :seat="entry.seat"
        :active="state.actor === entry.seat.id"
        :dealer="state.button === entry.seat.id"
        :small-blind="state.smallBlindSeat === entry.seat.id"
        :big-blind="state.bigBlindSeat === entry.seat.id"
        :thinking="thinkingSeat === entry.seat.id"
        :revealed="revealed"
        :hand-label="handLabel(entry.seat.id)"
        :winner="winnerIds.has(entry.seat.id)"
        :best-cards="bestCardsForSeat(entry.seat.id)"
      />
    </div>

    <div class="poker-board">
      <div class="poker-board__pot" aria-live="polite">
        底池 <strong>{{ pot.toLocaleString() }}</strong>
      </div>
      <div class="poker-board__cards">
        <PokerCard
          v-for="(card, index) in state.board"
          :key="`card-${index}`"
          :card="card"
          :highlight="isBoardBest(card)"
          :dim="revealed && !isBoardUsed(card)"
        />
        <PokerCard v-for="index in 5 - state.board.length" :key="`slot-${index}`" empty />
      </div>
      <div class="poker-board__meta">
        <span>{{ streetLabel }}</span>
        <span
          v-if="pots.length > 1 && state.seats.some((seat) => seat.status === 'all-in')"
          class="poker-board__pots"
        >
          {{
            pots
              .map(
                (item, index) => `${index === 0 ? '主池' : '边池'} ${item.amount.toLocaleString()}`,
              )
              .join(' · ')
          }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.poker-table {
  position: relative;
  min-height: 520px;
  padding: 16px 20px;
  border-radius: 46% / 40%;
  background: radial-gradient(ellipse at 50% 46%, var(--felt), var(--felt-deep));
  box-shadow:
    inset 0 0 0 7px #ffffff04,
    0 12px 28px #00000012;
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(260px, 1.7fr) minmax(110px, 1fr);
  grid-template-rows: 1fr 1fr 1fr;
  grid-template-areas:
    '. top .'
    'left board right'
    '. hero .';
  align-items: center;
  justify-items: center;
  gap: 6px;
  overflow: hidden;
}
.poker-table::before {
  content: '';
  position: absolute;
  inset: 46px 30px;
  border: 1px solid color-mix(in srgb, var(--table-muted) 24%, transparent);
  border-radius: 47% 47% 40% 40% / 30% 30% 24% 24%;
  pointer-events: none;
}
.poker-table__seat {
  position: relative;
  z-index: 1;
}
.poker-table__seat--top {
  grid-area: top;
  align-self: start;
}
.poker-table__seat--left {
  grid-area: left;
  justify-self: start;
}
.poker-table__seat--right {
  grid-area: right;
  justify-self: end;
}
.poker-table__seat--hero {
  grid-area: hero;
  align-self: end;
}
.poker-board {
  grid-area: board;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.poker-board__pot {
  padding: 4px 14px;
  border: 1px solid #ffffff1c;
  border-radius: 20px;
  background: #00000020;
  color: var(--table-muted);
  font-size: 9px;
  letter-spacing: 1.5px;
}
.poker-board__pot strong {
  color: var(--table-text);
  font-size: 14px;
  letter-spacing: 0;
  margin-left: 3px;
}
.poker-board__cards {
  display: flex;
  gap: 6px;
}
.poker-board__meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: var(--table-muted);
  font-size: 9px;
  letter-spacing: 1.5px;
}
.poker-board__pots {
  letter-spacing: 0.5px;
  opacity: 0.8;
}
@media (max-width: 1000px) {
  .poker-table {
    grid-template-columns: minmax(90px, 1fr) minmax(220px, 1.6fr) minmax(90px, 1fr);
    min-height: 480px;
  }
}
@media (max-width: 720px) {
  .poker-table {
    min-height: 430px;
    padding: 12px 10px 18px;
    border-radius: 32px;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto auto auto;
    grid-template-areas:
      '. top .'
      'board board board'
      'left . right'
      'hero hero hero';
    gap: 4px;
    align-items: center;
  }
  .poker-table__seat--top {
    align-self: center;
  }
  .poker-table__seat--left {
    justify-self: start;
  }
  .poker-table__seat--right {
    justify-self: end;
  }
  .poker-table__seat--hero {
    justify-self: center;
  }
  .poker-table::before {
    inset: 26px 12px;
  }
  .poker-board {
    padding: 4px 0;
  }
  .poker-board {
    gap: 6px;
  }
  .poker-board__cards {
    gap: 3px;
  }
  .poker-board__pot {
    font-size: 8px;
    padding: 3px 9px;
  }
  .poker-board__pot strong {
    font-size: 12px;
  }
  .poker-board__meta {
    font-size: 8px;
  }
}
</style>
