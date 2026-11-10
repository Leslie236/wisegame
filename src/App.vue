<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { createDeck, score, payout, type Card } from './game/blackjack'

type Theme = 'forest' | 'midnight' | 'ivory' | 'charcoal'
function read(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function save(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* Storage may be unavailable. */
  }
}
const themes: { id: Theme; name: string; color: string }[] = [
  { id: 'charcoal', name: '炭黑深色', color: '#292b2e' },
  { id: 'forest', name: '经典绿桌', color: '#387a65' },
  { id: 'midnight', name: '午夜蓝', color: '#526baf' },
  { id: 'ivory', name: '暖色浅色', color: '#e5d5b7' },
]
const storedTheme = read('wise21-theme')
const theme = ref<Theme>(
  themes.some((t) => t.id === storedTheme) ? (storedTheme as Theme) : 'charcoal',
)
watch(theme, (value) => save('wise21-theme', value))
const savedBalance = Number(read('wise21-balance') ?? 1000)
const balance = ref(Number.isFinite(savedBalance) && savedBalance >= 0 ? savedBalance : 1000)
watch(balance, (value) => save('wise21-balance', String(value)))
const bet = ref(50)
const activeBet = ref(0)
const phase = ref<'ready' | 'playing' | 'done'>('ready')
const player = ref<Card[]>([]),
  dealer = ref<Card[]>([])
let deck: Card[] = []
const message = ref('好牌，从这一手开始。')
const detail = ref('选择筹码，开启你的第一局。')
const rulesOpen = ref(false)
const rulesDialog = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
watch(rulesOpen, async (open) => {
  if (open) {
    previousFocus = document.activeElement as HTMLElement | null
    await nextTick()
    rulesDialog.value?.querySelector<HTMLButtonElement>('button')?.focus()
  } else previousFocus?.focus()
})
function trapFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = rulesDialog.value?.querySelectorAll<HTMLButtonElement>('button')
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
const rounds = ref(0),
  wins = ref(0)
const playerScore = computed(() => score(player.value))
const dealerScore = computed(() =>
  score(phase.value === 'playing' ? dealer.value.slice(0, 1) : dealer.value),
)
const canDouble = computed(
  () => phase.value === 'playing' && player.value.length === 2 && balance.value >= activeBet.value,
)
function draw() {
  return deck.pop()!
}
function finish() {
  const returned = payout(player.value, dealer.value, activeBet.value)
  const profit = returned - activeBet.value
  balance.value += returned
  phase.value = 'done'
  rounds.value++
  if (profit > 0) wins.value++
  message.value =
    playerScore.value > 21
      ? '爆牌了，下手再来。'
      : profit > 0
        ? player.value.length === 2 && playerScore.value === 21
          ? 'BLACKJACK！漂亮的一手。'
          : '这一手，你赢了。'
        : profit === 0
          ? '势均力敌，平局。'
          : '庄家赢了，机会还在。'
  detail.value = `${profit > 0 ? '+' : ''}${profit} 筹码 · ${profit === 0 ? '下注已退回' : '本局已结算'}`
}
function start() {
  if (phase.value === 'playing' || balance.value < bet.value) return
  deck = createDeck()
  activeBet.value = bet.value
  balance.value -= activeBet.value
  player.value = [draw(), draw()]
  dealer.value = [draw(), draw()]
  phase.value = 'playing'
  message.value = '轮到你了。'
  detail.value = '再来一张，还是见好就收？'
  if (score(player.value) === 21 || score(dealer.value) === 21) finish()
}
function hit() {
  if (phase.value !== 'playing') return
  player.value.push(draw())
  if (playerScore.value > 21) finish()
  else if (playerScore.value === 21) stand()
}
function stand() {
  if (phase.value !== 'playing') return
  while (score(dealer.value) < 17) dealer.value.push(draw())
  finish()
}
function double() {
  if (!canDouble.value) return
  balance.value -= activeBet.value
  activeBet.value *= 2
  player.value.push(draw())
  if (playerScore.value > 21) finish()
  else stand()
}
function refill() {
  if (phase.value === 'playing') return
  balance.value = 1000
  bet.value = 50
  message.value = '筹码就位，重新出发。'
  detail.value = '选择下注，开始新的一局。'
}
</script>

<template>
  <div class="app" :data-theme="theme">
    <header class="header" :inert="rulesOpen">
      <a class="brand" href="./" aria-label="Wise 21 首页"
        ><span class="brand-icon">♠</span> WISE<span class="brand-number">21</span
        ><span class="brand-caption">休闲牌室</span></a
      >
      <div class="header-right">
        <div class="themes" role="group" aria-label="切换主题">
          <button
            v-for="option in themes"
            :key="option.id"
            :aria-label="option.name"
            :title="option.name"
            :aria-pressed="theme === option.id"
            :class="{ selected: theme === option.id }"
            @click="theme = option.id"
          >
            <span :style="{ background: option.color }"></span>
          </button>
        </div>
        <button class="rules-button" @click="rulesOpen = true"><span>ⓘ</span> 玩法说明</button>
      </div>
    </header>

    <main :inert="rulesOpen">
      <section class="intro">
        <div>
          <p class="eyebrow">TAKE A SEAT. PLAY YOUR HAND.</p>
          <h1>来一局，<em>21 点。</em></h1>
          <p class="intro-copy">一点运气，一点判断。享受刚刚好的冒险。</p>
        </div>
        <div class="session">
          <span class="live-dot"></span> 单人练习桌
          <span class="session-separator">/</span> 自由畅玩
        </div>
      </section>
      <div class="game-layout">
        <section class="table" aria-label="21 点牌桌">
          <div class="table-topline"><span>WISE 21 · TABLE 01</span><span>♠ ♥ ♣ ♦</span></div>
          <div class="hand-area dealer-area">
            <div class="hand-label">
              庄家
              <span class="score"
                >{{ dealer.length ? dealerScore : '—'
                }}{{ phase === 'playing' ? ' + ?' : '' }}</span
              >
            </div>
            <div class="cards">
              <template v-if="dealer.length"
                ><div
                  v-for="(card, index) in dealer"
                  :key="index"
                  class="card"
                  :class="{
                    red: card.suit === '♥' || card.suit === '♦',
                    back: phase === 'playing' && index === 1,
                  }"
                  :aria-label="
                    phase === 'playing' && index === 1 ? '庄家暗牌' : card.rank + card.suit
                  "
                >
                  <template v-if="phase === 'playing' && index === 1"
                    ><span class="back-symbol">♠</span></template
                  ><template v-else
                    ><span class="corner"
                      >{{ card.rank }}<small>{{ card.suit }}</small></span
                    ><span class="suit">{{ card.suit }}</span
                    ><span class="corner bottom"
                      >{{ card.rank }}<small>{{ card.suit }}</small></span
                    ></template
                  >
                </div></template
              ><template v-else
                ><div class="card back"><span class="back-symbol">♠</span></div>
                <div class="card back"><span class="back-symbol">♠</span></div></template
              >
            </div>
          </div>
          <div class="table-center">
            <span class="line"></span>
            <div>
              <p>BLACKJACK PAYS 3 TO 2</p>
              <span>庄家 17 点停牌 · 每局一副新牌</span>
            </div>
            <span class="line"></span>
          </div>
          <div class="hand-area player-area">
            <div class="cards">
              <template v-if="player.length"
                ><div
                  v-for="(card, index) in player"
                  :key="index"
                  class="card"
                  :class="{ red: card.suit === '♥' || card.suit === '♦' }"
                  :aria-label="card.rank + card.suit"
                >
                  <span class="corner"
                    >{{ card.rank }}<small>{{ card.suit }}</small></span
                  ><span class="suit">{{ card.suit }}</span
                  ><span class="corner bottom"
                    >{{ card.rank }}<small>{{ card.suit }}</small></span
                  >
                </div></template
              ><template v-else
                ><div class="card empty">♠</div>
                <div class="card empty">♠</div></template
              >
            </div>
            <div class="hand-label">
              你的手牌
              <span class="score" :class="{ bust: playerScore > 21 }">{{
                player.length ? playerScore : '—'
              }}</span>
            </div>
          </div>
          <div class="table-bottom"><span>放轻松，好好玩。</span><span>仅限虚拟筹码</span></div>
        </section>

        <aside class="sidebar">
          <section class="wallet panel">
            <div class="section-label">我的筹码 <span>◈</span></div>
            <div class="balance">{{ balance.toLocaleString() }}<span>CHIPS</span></div>
            <div class="wallet-bottom">
              <span>初始筹码 1,000</span
              ><button :disabled="phase === 'playing'" @click="refill">重置筹码 ↻</button>
            </div>
          </section>
          <section class="controls panel">
            <div class="section-label">
              {{ phase === 'playing' ? '本局下注' : '选择下注'
              }}<span>{{ phase === 'playing' ? activeBet : bet }} <small>筹码</small></span>
            </div>
            <div class="chips">
              <button
                v-for="amount in [10, 50, 100, 200]"
                :key="amount"
                :class="{ chosen: bet === amount }"
                :disabled="phase === 'playing' || balance < amount"
                :aria-pressed="bet === amount"
                @click="bet = amount"
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
              @click="start"
            >
              {{ phase === 'ready' ? '发牌，开始游戏' : '再来一局' }}<span>↗</span>
            </button>
            <template v-else
              ><div class="action-row">
                <button class="primary" @click="hit">＋ 要牌</button
                ><button class="secondary" @click="stand">停牌 <span>↗</span></button>
              </div>
              <button class="double-button" :disabled="!canDouble" @click="double">
                加倍下注 <span>仅再拿一张牌</span>
              </button></template
            >
            <p v-if="balance < bet && phase !== 'playing'" class="low-balance">
              筹码不足，请降低下注或重置筹码。
            </p>
            <p class="control-note">
              {{
                phase === 'playing'
                  ? '目标：尽量接近 21 点，但不要超过。'
                  : '准备好了就发牌，祝你好运。'
              }}
            </p>
          </section>
          <section class="stats">
            <div>
              <strong>{{ rounds }}</strong
              ><span>已玩局数</span>
            </div>
            <div>
              <strong>{{ wins }}</strong
              ><span>获胜局数</span>
            </div>
            <div>
              <strong>{{ rounds ? Math.round((wins / rounds) * 100) : 0 }}<small>%</small></strong
              ><span>本次胜率</span>
            </div>
          </section>
        </aside>
      </div>
      <footer>
        <span>♣ <strong>小提示</strong> A 可以算 1 点或 11 点，系统会自动选择更合适的点数。</span
        ><span>没有输赢压力，只有出牌乐趣。</span>
      </footer>
    </main>
    <div
      v-if="rulesOpen"
      class="modal-overlay"
      @click.self="rulesOpen = false"
      @keydown.esc="rulesOpen = false"
    >
      <section
        ref="rulesDialog"
        class="modal"
        @keydown="trapFocus"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
      >
        <button class="close" aria-label="关闭玩法说明" autofocus @click="rulesOpen = false">
          ×
        </button>
        <p class="eyebrow">HOW TO PLAY</p>
        <h2 id="rules-title">21 点，轻松上手。</h2>
        <p>与庄家比点数，尽量接近 21 点，超过就爆牌。</p>
        <ul>
          <li>数字牌按牌面计分，J / Q / K 算 10 点，A 自动算 1 或 11 点。</li>
          <li>
            <strong>要牌</strong>再拿一张，<strong>停牌</strong>让庄家亮牌；庄家低于 17
            点必须要牌，软 17 也停牌。
          </li>
          <li><strong>加倍</strong>仅限起手两张且筹码足够时：追加等额下注，只再拿一张牌。</li>
          <li>
            普通获胜净赢 1 倍下注；起手 A ＋ 10 点牌为 Blackjack，净赢 1.5 倍；同点数退回下注。
          </li>
          <li>天生 Blackjack 胜过多张牌组成的 21 点。本桌不提供分牌、保险和投降。</li>
        </ul>
        <p class="modal-note">
          纯娱乐小游戏，所有筹码均为虚拟筹码。主题和筹码余额会自动保存在当前浏览器，局数统计仅限本次打开。
        </p>
        <button class="primary" @click="rulesOpen = false">明白了，入座 ↗</button>
      </section>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700;800&display=swap');
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
button,
a {
  -webkit-tap-highlight-color: transparent;
}
button {
  font: inherit;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 5px;
}
button {
  transition:
    background 0.18s,
    transform 0.18s,
    opacity 0.18s;
}
button:not(:disabled):active {
  transform: translateY(1px);
}
.app {
  --bg: #f4f3ed;
  --panel: #fffefa;
  --text: #253e35;
  --muted: #80867d;
  --border: #e0e3d9;
  --accent: #c4db81;
  --primary: #284e3e;
  --primary-text: #fffefa;
  --felt: #1d4a3c;
  --felt-deep: #163c30;
  --table-text: #deeadb;
  --table-muted: #8da995;
  --card: #faf8ec;
  --ink: #233d34;
  --red: #b34c44;
  --chip: #f2f3eb;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
  transition:
    background 0.25s,
    color 0.25s;
}
.app[data-theme='charcoal'] {
  color-scheme: dark;
  --bg: #111313;
  --panel: #1b1e1d;
  --text: #e8ece7;
  --muted: #a1aaa3;
  --border: #333a35;
  --accent: #c4db81;
  --primary: #c4db81;
  --primary-text: #20291a;
  --felt: #26362e;
  --felt-deep: #1a2520;
  --table-text: #e1e9df;
  --table-muted: #a3b3a3;
  --card: #303632;
  --ink: #edf0e7;
  --red: #ff9b98;
  --chip: #292f2b;
}
.app[data-theme='midnight'] {
  color-scheme: dark;
  --bg: #101722;
  --panel: #1a2432;
  --text: #e6eaf2;
  --muted: #97a3b6;
  --border: #2d3a4d;
  --accent: #b7c6fc;
  --primary: #b7c6fc;
  --primary-text: #18253d;
  --felt: #253956;
  --felt-deep: #1b2b45;
  --table-text: #e1e8fa;
  --table-muted: #98abc9;
  --card: #e9edf5;
  --ink: #263954;
  --red: #af465c;
  --chip: #263346;
}
.app[data-theme='ivory'] {
  --bg: #eee8de;
  --panel: #faf7f0;
  --text: #514438;
  --muted: #8c7d6d;
  --border: #dcd1c1;
  --accent: #e6be78;
  --primary: #77543b;
  --primary-text: #fff9ed;
  --felt: #d6c4a5;
  --felt-deep: #c7b08b;
  --table-text: #51402d;
  --table-muted: #7a6247;
  --card: #fffcf4;
  --ink: #4b4036;
  --red: #af493e;
  --chip: #ede5d8;
}
.header {
  height: 94px;
  max-width: 1376px;
  padding: 0 64px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -1px;
}
.brand-icon {
  font-size: 34px;
  margin-right: 3px;
}
.brand-number {
  font-weight: 400;
  margin-left: -6px;
}
.brand-caption {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 2px;
  border-left: 1px solid var(--border);
  padding-left: 17px;
  margin-left: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 25px;
}
.themes {
  display: flex;
  gap: 3px;
  border: 1px solid var(--border);
  padding: 4px;
  border-radius: 30px;
}
.themes button {
  border: 1px solid transparent;
  background: transparent;
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}
.themes button.selected {
  border-color: var(--text);
}
.themes button span {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  border: 1px solid #ffffff30;
}
.rules-button {
  border: 0;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}
.rules-button span {
  margin-right: 5px;
  font-size: 15px;
}
main {
  max-width: 1248px;
  margin: auto;
  padding: 50px 32px 25px;
}
.intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 34px;
}
.eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2.8px;
  color: var(--muted);
  margin: 0 0 13px;
}
h1 {
  font-size: 39px;
  font-weight: 500;
  letter-spacing: -1.8px;
  margin: 0 0 12px;
}
h1 em {
  font-style: normal;
  font-weight: 800;
}
.intro-copy {
  font-size: 12px;
  color: var(--muted);
  letter-spacing: 1px;
  margin: 0;
}
.session {
  font-size: 11px;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 9px;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #78a176;
  box-shadow: 0 0 0 4px #78a17615;
}
.session-separator {
  margin: 0 5px;
  color: var(--border);
}
.game-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
}
.table {
  position: relative;
  min-height: 560px;
  background: radial-gradient(ellipse at 50% 40%, var(--felt), var(--felt-deep));
  color: var(--table-text);
  border-radius: 22px;
  padding: 25px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow:
    inset 0 0 0 7px #ffffff04,
    0 12px 24px #00000008;
  overflow: hidden;
}
.table:before {
  content: '';
  position: absolute;
  inset: 62px 24px 48px;
  border: 1px solid color-mix(in srgb, var(--table-muted) 24%, transparent);
  border-radius: 44% 44% 38% 38% / 26% 26% 22% 22%;
  pointer-events: none;
}
.table-topline,
.table-bottom {
  display: flex;
  justify-content: space-between;
  color: var(--table-muted);
  font-size: 9px;
  letter-spacing: 2px;
  position: relative;
}
.table-topline span:last-child {
  font-size: 15px;
  letter-spacing: 7px;
}
.table-bottom {
  font-size: 10px;
  letter-spacing: 1px;
}
.hand-area {
  position: relative;
  text-align: center;
  z-index: 1;
}
.dealer-area {
  margin-top: 18px;
}
.player-area {
  margin-bottom: 15px;
}
.hand-label {
  font-size: 11px;
  letter-spacing: 2px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}
.score {
  letter-spacing: 0;
  min-width: 30px;
  padding: 3px 10px;
  border: 1px solid #ffffff25;
  border-radius: 20px;
  background: #00000010;
  font-size: 12px;
}
.score.bust {
  background: #a33f3f;
  color: white;
}
.cards {
  display: flex;
  justify-content: safe center;
  overflow-x: auto;
  padding-bottom: 6px;
  min-height: 128px;
  gap: 10px;
  margin: 14px 0;
}
.card {
  width: 86px;
  height: 124px;
  border-radius: 8px;
  background: var(--card);
  color: var(--ink);
  box-shadow: 0 6px 12px #00000019;
  position: relative;
  flex-shrink: 0;
  animation: deal 0.3s ease-out;
}
.card.red {
  color: var(--red);
}
.corner {
  position: absolute;
  left: 9px;
  top: 7px;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.corner small {
  font-size: 13px;
  margin-top: 3px;
}
.corner.bottom {
  left: auto;
  top: auto;
  right: 9px;
  bottom: 7px;
  transform: rotate(180deg);
}
.suit {
  font-size: 43px;
  display: grid;
  place-items: center;
  height: 100%;
}
.card.back {
  border: 5px solid var(--card);
  background:
    repeating-linear-gradient(45deg, transparent, transparent 5px, #ffffff12 5px, #ffffff12 6px),
    var(--felt-deep);
  display: grid;
  place-items: center;
}
.back-symbol {
  border: 1px solid var(--table-muted);
  border-radius: 50%;
  width: 47px;
  height: 59px;
  display: grid;
  place-items: center;
  color: var(--table-text);
  font-size: 28px;
}
.card.empty {
  border: 1px dashed var(--table-muted);
  box-shadow: none;
  background: transparent;
  color: var(--table-muted);
  display: grid;
  place-items: center;
  font-size: 27px;
  opacity: 0.4;
}
.table-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
  color: var(--table-muted);
  margin: 10px 0;
}
.table-center p {
  font-size: 12px;
  letter-spacing: 3px;
  margin: 0 0 7px;
  font-weight: 600;
}
.table-center span {
  font-size: 9px;
  letter-spacing: 1px;
}
.table-center .line {
  width: 35px;
  height: 1px;
  background: var(--table-muted);
  opacity: 0.35;
}
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 23px;
}
.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
}
.section-label > span {
  font-size: 17px;
}
.section-label small {
  font-size: 10px;
  font-weight: 400;
  color: var(--muted);
}
.wallet .section-label {
  color: var(--muted);
}
.balance {
  font-size: 39px;
  letter-spacing: -1.5px;
  margin: 13px 0 15px;
  line-height: 1;
}
.balance span {
  font-size: 9px;
  letter-spacing: 1.5px;
  color: var(--muted);
  margin-left: 10px;
}
.wallet-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
  padding-top: 13px;
  font-size: 10px;
  color: var(--muted);
}
.wallet-bottom button {
  border: 0;
  color: var(--muted);
  background: none;
  padding: 0;
  font-size: 10px;
}
.controls {
  flex: 1;
}
.chips {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-top: 22px;
}
.chips button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px dashed var(--border);
  background: var(--chip);
  color: var(--text);
  padding: 4px;
}
.chips button span {
  border: 1px solid var(--border);
  border-radius: 50%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 12px;
}
.chips .chosen {
  background: var(--primary);
  color: var(--primary-text);
  border-color: var(--muted);
  box-shadow: 0 3px 9px #00000012;
}
.chips .chosen span {
  border-color: #ffffff40;
}
.status {
  text-align: center;
  padding: 23px 0 20px;
}
.status-star {
  color: var(--muted);
  font-size: 19px;
}
.status h2 {
  font-size: 15px;
  font-weight: 500;
  margin: 10px 0 8px;
}
.status p {
  font-size: 10px;
  color: var(--muted);
  margin: 0;
}
.primary,
.secondary {
  border: 0;
  border-radius: 8px;
  min-height: 47px;
  padding: 12px 17px;
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--primary);
  color: var(--primary-text);
}
.controls > .primary,
.modal > .primary {
  width: 100%;
}
.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}
.primary > span {
  font-size: 20px;
}
.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
}
.secondary {
  background: var(--chip);
  color: var(--text);
  border: 1px solid var(--border);
}
.double-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 9px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 11px;
  background: transparent;
  color: var(--text);
  font-size: 11px;
}
.double-button span {
  font-size: 9px;
  color: var(--muted);
}
.control-note,
.low-balance {
  text-align: center;
  font-size: 9px;
  color: var(--muted);
  margin: 12px 0 0;
}
.low-balance {
  color: var(--red);
}
.stats {
  display: flex;
  justify-content: space-around;
  padding: 10px 0 2px;
}
.stats > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  flex: 1;
}
.stats > div + div {
  border-left: 1px solid var(--border);
}
.stats strong {
  font-size: 21px;
  font-weight: 500;
}
.stats small {
  font-size: 12px;
  margin-left: 2px;
}
.stats span {
  font-size: 9px;
  color: var(--muted);
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  font-size: 10px;
  color: var(--muted);
  padding-top: 25px;
  line-height: 1.8;
}
footer strong {
  font-weight: 500;
  margin: 0 9px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: #07140f99;
  backdrop-filter: blur(5px);
  display: grid;
  place-items: center;
  padding: 20px;
}
.modal {
  position: relative;
  max-width: 520px;
  max-height: 90dvh;
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 35px;
  color: var(--text);
  box-shadow: 0 20px 80px #0005;
}
.close {
  position: absolute;
  right: 20px;
  top: 14px;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 26px;
}
.modal h2 {
  font-size: 25px;
}
.modal p,
.modal li {
  font-size: 12px;
  line-height: 1.9;
}
.modal ul {
  padding-left: 18px;
}
.modal li {
  margin-bottom: 10px;
}
.modal .modal-note {
  color: var(--muted);
  font-size: 10px;
  margin: 20px 0;
}
.modal > .primary {
  justify-content: center;
}
@keyframes deal {
  from {
    opacity: 0;
    transform: translateY(-12px) rotate(-3deg);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (min-width: 1500px) {
  main {
    padding-top: 70px;
  }
  .table {
    min-height: 610px;
  }
  .cards {
    margin: 20px 0;
  }
}
@media (max-width: 1000px) {
  .header {
    padding: 0 32px;
  }
  .game-layout {
    grid-template-columns: minmax(0, 1fr) 285px;
    gap: 16px;
  }
  .panel {
    padding: 20px;
  }
  .card {
    width: 73px;
    height: 108px;
  }
  .cards {
    min-height: 108px;
    gap: 7px;
  }
  .table {
    padding: 24px 20px;
  }
  .table-center p {
    font-size: 10px;
    letter-spacing: 2px;
  }
  .table-center .line {
    width: 20px;
  }
  .table-center {
    gap: 10px;
  }
  footer > span:last-child {
    display: none;
  }
}
@media (max-width: 720px) {
  .header {
    height: 76px;
    padding: 0 20px;
  }
  .brand {
    font-size: 21px;
  }
  .brand-caption {
    display: none;
  }
  .header-right {
    gap: 12px;
  }
  .rules-button {
    font-size: 0;
  }
  .rules-button span {
    font-size: 20px;
    margin: 0;
  }
  main {
    padding: 30px 16px 20px;
  }
  .intro {
    margin-bottom: 25px;
  }
  .intro .eyebrow {
    font-size: 8px;
    letter-spacing: 2px;
  }
  h1 {
    font-size: 31px;
  }
  .intro-copy {
    font-size: 10px;
    letter-spacing: 0.5px;
  }
  .session {
    display: none;
  }
  .game-layout {
    grid-template-columns: 1fr;
  }
  .table {
    min-height: 475px;
    padding: 22px;
  }
  .dealer-area {
    margin-top: 12px;
  }
  .player-area {
    margin-bottom: 10px;
  }
  .table:before {
    inset: 58px 16px 44px;
  }
  .table-topline {
    font-size: 8px;
  }
  .table-bottom {
    font-size: 9px;
  }
  .cards {
    margin: 12px 0;
    gap: 7px;
  }
  .card {
    width: 73px;
    height: 105px;
  }
  .corner {
    font-size: 16px;
    top: 6px;
    left: 7px;
  }
  .corner.bottom {
    right: 7px;
    bottom: 6px;
  }
  .suit {
    font-size: 36px;
  }
  .sidebar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
  }
  .wallet {
    padding: 18px 22px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
  }
  .wallet .section-label span {
    display: none;
  }
  .balance {
    font-size: 29px;
    text-align: right;
    margin: 0;
  }
  .wallet-bottom {
    grid-column: 1/-1;
    margin-top: 15px;
  }
  .controls {
    padding: 20px 22px;
  }
  .chips {
    justify-content: center;
    gap: 22px;
    margin-top: 18px;
  }
  .status {
    padding: 18px 0;
  }
  .status-star {
    display: none;
  }
  .status h2 {
    margin-top: 0;
  }
  .stats {
    padding: 10px 0;
  }
  footer {
    font-size: 9px;
    padding-top: 20px;
  }
  .table-center {
    margin: 4px 0;
  }
  .table-center p {
    font-size: 10px;
  }
  .modal {
    padding: 30px 24px;
  }
  .cards:has(.card:nth-child(5)) {
    gap: 0;
  }
  .cards:has(.card:nth-child(5)) .card {
    margin: 0 -8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *:before,
  *:after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
