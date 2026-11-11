<script setup lang="ts">
import { computed } from 'vue'

import type { Card } from '@/game/blackjack'

const props = withDefaults(
  defineProps<{
    card?: Card
    /** Renders the patterned back of a real, hidden card. */
    faceDown?: boolean
    /** Renders a dashed placeholder slot. */
    empty?: boolean
    /** Hides decorative placeholders from assistive technology. */
    decorative?: boolean
  }>(),
  { faceDown: false, empty: false, decorative: false },
)

const isRed = computed(() => !!props.card && (props.card.suit === '♥' || props.card.suit === '♦'))
const label = computed(() => {
  if (props.decorative || props.empty) return undefined
  if (props.faceDown) return '庄家暗牌'
  return props.card ? props.card.rank + props.card.suit : undefined
})
</script>

<template>
  <div
    class="card"
    :class="{ red: !faceDown && isRed, back: faceDown, empty }"
    :aria-label="label"
    :aria-hidden="decorative || empty ? 'true' : undefined"
  >
    <template v-if="empty">♠</template>
    <template v-else-if="faceDown || !card"><span class="back-symbol">♠</span></template>
    <template v-else
      ><span class="corner"
        >{{ card.rank }}<small>{{ card.suit }}</small></span
      ><span class="suit">{{ card.suit }}</span
      ><span class="corner bottom"
        >{{ card.rank }}<small>{{ card.suit }}</small></span
      ></template
    >
  </div>
</template>
