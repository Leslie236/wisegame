<script setup lang="ts">
import { ref } from 'vue'

import ControlsPanel from '@/components/ControlsPanel.vue'
import GameTable from '@/components/GameTable.vue'
import RulesModal from '@/components/RulesModal.vue'
import StatsBar from '@/components/StatsBar.vue'
import WalletPanel from '@/components/WalletPanel.vue'
import { useBlackjack } from '@/composables/useBlackjack'

const {
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
} = useBlackjack()
const rulesOpen = ref(false)
</script>

<template>
  <main :inert="rulesOpen">
    <section class="intro">
      <div>
        <p class="eyebrow">TAKE A SEAT. PLAY YOUR HAND.</p>
        <h1>来一局，<em>21 点。</em></h1>
        <p class="intro-copy">一点运气，一点判断。享受刚刚好的冒险。</p>
      </div>
      <div class="intro-side">
        <div class="session">
          <span class="live-dot"></span> 单人练习桌
          <span class="session-separator">/</span> 自由畅玩
        </div>
        <button class="rules-link" @click="rulesOpen = true"><span>ⓘ</span> 玩法说明</button>
      </div>
    </section>
    <div class="game-layout">
      <GameTable :hands="hands" :dealer="dealer" :phase="phase" :active-index="activeIndex" />

      <aside class="sidebar">
        <WalletPanel :balance="balance" :locked="phase === 'playing'" @reset="refill" />
        <ControlsPanel
          :phase="phase"
          :balance="balance"
          :bet="bet"
          :active-bet="activeBet"
          :message="message"
          :detail="detail"
          :can-double="canDouble"
          :can-split="canSplit"
          :can-surrender="canSurrender"
          @update:bet="bet = $event"
          @start="start"
          @hit="hit"
          @stand="stand"
          @double="double"
          @split="split"
          @surrender="surrender"
        />
        <StatsBar :rounds="rounds" :wins="wins" />
      </aside>
    </div>
    <footer>
      <span>♣ <strong>小提示</strong> A 可以算 1 点或 11 点，系统会自动选择更合适的点数。</span
      ><span>没有输赢压力，只有出牌乐趣。</span>
    </footer>
  </main>

  <RulesModal :open="rulesOpen" @close="rulesOpen = false" />
</template>
