<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { LegalActions } from '@/game/poker/types'

const props = defineProps<{
  legal: LegalActions
  pot: number
  currentBet: number
}>()

const emit = defineEmits<{
  fold: []
  check: []
  call: []
  'all-in': []
  wager: [wager: { type: 'bet' | 'raise'; to: number }]
}>()

const wager = computed(() => props.legal.raise ?? props.legal.bet)
const isRaise = computed(() => props.legal.raise !== null)
const raiseOpen = ref(false)
const raiseTo = ref(0)

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

watch(
  () => [wager.value?.min, wager.value?.max] as const,
  () => {
    const current = wager.value
    if (!current) {
      raiseOpen.value = false
      return
    }
    raiseTo.value = clamp(raiseTo.value || current.min, current.min, current.max)
  },
  { immediate: true },
)

const callLabel = computed(() => (props.legal.call ? `跟注 ${props.legal.call.amount}` : '过牌'))

const presets = computed(() => {
  const current = wager.value
  if (!current) return []
  const base = isRaise.value ? props.currentBet : 0
  return [
    { label: '1/2 池', value: clamp(base + Math.round(props.pot * 0.5), current.min, current.max) },
    {
      label: '2/3 池',
      value: clamp(base + Math.round(props.pot * (2 / 3)), current.min, current.max),
    },
    { label: '1 池', value: clamp(base + props.pot, current.min, current.max) },
  ]
})

function openWager() {
  const current = wager.value
  if (!current) return
  raiseTo.value = current.min
  raiseOpen.value = true
}

function toggleWager() {
  if (raiseOpen.value) raiseOpen.value = false
  else openWager()
}

function closeWager() {
  raiseOpen.value = false
}

defineExpose({ openWager, toggleWager, closeWager })

function confirmWager() {
  const current = wager.value
  if (!current) return
  emit('wager', {
    type: isRaise.value ? 'raise' : 'bet',
    to: clamp(
      Number.isFinite(raiseTo.value) ? raiseTo.value : current.min,
      current.min,
      current.max,
    ),
  })
  raiseOpen.value = false
}
</script>

<template>
  <div class="poker-actionbar panel">
    <div v-if="raiseOpen && wager" class="poker-raise">
      <div class="poker-raise__head">
        <span
          >{{ isRaise ? '加注到' : '下注' }} <strong>{{ raiseTo }}</strong></span
        >
        <small>范围 {{ wager.min }} – {{ wager.max }}</small>
      </div>
      <input
        v-model.number="raiseTo"
        class="poker-raise__slider"
        type="range"
        :min="wager.min"
        :max="wager.max"
        step="1"
        aria-label="下注额"
      />
      <div class="poker-raise__presets">
        <button v-for="preset in presets" :key="preset.label" @click="raiseTo = preset.value">
          {{ preset.label }}
        </button>
      </div>
      <div class="poker-raise__confirm">
        <button class="poker-btn" @click="raiseOpen = false">取消</button>
        <button class="poker-btn primary" @click="confirmWager">
          确认{{ isRaise ? '加注' : '下注' }}
        </button>
      </div>
    </div>

    <div class="poker-actions">
      <button class="poker-btn fold" @click="emit('fold')">弃牌</button>
      <button class="poker-btn primary" @click="legal.check ? emit('check') : emit('call')">
        {{ callLabel }}
      </button>
      <button class="poker-btn" :disabled="!wager" @click="openWager">
        {{ isRaise ? '加注' : '下注' }}
      </button>
      <button class="poker-btn all-in" :disabled="!legal.allIn" @click="emit('all-in')">
        {{ legal.allIn ? `全下 ${legal.allIn.amount}` : '全下' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.poker-actionbar {
  position: relative;
  padding: 12px;
}
.poker-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.poker-btn {
  min-height: 44px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--chip);
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  padding: 8px 10px;
}
.poker-btn.primary {
  background: var(--primary);
  border-color: transparent;
  color: var(--primary-text);
}
.poker-btn.fold {
  color: var(--red);
}
.poker-btn.all-in {
  border-color: color-mix(in srgb, var(--red) 40%, var(--border));
}
.poker-btn:disabled {
  opacity: 0.35;
}
.poker-raise {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: calc(100% + 8px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  box-shadow: 0 16px 48px #00000044;
}
.poker-raise__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 11px;
  color: var(--muted);
}
.poker-raise__head strong {
  color: var(--text);
  font-size: 18px;
  margin-left: 5px;
}
.poker-raise__head small {
  font-size: 9px;
}
.poker-raise__slider {
  width: 100%;
  accent-color: var(--accent);
}
.poker-raise__presets {
  display: flex;
  gap: 6px;
}
.poker-raise__presets button {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: transparent;
  color: var(--muted);
  font-size: 10px;
  padding: 5px 8px;
}
.poker-raise__presets button:hover {
  color: var(--text);
  border-color: var(--muted);
}
.poker-raise__confirm {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
}
@media (max-width: 720px) {
  .poker-raise {
    left: 4px;
    right: 4px;
  }
  .poker-actions {
    grid-template-columns: 1fr 1fr;
  }
  .poker-btn {
    min-height: 42px;
  }
}
</style>
