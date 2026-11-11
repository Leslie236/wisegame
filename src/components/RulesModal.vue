<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const dialog = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      await nextTick()
      dialog.value?.querySelector<HTMLButtonElement>('button')?.focus()
    } else {
      // Wait until the surrounding inert regions are restored before focusing back.
      await nextTick()
      previousFocus?.focus()
    }
  },
)

function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = dialog.value?.querySelectorAll<HTMLButtonElement>('button')
  if (!buttons?.length) return
  const first = buttons[0]!,
    last = buttons[buttons.length - 1]!
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')" @keydown.esc="emit('close')">
    <section
      ref="dialog"
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      @keydown="trapFocus"
    >
      <button class="close" aria-label="关闭玩法说明" @click="emit('close')">×</button>
      <p class="eyebrow">HOW TO PLAY</p>
      <h2 id="rules-title">21 点，轻松上手。</h2>
      <p>与庄家比点数，尽量接近 21 点，超过就爆牌。</p>
      <ul>
        <li>数字牌按牌面计分，J / Q / K 算 10 点，A 自动算 1 或 11 点。</li>
        <li>
          <strong>要牌</strong>再拿一张，<strong>停牌</strong>让庄家亮牌；庄家低于 17 点必须要牌，软
          17 也停牌。
        </li>
        <li>
          <strong>分牌</strong
          >：起手两张同点数牌时，追加等额下注拆为两手，依次操作、独立结算。每局限分一次，分牌后可加倍；分
          A 每手只补一张牌。
        </li>
        <li>
          <strong>投降</strong>：庄家检查 Blackjack
          后，未分牌且起手尚未要牌或加倍时可放弃，退回一半下注。
        </li>
        <li><strong>加倍</strong>仅限起手两张且筹码足够时：追加等额下注，只再拿一张牌。</li>
        <li>普通获胜净赢 1 倍下注；起手 A ＋ 10 点牌为 Blackjack，净赢 1.5 倍；同点数退回下注。</li>
        <li>
          天生 Blackjack 胜过多张牌组成的 21 点。分牌后的 21 点按普通获胜赔付。本桌不提供保险。
        </li>
      </ul>
      <p class="modal-note">
        纯娱乐小游戏，所有筹码均为虚拟筹码。主题和筹码余额会自动保存在当前浏览器，局数统计仅限本次打开。
      </p>
      <button class="primary" @click="emit('close')">明白了，入座 ↗</button>
    </section>
  </div>
</template>
