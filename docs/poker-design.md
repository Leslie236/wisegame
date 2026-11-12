# WISE 牌室 · 德州扑克功能设计

> 版本 1.1 · 2026-11-11 · M0–M4 核心项已实现；剩余音效、深度 a11y、可选蒙特卡洛 AI。
>
> 目标：在现有 Vue 3 项目里加入一款可玩的**单人无限注德州扑克**，与二十一点并列成为牌室里的第二个游戏。

## 1. 目标与范围

### 1.1 产品定位

- 4 人桌（1 名玩家 + 3 个 AI），无限注德州扑克（No-Limit Hold'em）。
- 纯虚拟筹码、休闲节奏，无真钱、无联网、无账号。
- 一局 2–5 分钟，随时可以离开；筹码与二十一点共用，手牌中刷新或切走视为弃牌，已投入筹码不退回。
- 复用现有四套主题与深色牌桌视觉，保持"WISE 牌室"的统一气质。

### 1.2 本期范围（MVP）

| 包含                                    | 不包含（后续再说）         |
| --------------------------------------- | -------------------------- |
| 盲注、按钮轮转、四条街                  | 多人联网                   |
| 弃牌 / 过牌 / 跟注 / 下注 / 加注 / 全下 | 锦标赛、涨盲、泡沫期       |
| 最小加注、全下、边池、平分底池          | 保险、Jackpot、Rabbit Hunt |
| 摊牌、牌型判定、最佳五张高亮            | 手牌历史回放、牌局分享     |
| 3 个不同风格的 AI                       | 自定义 AI / 难度选择       |
| 玩家筹码持久化、重新买入                | 成就、排行榜               |

### 1.3 已确认决策

| 决策        | 结论                                               | 状态                          |
| ----------- | -------------------------------------------------- | ----------------------------- |
| 桌型        | **4-max**（1 名玩家 + 3 个 AI）                    | 已实现                        |
| 盲注        | **10 / 20**，AI 初始 1,000；玩家用共享钱包余额入座 | 已实现                        |
| 筹码        | **与二十一点共用** `wise21-balance` 钱包           | 已实现                        |
| 重买        | 玩家手动重买 1,000；AI 归零后下一手更换新玩家，随机带入 1,000～5,000      | 已实现                        |
| 短全下      | **简化**：任何全下加注都会重新打开行动             | 已实现，完整 TDA 规则留待后续 |
| 品牌 / 入口 | **WISE 牌室** + 顶部游戏切换（21 点 / 德州扑克）   | 已实现                        |
| AI          | 薇拉（紧凶）、幸运儿（松凶）、老莫（跟注站）       | 已实现，启发式决策            |
| 规则说明    | 每个游戏独立的玩法弹窗                             | 已实现                        |

## 2. 规则口径

### 2.1 基本流程

1. 按钮（Button）每手顺时针移动一位。
2. 按钮左手第一位下小盲（SB），第二位下大盲（BB）。
3. 每人发 2 张底牌。
4. **翻牌前**：从大盲左手第一位开始行动。
5. **翻牌 / 转牌 / 河牌**：从按钮左手第一位仍在牌局的玩家开始行动。
6. 每条街下注结束、无人弃牌则发下一街公共牌；河牌后摊牌。
7. 只剩一名未弃牌玩家时立即结算，不亮牌。

单挑时按钮即小盲，翻牌前按钮先行动，翻牌后大盲先行动——用"大盲左手第一位"和"按钮左手第一位"两条通用规则即可自然覆盖，无需特判。

### 2.2 下注规则

- **最小下注**：一个大盲（20）。
- **最小加注**：`当前最高注 + 上一次完整加注量`；翻牌前初始加注量为一个大盲。
- **加注额语义**：UI 与引擎统一使用"**加注到**（raise to）"的总数，避免"加多少"的歧义。
- **全下**：筹码不足时可以全下；全下额小于最小加注时属于**短全下**。
- **短全下**：当前版本采用已确认的简化规则——任何全下加注都会重新打开行动，已行动玩家可以再次加注。完整 TDA 口径（短全下不重开加注权）留待后续版本，状态里已保留 `canRaise` / `lastFullRaise` 以便升级。
- 轮次结束条件：所有未弃牌、未全下的玩家都已行动，且街注等于当前最高注。

### 2.3 摊牌与分池

- 每人用 2 张底牌 + 5 张公共牌中最好的 5 张比大小。
- 牌型从高到低：皇家同花顺、同花顺、四条、葫芦、同花、顺子、三条、两对、一对、高牌。
- 先比牌型，再比关键牌，再比踢脚；完全相同则平分。
- **边池**：按每人本手总投入分层计算；弃牌玩家的筹码留在池中，但无资格争夺。
- 奇数筹码：从按钮左手第一位开始，按顺时针依次多分 1 枚给赢家。
- 未被跟注的多余下注（uncalled bet）按层退回给下注者；实现上等价于"只有他有资格赢的那一层"。

### 2.4 本桌约定

- 不设前注（ante）、抓头（straddle）、保险。
- 发公共牌前烧一张牌（不影响概率，只为贴近真实流程）。
- AI 破产后下一手更换新玩家，随机带入 1,000～5,000；玩家破产需要手动点"重新买入"。
- 下一手不自动开始：结算后显示"下一手"按钮，避免玩家来不及看牌。

## 3. 产品流程与界面

### 3.1 路由与导航

```
/        二十一点（现有页面）
/poker   德州扑克（新页面，懒加载）
```

顶部导航：`WISE 牌室` 品牌 + 游戏切换（21 点 / 德州扑克）+ 主题切换。
"玩法说明"按钮从全局 header 移到各游戏自己的区域，弹窗内容随游戏不同。

### 3.2 桌面布局（4-max）

```
┌──────────────────────────────────────────────────────────────┐
│  ♠ WISE 牌室      [21 点] [德州扑克]        ● ● ● ●  ⓘ      │
├──────────────────────────────────────────────────────────────┤
│                    AI-2 · 按钮 · 1,000                       │
│                        [ ? ] [ ? ]                           │
│                                                              │
│   AI-1 · 小盲                 底池 120              AI-3     │
│   [ ? ] [ ? ]          ┌──────────────────┐        [ ? ] [ ? ]│
│                        │  A♠  K♥  7♦   ?  ? │                │
│                        └──────────────────┘                │
│                          你 · 大盲 · 950                      │
│                          [A♣] [K♣]                           │
│                                                              │
│  [ 弃牌 ]  [ 过牌 ]  [ 加注到 60 ]  [ 全下 ]                  │
│  ─────────────── 加注滑杆 20 ──●──────── 200 ─────────────── │
└──────────────────────────────────────────────────────────────┘
```

- 玩家固定在底部，底牌明牌；AI 底牌用牌背，摊牌时翻开。
- 每个座位显示：名字、筹码、动作气泡（跟注 20 / 加注到 60 / 弃牌）、庄家按钮 D、SB / BB 标记。
- 底池显示总额；有多层边池时点开显示分层明细。
- 行动条按钮随合法动作动态变化：无人下注时"过牌"，有下注时"跟注 40"；不合法时隐藏或禁用并给出原因。
- 加注面板：滑杆 + 快捷比例（1/2 池、2/3 池、1 池、全下），显示"加注到 X"，避免误触。
- 等待 AI 时显示"AI-2 思考中…"，并用 0.6–1.2 秒延迟营造节奏。

### 3.3 摊牌表现

1. 剩余玩家依次翻牌（或直接全亮）。
2. 系统高亮每位玩家的最佳五张，其余牌降低透明度。
3. 显示中文牌型标签（如"葫芦"、"同花"）。
4. 底池筹码飞向赢家（或平分），显示净输赢。
5. 显示"下一手"按钮；玩家可停留查看。

### 3.4 移动端与可访问性

- 390px 宽度下：牌桌压缩为纵向布局，AI 座位横排顶部，玩家与行动条固定在下方。
- 行动条按钮高度 ≥ 44px，滑杆拇指加大；避免依赖 hover。
- `aria-live="polite"` 播报轮到谁、底池变化、结算结果。
- 键盘快捷键：`F` 弃牌、`C` 过牌/跟注、`R` 加注、`A` 全下、`Esc` 关闭弹窗；规则弹窗内做焦点陷阱。
- 打开规则弹窗时暂停 AI 思考计时器，关闭后恢复。
- 牌面同时用花色符号与文字，不只用颜色区分；尊重 `prefers-reduced-motion`。

## 4. 技术架构

### 4.1 目录（已落地）

```
src/
├── game/
│   ├── cards.ts                 # 共享 Card 类型 / createDeck(rng?)
│   └── poker/
│       ├── types.ts             # 引擎类型
│       ├── evaluator.ts         # 7 选 5 牌型评估
│       ├── pot.ts               # 边池分层与分配
│       ├── engine.ts            # 下注状态机
│       └── ai.ts                # AI 决策与手牌强度
├── composables/
│   ├── useBlackjack.ts          # 二十一点
│   ├── useHoldem.ts             # 德州引擎 + AI 调度
│   ├── useTheme.ts              # 主题
│   └── useWallet.ts             # 共享钱包
├── components/
│   ├── AppNav.vue               # 品牌、游戏切换、主题切换
│   ├── poker/
│   │   ├── PokerTable.vue       # 牌桌、底池、公共牌
│   │   ├── PokerSeat.vue        # 座位、底牌、动作
│   │   ├── PokerCard.vue        # 扑克牌
│   │   ├── PokerActionBar.vue   # 行动按钮与加注面板
│   │   └── PokerRulesModal.vue  # 德州规则说明
│   └── ...                      # 二十一点组件
├── views/
│   ├── BlackjackView.vue        # 从原 App.vue 迁移
│   └── PokerView.vue            # 德州页面
├── router/index.ts              # / 与 /poker
└── App.vue                      # 壳：主题 + AppNav + <RouterView />
```

### 4.2 数据流

```
PokerView / PokerActionBar
        │ 用户动作
        ▼
useHoldem（异步调度、AI 计时器、持久化、消息）
        │ 纯函数调用
        ▼
engine.ts（状态机） ── evaluator.ts（牌型） / pot.ts（边池）
        ▲
        └── ai.ts（只读取公开信息 + 自己的底牌）
```

- 引擎**不依赖 Vue**，纯函数进、纯函数出，便于单测与回放。
- AI 延迟、动画、音效都在 composable 层，引擎保持同步。
- AI 绝不能读取其他玩家的底牌；`decideAction` 只接收自己的手牌和公共信息。

### 4.3 核心类型（草案）

```ts
export type Street = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete'
export type SeatStatus = 'active' | 'folded' | 'all-in' | 'out'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export interface Seat {
  id: number
  name: string
  isHero: boolean
  stack: number
  hole: Card[]
  streetBet: number // 本条街已投入
  totalBet: number // 本手已投入
  status: SeatStatus
  lastAction: ActionType | null
  hasActed: boolean // 本轮是否已行动
  canRaise: boolean // 短全下后是否仍可加注
}

export interface TableState {
  seats: Seat[]
  button: number
  smallBlind: number
  bigBlind: number
  smallBlindSeat: number | null // 本手小盲座位
  bigBlindSeat: number | null // 本手大盲座位
  street: Street
  board: Card[]
  deck: Card[]
  currentBet: number // 当前最高街注
  lastFullRaise: number // 最近一次完整加注的增量
  actor: number | null // 当前行动者，null 表示等待/结算
  lastAggressor: number | null
  handNo: number
  pots: Pot[] // 结算时的分层底池
  result: HandResult | null
}
```

```ts
export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'bet'; to: number } // 下注到（本条街总额）
  | { type: 'raise'; to: number } // 加注到（本条街总额）
  | { type: 'all-in' }
```

```ts
export interface LegalActions {
  fold: boolean
  check: boolean
  call: { amount: number } | null
  bet: { min: number; max: number } | null
  raise: { min: number; max: number } | null
  allIn: { amount: number } | null
}
```

### 4.4 引擎 API

```ts
export function createTable(config: TableConfig): TableState
export function startHand(state: TableState, deck?: Card[]): TableState
export function legalActions(state: TableState, seatId: number): LegalActions
export function applyAction(state: TableState, seatId: number, action: Action): TableState
```

- `applyAction` 内部校验合法性，非法动作抛出带中文说明的 `Error`（测试直接断言）。
- 状态以不可变方式返回（浅拷贝座位数组），避免 UI 直接改引擎状态。
- 洗牌支持注入 RNG，测试与复盘可复现。
- `startHand` 负责盲注、发牌、按钮轮转；`applyAction` 负责行动、街推进、摊牌结算。
- 当前实现为纯函数 + 浅拷贝状态，AI 调度在 `useHoldem` 中，引擎不依赖 Vue。

### 4.5 状态机边界

| 状态                      | 允许的动作                       | 自动转移                   |
| ------------------------- | -------------------------------- | -------------------------- |
| `preflop`                 | fold/check/call/bet/raise/all-in | 下注轮结束 → flop          |
| `flop` / `turn` / `river` | 同上                             | 轮结束 → 下一街 / showdown |
| `showdown`                | 无                               | 结算后 → complete          |
| `complete`                | 无                               | 玩家点"下一手" → 新 state  |

## 5. 牌型评估与边池

### 5.1 评估器

- 输入 5–7 张牌；7 张时枚举 `C(7,5)=21` 种组合，取最大值。
- 输出可比较的 `HandValue`：`category`（0–8）+ `tiebreak`（长度 5、高位在前、不足补 0）。
- 同时返回最佳 5 张牌，供 UI 高亮。
- 特殊处理：A2345 轮子顺子（5 高）、同花顺、四条带踢脚、葫芦、两对带踢脚。

```ts
export interface HandValue {
  category: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  tiebreak: [number, number, number, number, number]
  cards: Card[] // 最佳五张
  label: string // 中文牌型
}

export function evaluate(cards: Card[]): HandValue
export function compareHands(a: HandValue, b: HandValue): number
```

性能预算：21 次五张评估对单次决策可忽略；当前 AI 使用启发式强度，不做蒙特卡洛，决策耗时 < 1ms。

### 5.2 边池算法

```ts
function buildPots(seats: Seat[]): Pot[] {
  const levels = [...new Set(seats.map((s) => s.totalBet).filter((v) => v > 0))].sort(
    (a, b) => a - b,
  )
  const pots: Pot[] = []
  let previous = 0
  for (const level of levels) {
    let amount = 0
    for (const seat of seats) {
      amount += Math.max(0, Math.min(seat.totalBet, level) - previous)
    }
    const eligible = seats
      .filter((s) => s.status !== 'folded' && s.totalBet >= level)
      .map((s) => s.id)
    if (eligible.length === 0) {
      // 该层全是弃牌死钱，并入上一层
      if (pots.length) pots[pots.length - 1]!.amount += amount
    } else {
      pots.push({ amount, eligible })
    }
    previous = level
  }
  return pots
}
```

分配：

1. 每个池只在该池 `eligible` 中评选最佳牌型。
2. `base = floor(pot / winners.length)`，余数从按钮左手第一位赢家开始顺时针各加 1。
3. 玩家净输赢 = 分得筹码 − 本手 `totalBet`。

### 5.3 必须覆盖的边界

- 三人不同筹码全下（100 / 300 / 500）的边池分层。
- 弃牌玩家的死钱进入主池但不参与争夺。
- 只有一人有资格赢的层（未被跟注的部分）退回。
- 平分底池 + 奇数筹码。
- 短全下提高注额并重新打开行动（当前简化口径）。
- 大盲不足一个大盲时全下。
- 单挑时按钮即小盲。

## 6. AI 设计

### 6.1 性格配置

| 名字         | 风格   | 松紧 | 激进度 | 诈唬率 |
| ------------ | ------ | ---- | ------ | ------ |
| 岩石 Rocky   | 紧弱   | 0.85 | 0.25   | 3%     |
| 薇拉 Vera    | 紧凶   | 0.70 | 0.65   | 8%     |
| 幸运儿 Lucky | 松凶   | 0.40 | 0.80   | 18%    |
| 老莫 Mo      | 跟注站 | 0.35 | 0.15   | 2%     |

默认桌：薇拉、幸运儿、老莫各一；岩石保留给后续难度选择。

### 6.2 决策流程

当前版本（启发式，已落地）：

```
1. 计算底池赔率：call / (pot + call)
2. 估算手牌强度：
   - 翻牌前：对子 / 高牌 / 同花 / 连牌修正
   - 翻牌后：7 选 5 牌型等级映射到 0–1
3. 无人下注：强度高或按性格诈唬 → 下注 1/2–3/4 池，否则过牌
4. 面对下注：强度低于「赔率 + 松紧修正」→ 弃牌；强度高 + 激进度高 → 加注；否则跟注
5. 所有金额 clamp 到 [minRaiseTo, stack]，绝不产生非法动作
```

- AI 只读取自己的底牌和公共信息，不偷看对手底牌。
- 决策使用可注入 RNG；确定性测试用固定种子。
- 思考延迟 550–1,200ms；`useHoldem` 负责调度，切换页面时清理计时器。
- 蒙特卡洛胜率估算留作后续增强，当前不依赖它。

### 6.3 翻牌前分档（简化）

| 档位 | 手牌                      | 默认动作             |
| ---- | ------------------------- | -------------------- |
| S    | AA、KK、QQ、AKs           | 加注 / 再加注        |
| A    | JJ–99、AQs、AJs、KQs、AKo | 跟注或加注（看位置） |
| B    | 小对子、同花连牌、Axs     | 便宜看翻牌，早位收紧 |
| C    | 其余                      | 弃牌（大盲可过牌）   |

## 7. 与现有项目的集成

### 7.1 应用壳与路由

- `App.vue` 改为壳：`.app[data-theme]` + `AppNav` + `<RouterView />`。
- 现有 21 点页面整体迁移到 `views/BlackjackView.vue`，逻辑与 DOM 不变。
- 路由：

```ts
import BlackjackView from '@/views/BlackjackView.vue'

routes: [
  { path: '/', name: 'blackjack', component: BlackjackView },
  { path: '/poker', name: 'poker', component: () => import('@/views/PokerView.vue') },
]
```

- 二十一点保持首屏同步加载；扑克路由懒加载，产物约 27 KB JS / 10 KB CSS。
- 静态部署需要 SPA fallback（`/poker` 直接访问返回 `index.html`）；若部署环境不支持，改用 hash 路由。

### 7.2 主题

- 主题状态继续由 `App.vue` 持有，通过 `.app[data-theme]` 的 CSS 变量向下传递。
- 扑克组件只使用 `--felt`、`--card`、`--text`、`--accent` 等现有变量，不新增主题。
- `AppNav` 接收 `theme` / `themes`，发出 `update:theme`，与现在一致。

### 7.3 共享牌与工具

- 把 `Card` 类型与 `createDeck` 提取到 `game/cards.ts`，给 `createDeck` 增加可选 RNG。
- `game/blackjack.ts` 改为从 `cards.ts` 导入；现有测试调整导入路径（或保留兼容导出）。
- 二十一点的 `score` / `payout` 不动。
- 扑克不复用 `PlayingCard.vue`（尺寸与状态不同），新建 `PokerCard.vue`，避免两套样式互相污染。

### 7.4 对现有测试的影响（已完成）

- 二十一点测试改为挂载 `BlackjackView`；主题与游戏切换测试用 `createMemoryHistory` 挂载 `App`。
- 新增导航测试，验证 `/` 与 `/poker` 双向切换。
- 现有测试从 11 个增加到 12 个，全部通过；扑克测试独立新增。

## 8. 持久化与统计

| 数据     | 存储键             | 规则                                       |
| -------- | ------------------ | ------------------------------------------ |
| 玩家筹码 | `wise21-balance`   | **与二十一点共用**；每次筹码变化立即写入   |
| 主题     | `wise21-theme`     | 复用现有                                   |
| 扑克统计 | 仅本次会话（内存） | 已玩手数、当前底池、本手输赢               |
| AI 筹码  | 不持久化           | 开局 1,000；归零后下一手更换新玩家，随机带入 1,000～5,000 |

> 共享钱包意味着手牌中刷新、切到二十一点或直接关闭页面都视为弃牌：已经投入底池的筹码不会退回。这与二十一点刷新后本局下注不退的行为一致。

## 9. 测试计划

### 9.1 纯函数

- `evaluate`：10 种牌型、轮子顺子、7 选 5、踢脚比较、完全平局。
- `buildPots`：三人不同筹码全下、死钱、未跟注退回、奇数筹码。
- `engine`：盲注与按钮轮转、翻牌前后行动顺序、单挑顺序、最小加注、全下、短全下、街推进、只剩一人、全下后自动发完公共牌、摊牌结算。

### 9.2 AI

- 只产生合法动作；金额不越界。
- 固定 RNG 下决策可复现。
- 不会读取对手底牌（通过接口设计保证，不传对手手牌）。

### 9.3 组件与集成（已完成）

- 行动条按钮随 `LegalActions` 正确切换（弃牌 / 过牌 / 跟注 / 下注 / 加注 / 全下）。
- 加注滑杆上下限、快捷比例与浮动面板。
- 摊牌后翻开剩余玩家底牌、显示中文牌型标签、赢家高亮。
- 移动端 390px 牌桌不重叠、行动条可见。
- 现有二十一点 12 个测试保持通过。

当前测试数量：**47 个**（二十一点/导航 12、引擎 13、牌型 8、边池 6、AI 4、扑克界面 3、牌桌高亮 1）。

## 10. 里程碑与状态

| 阶段 | 内容                                                      | 状态                                  |
| ---- | --------------------------------------------------------- | ------------------------------------- |
| M0   | 共享牌模块、共享钱包、路由与 App 壳、`BlackjackView` 迁移 | ✅ 已完成                             |
| M1   | 纯引擎：牌型评估、边池、下注状态机 + 单测                 | ✅ 已完成（13 + 8 + 6 个测试）        |
| M2   | 可玩 UI：牌桌、座位、行动条、规则弹窗、响应式             | ✅ 已完成                             |
| M3   | AI 性格与启发式决策、摊牌展示、共享钱包联动               | ✅ 已完成（4 个 AI 测试 + 40 手模拟） |
| M4a  | 键盘快捷键、最佳五张高亮、弹窗期间暂停 AI、发牌/赢家动画  | ✅ 已完成                             |
| M4b  | 音效、深度 a11y、移动端细节、可选蒙特卡洛 AI / 难度       | ⏳ 待做                               |

首版代码量约 2,000 行（含测试）；扑克路由为懒加载。

## 11. 风险与取舍

| 风险                    | 影响                 | 缓解                                    |
| ----------------------- | -------------------- | --------------------------------------- |
| 短全下 / 边池边界多     | 结算错误，玩家不信任 | 引擎纯函数 + 表驱动测试，先跑通异常用例 |
| AI 太笨或太慢           | 体验差               | 当前启发式；后续可加蒙特卡洛或难度档位  |
| 移动端牌桌拥挤          | 看不清牌             | 4-max；牌尺寸响应式；行动条固定底部     |
| 路由部署无 fallback     | `/poker` 404         | 部署配置或改用 hash 路由                |
| 重构 App 壳影响现有测试 | 回归风险             | M0 先迁移并跑通 21 点测试，再写扑克     |

## 12. 已确认与后续

已确认：4-max、共享钱包、WISE 牌室 + 游戏切换、短全下简化；M0–M4 核心项均已完成。

已在 M4a 完成：

1. 键盘快捷键（F / C / R / A / Esc）与按钮 `aria-keyshortcuts`。
2. 最佳五张高亮、赢家未使用牌降透明度、无人使用的公共牌降透明度。
3. 规则弹窗打开时暂停 AI 计时器，关闭后恢复。
4. 发牌动画与赢家光晕动画（尊重 `prefers-reduced-motion`）。

后续可选：

1. 摊牌筹码飞入动画与音效开关。
2. 更细的屏幕阅读器播报和焦点管理。
3. 蒙特卡洛 AI / 难度选择。
4. 手牌历史回放与牌局分享。
