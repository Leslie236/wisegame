<script setup lang="ts">
import PokerCard from './PokerCard.vue'
import type { Seat } from '@/game/poker/types'
import { CHEATS } from '@/game/poker/cheats'

defineProps<{
  seat: Seat
  availability: { cost: number; allowed: boolean; reason: string }
}>()
const emit = defineEmits<{ swap: [cardIndex: number] }>()
</script>

<template>
  <section class="poker-cheats panel" aria-label="作弊功能">
    <div>
      <strong>作弊 · {{ CHEATS['swap-card'].label }}</strong>
      <p>每局一次 · 花费剩余筹码的 10%（向上取整） · 不足 100 不可用</p>
      <p aria-live="polite">
        {{
          availability.allowed
            ? `花费 ${availability.cost} 筹码，选择要换掉的底牌`
            : availability.reason
        }}
      </p>
    </div>
    <div class="poker-cheats__cards">
      <button
        v-for="(card, index) in seat.hole"
        :key="index"
        :disabled="!availability.allowed"
        :aria-label="`换掉${card.rank}${card.suit}，花费 ${availability.cost} 筹码`"
        @click="emit('swap', index)"
      >
        <PokerCard :card="card" size="sm" />
        <span>换这张</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.poker-cheats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}
.poker-cheats strong {
  font-size: 13px;
  color: var(--text);
}
.poker-cheats p {
  font-size: 11px;
  color: var(--muted);
  margin: 8px 0 0;
}
.poker-cheats__cards {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.poker-cheats button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--chip);
  color: var(--text);
  font-size: 10px;
}
.poker-cheats button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.poker-cheats button:enabled:hover {
  border-color: var(--accent);
}
@media (max-width: 480px) {
  .poker-cheats {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
