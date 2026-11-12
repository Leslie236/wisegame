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
      aria-labelledby="poker-rules-title"
      @keydown="trapFocus"
    >
      <button class="close" aria-label="关闭玩法说明" @click="emit('close')">×</button>
      <p class="eyebrow">HOW TO PLAY</p>
      <h2 id="poker-rules-title">德州扑克，入座。</h2>
      <p>4 人桌，盲注 10 / 20，用两张底牌和五张公共牌组成最好的五张牌。</p>
      <ul>
        <li>
          按钮每手顺时针移动。按钮左手下小盲 10，再左手下大盲
          20；翻牌前从大盲左手开始行动，翻牌后从按钮左手开始。
        </li>
        <li>
          翻牌前、翻牌、转牌、河牌各有一轮下注。可以弃牌、过牌、跟注、下注、加注或全下；下注额必须达到最小加注。
        </li>
        <li>
          牌型从高到低：皇家同花顺、同花顺、四条、葫芦、同花、顺子、三条、两对、一对、高牌。A
          可作最大或最小，A2345 算 5 高顺子。
        </li>
        <li>平局平分底池；无法均分时，从按钮左手第一位赢家开始依次多分 1 枚筹码。</li>
        <li>
          全下筹码不同时会产生主池和边池；弃牌玩家的筹码留在池中，但不再参与争夺。本桌第一版对短全下采用简化规则：任何全下加注都会重新打开行动。
        </li>
        <li>
          你和二十一点共用同一份筹码余额；本手进行中切换游戏或刷新页面视为弃牌，已投入的筹码不会退回。
        </li>
        <li>AI 筹码归零后离桌，下一手由携带随机 1,000～5,000 筹码的新玩家入座；你可以在筹码不足时重新买入 1,000。所有筹码均为虚拟筹码。</li>
        <li>
          键盘快捷键：F 弃牌、C 过牌/跟注、R 加注、A 全下、Esc 关闭弹窗。打开本说明时 AI
          会暂停思考。
        </li>
      </ul>
      <p class="modal-note">
        小提示：位置越靠后越有信息优势。起手牌、底池赔率和对手的下注尺度，比一时的好运气更值得依赖。
      </p>
      <button class="primary" @click="emit('close')">明白了，看牌 ↗</button>
    </section>
  </div>
</template>
