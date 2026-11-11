<script setup lang="ts">
import { computed } from 'vue'

import type { Card } from '@/game/cards'

const props = withDefaults(
  defineProps<{
    card?: Card
    faceDown?: boolean
    empty?: boolean
    dim?: boolean
    highlight?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  { faceDown: false, empty: false, dim: false, highlight: false, size: 'md' },
)

const isRed = computed(() => !!props.card && (props.card.suit === '♥' || props.card.suit === '♦'))
const label = computed(() => {
  if (props.empty) return undefined
  if (props.faceDown) return '暗牌'
  return props.card ? props.card.rank + props.card.suit : undefined
})
</script>

<template>
  <div
    class="poker-card"
    :class="[
      `poker-card--${size}`,
      {
        'poker-card--red': isRed,
        'poker-card--back': faceDown,
        'poker-card--empty': empty,
        'poker-card--dim': dim,
        'poker-card--highlight': highlight,
      },
    ]"
    :aria-label="label"
    :aria-hidden="empty ? 'true' : undefined"
  >
    <template v-if="empty">♠</template>
    <template v-else-if="faceDown"><span class="poker-card__back-mark">♠</span></template>
    <template v-else-if="card">
      <span class="poker-card__rank">{{ card.rank }}</span>
      <span class="poker-card__suit">{{ card.suit }}</span>
      <span class="poker-card__rank poker-card__rank--bottom">{{ card.rank }}</span>
    </template>
  </div>
</template>

<style scoped>
.poker-card {
  position: relative;
  flex-shrink: 0;
  border-radius: 6px;
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 4px 10px #00000024;
  display: grid;
  place-items: center;
  font-weight: 700;
  user-select: none;
  animation: poker-card-in 0.22s ease-out;
}
@keyframes poker-card-in {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.poker-card--sm {
  width: 46px;
  height: 64px;
}
.poker-card--md {
  width: 52px;
  height: 73px;
}
.poker-card--lg {
  width: 58px;
  height: 82px;
}
.poker-card--red {
  color: var(--red);
}
.poker-card--dim {
  opacity: 0.32;
  filter: saturate(0.6);
}
.poker-card--highlight {
  box-shadow:
    0 0 0 2px #e7c96a,
    0 6px 18px #e7c96a44;
}
.poker-card--back {
  border: 4px solid var(--card);
  background:
    repeating-linear-gradient(45deg, transparent, transparent 5px, #ffffff10 5px, #ffffff10 6px),
    var(--felt-deep);
  color: var(--table-muted);
}
.poker-card--empty {
  border: 1px dashed var(--table-muted);
  background: transparent;
  box-shadow: none;
  color: var(--table-muted);
  opacity: 0.35;
  font-size: 22px;
}
.poker-card__back-mark {
  border: 1px solid var(--table-muted);
  border-radius: 50%;
  width: 58%;
  height: 62%;
  display: grid;
  place-items: center;
  font-size: 17px;
}
.poker-card__rank {
  position: absolute;
  top: 3px;
  left: 5px;
  font-size: 12px;
  line-height: 1;
}
.poker-card__rank--bottom {
  top: auto;
  left: auto;
  right: 5px;
  bottom: 3px;
  transform: rotate(180deg);
}
.poker-card__suit {
  font-size: 23px;
  line-height: 1;
}
.poker-card--sm .poker-card__suit {
  font-size: 20px;
}
.poker-card--sm .poker-card__rank {
  font-size: 10px;
}
.poker-card--lg .poker-card__suit {
  font-size: 27px;
}
@media (max-width: 720px) {
  .poker-card--sm {
    width: 34px;
    height: 48px;
  }
  .poker-card--md {
    width: 36px;
    height: 51px;
  }
  .poker-card--lg {
    width: 46px;
    height: 64px;
  }
  .poker-card__suit {
    font-size: 17px;
  }
  .poker-card--sm .poker-card__suit {
    font-size: 14px;
  }
  .poker-card--lg .poker-card__suit {
    font-size: 20px;
  }
  .poker-card__rank {
    font-size: 9px;
    top: 2px;
    left: 3px;
  }
  .poker-card__rank--bottom {
    left: auto;
    right: 3px;
  }
}
</style>
