<script setup lang="ts">
import type { Phase } from '@/composables/useBlackjack'

defineProps<{
  phase: Phase
  balance: number
  bet: number
  activeBet: number
  message: string
  detail: string
  canDouble: boolean
  canSplit: boolean
  canSurrender: boolean
}>()

const emit = defineEmits<{
  'update:bet': [amount: number]
  start: []
  hit: []
  stand: []
  double: []
  split: []
  surrender: []
}>()

const chipOptions = [10, 50, 100, 200]
</script>

<template>
  <section class="controls panel">
    <div class="section-label">
      {{ phase === 'playing' ? '本局下注' : '选择下注'
      }}<span>{{ phase === 'playing' ? activeBet : bet }} <small>筹码</small></span>
    </div>
    <div class="chips">
      <button
        v-for="amount in chipOptions"
        :key="amount"
        :class="{ chosen: bet === amount }"
        :disabled="phase === 'playing' || balance < amount"
        :aria-pressed="bet === amount"
        @click="emit('update:bet', amount)"
      >
        <span>{{ amount }}</span>
      </button>
    </div>
    <div class="status" aria-live="polite">
      <span class="status-star">✦</span>
      <h2>{{ message }}</h2>
      <p>{{ detail }}</p>
    </div>
    <button
      v-if="phase !== 'playing'"
      class="primary"
      :disabled="balance < bet"
      @click="emit('start')"
    >
      {{ phase === 'ready' ? '发牌，开始游戏' : '再来一局' }}<span>↗</span>
    </button>
    <template v-else
      ><div class="action-row">
        <button class="primary" @click="emit('hit')">＋ 要牌</button
        ><button class="secondary" @click="emit('stand')">停牌 <span>↗</span></button>
      </div>
      <button class="double-button" :disabled="!canDouble" @click="emit('double')">
        加倍下注 <span>仅再拿一张牌</span>
      </button></template
    >
    <div class="extra-actions">
      <button
        class="double-button split-button"
        :disabled="!canSplit"
        title="起手两张同点数牌且筹码足够时可分牌，每局限分一次"
        @click="emit('split')"
      >
        分牌 <span>追加等额下注</span>
      </button>
      <button
        class="double-button surrender-button"
        :disabled="!canSurrender"
        title="未分牌且起手尚未要牌或加倍时可投降"
        @click="emit('surrender')"
      >
        投降 <span>退回一半下注</span>
      </button>
    </div>
    <p v-if="balance < bet && phase !== 'playing'" class="low-balance">
      筹码不足，请降低下注或重置筹码。
    </p>
    <p class="control-note">
      {{
        phase === 'playing' ? '目标：尽量接近 21 点，但不要超过。' : '准备好了就发牌，祝你好运。'
      }}
    </p>
  </section>
</template>
