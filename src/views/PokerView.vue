<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import PokerActionBar from '@/components/poker/PokerActionBar.vue'
import PokerCheats from '@/components/poker/PokerCheats.vue'
import PokerRulesModal from '@/components/poker/PokerRulesModal.vue'
import PokerTable from '@/components/poker/PokerTable.vue'
import WalletPanel from '@/components/WalletPanel.vue'
import { useHoldem } from '@/composables/useHoldem'

const rulesOpen = ref(false)
const actionBar = ref<InstanceType<typeof PokerActionBar> | null>(null)

const {
  state,
  balance,
  message,
  detail,
  thinkingSeat,
  legal,
  hero,
  swap,
  swapCard,
  isHeroTurn,
  inHand,
  handComplete,
  canStart,
  needsRebuy,
  pot,
  handNo,
  streetLabel,
  heroNet,
  startNext,
  act,
  rebuy,
} = useHoldem({ paused: rulesOpen })
const sessionLabel = computed(() =>
  handNo.value ? `第 ${handNo.value} 手 · ${streetLabel.value}` : '等待开局',
)
const netLabel = computed(() =>
  handComplete.value ? `${heroNet.value > 0 ? '+' : ''}${heroNet.value}` : '—',
)

function onFold() {
  act({ type: 'fold' })
}
function onCheck() {
  act({ type: 'check' })
}
function onCall() {
  act({ type: 'call' })
}
function onAllIn() {
  act({ type: 'all-in' })
}
function onWager(wager: { type: 'bet' | 'raise'; to: number }) {
  act(wager.type === 'raise' ? { type: 'raise', to: wager.to } : { type: 'bet', to: wager.to })
}

function handleKeydown(event: KeyboardEvent) {
  if (rulesOpen.value) return
  if (event.key === 'Escape') {
    actionBar.value?.closeWager()
    return
  }
  if (!isHeroTurn.value) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  switch (event.key.toLowerCase()) {
    case 'f':
      event.preventDefault()
      onFold()
      break
    case 'c':
      event.preventDefault()
      if (legal.value.check) onCheck()
      else onCall()
      break
    case 'r':
      event.preventDefault()
      actionBar.value?.toggleWager()
      break
    case 'a':
      event.preventDefault()
      if (legal.value.allIn) onAllIn()
      break
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <main :inert="rulesOpen">
    <section class="intro">
      <div>
        <p class="eyebrow">NO-LIMIT HOLD'EM · TABLE 01</p>
        <h1>德州扑克，<em>入座。</em></h1>
        <p class="intro-copy">4 人桌 · 盲注 10 / 20 · 与二十一点共享筹码</p>
      </div>
      <div class="intro-side">
        <div class="session"><span class="live-dot"></span> {{ sessionLabel }}</div>
        <button class="rules-link" @click="rulesOpen = true"><span>ⓘ</span> 玩法说明</button>
      </div>
    </section>

    <div class="poker-layout">
      <div class="poker-main">
        <PokerTable :state="state" :thinking-seat="thinkingSeat" />
        <PokerActionBar
          v-if="isHeroTurn"
          ref="actionBar"
          :legal="legal"
          :pot="pot"
          :current-bet="state.currentBet"
          @fold="onFold"
          @check="onCheck"
          @call="onCall"
          @all-in="onAllIn"
          @wager="onWager"
        />
        <div v-else class="poker-hint panel">
          <span class="poker-hint__dot" :class="{ live: inHand }"></span>
          <p>{{ message }}</p>
          <small>{{ detail }}</small>
        </div>
        <p class="poker-shortcuts">F 弃牌 · C 过牌/跟注 · R 加注 · A 全下</p>
        <PokerCheats v-if="inHand" :seat="hero" :availability="swap" @swap="swapCard" />
      </div>

      <aside class="sidebar">
        <WalletPanel :balance="balance" :locked="inHand" @reset="rebuy" />
        <section class="controls panel poker-controls">
          <div class="section-label">
            牌桌状态 <span>{{ streetLabel }}</span>
          </div>
          <div class="status" aria-live="polite">
            <span class="status-star">✦</span>
            <h2>{{ message }}</h2>
            <p>{{ detail }}</p>
          </div>
          <button v-if="!inHand" class="primary" :disabled="!canStart" @click="startNext">
            {{ handComplete ? '下一手' : '开始新的一手' }}<span>↗</span>
          </button>
          <button v-else class="double-button" disabled>本手进行中 <span>等待结算</span></button>
          <p v-if="needsRebuy" class="low-balance">筹码不足，请重新买入 1,000 筹码。</p>
          <p class="control-note">
            {{ pot.toLocaleString() }} 筹码在池 · 本手净输赢 {{ netLabel }}
          </p>
        </section>
        <section class="stats">
          <div>
            <strong>{{ handNo }}</strong
            ><span>已玩手数</span>
          </div>
          <div>
            <strong>{{ pot.toLocaleString() }}</strong
            ><span>当前底池</span>
          </div>
          <div>
            <strong>{{ netLabel }}</strong
            ><span>本手输赢</span>
          </div>
        </section>
      </aside>
    </div>
    <footer>
      <span>♣ <strong>小提示</strong> 位置、底池赔率和下注尺度，比一时的手气更可靠。</span
      ><span>4 人桌 · 虚拟筹码 · 与二十一点共享余额</span>
    </footer>
  </main>

  <PokerRulesModal :open="rulesOpen" @close="rulesOpen = false" />
</template>

<style scoped>
.poker-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}
.poker-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.poker-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 70px;
  padding: 14px 18px;
  font-size: 11px;
  color: var(--muted);
}
.poker-hint p {
  margin: 0;
  color: var(--text);
  font-size: 12px;
}
.poker-hint small {
  margin-left: auto;
  text-align: right;
}
.poker-hint__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  flex-shrink: 0;
}
.poker-hint__dot.live {
  background: #78a176;
  box-shadow: 0 0 0 4px #78a17615;
}
.poker-shortcuts {
  margin: 0;
  text-align: center;
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--muted);
}
.poker-controls .status {
  padding: 18px 0 12px;
}
.poker-controls .primary {
  width: 100%;
}
.poker-controls .double-button {
  margin-top: 0;
}
@media (max-width: 1000px) {
  .poker-layout {
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 16px;
  }
}
@media (max-width: 720px) {
  .poker-layout {
    grid-template-columns: 1fr;
  }
  .poker-main {
    gap: 12px;
  }
  .poker-hint {
    min-height: 0;
    flex-wrap: wrap;
  }
  .poker-hint small {
    margin-left: 19px;
    text-align: left;
    width: 100%;
  }
  .poker-shortcuts {
    display: none;
  }
}
</style>
