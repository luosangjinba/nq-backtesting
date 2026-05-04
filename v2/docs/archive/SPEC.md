# NQ Futures 日内交易复盘系统 V2 — 规格文档

更新时间：2026-04-12

## 1. 项目背景

### 1.1 交易者画像

- 美股 NQ futures 日内交易者
- 使用 ICT (Inner Circle Trader) 方法论
- 只拿不超过 1 小时的单子
- 主要研究窗口：9:30-11:00 ET
- 有 fxreplay 会员订阅，用于图表复盘
- 手头有 2005 年至今的 NQ mini futures 1 分钟数据

### 1.2 ICT 核心概念（编程工具需要理解的术语）

- **PDA (Price Delivery Array)**：价格会在这些区域产生反应。细分为：
  - **Liquidity**：BSL (Buy Side Liquidity，明显高点上方) / SSL (Sell Side Liquidity，明显低点下方)
  - **FVG (Fair Value Gap)**：三根 K 线中间那根的实体造成的价格缺口，分看涨/看跌
  - **Order Block (OB)**：机构订单区块
  - **Breaker**：失败的 OB 转变而来
  - **Volume Imbalance (VI)**：相邻两根 K 线之间的价格缺口
  - **NWOG (New Week Opening Gap)**：周五 16:59 close → 周一 18:00 open 的缺口
  - **NDOG (New Day Opening Gap)**：当日 16:59 close → 18:00 open 的缺口
  - **Key Level**：前高、前低、equilibrium
  - **Discount / Premium**：相对于 dealing range 的位置

- **Dealing Range**：一个显著 swing high 和 swing low 构成的区间
  - Equilibrium = (high + low) / 2
  - 价格在 equilibrium 之上 = Premium（倾向下行）
  - 价格在 equilibrium 之下 = Discount（倾向上行）

- **结构循环**：ICT 认为价格遵循以下循环：
  - 突破前高 → 回撤内部 → 突破前高 → 回撤内部 → 跌破被保护低点 → 反弹内部 → 跌破前低 → 反弹内部 → 跌破前低...
  - 在大型 trending 中，这种结构在不同周期重复

- **Protected High / Protected Low**：当前结构中被保护的高/低点，被实体穿过并伴随 displacement 才算反转

- **FVG 规则**：FVG 一般是被尊重的（价格触及后折返），不尊重的情况是实体收盘超越 FVG

- **Internal vs External Liquidity**：
  - Internal = FVG（需要回填的缺口）
  - External = 旧高/旧低（流动性池）
  - 价格永远在两者之间做钟摆运动

### 1.3 交易时段定义（ET 时间）

| 时段 | 时间范围 | 说明 |
|------|----------|------|
| Asia | 18:00-01:59 | 亚洲时段 |
| London | 02:00-04:59 | 伦敦时段 |
| Pre-market | 05:00-09:30 | 盘前顶层时段 |
| NY Open | 09:30 | 纽约开盘，核心分水岭 |
| AM Session | 09:30-11:00 | 主要研究窗口 |
| PM Session | 11:00-16:00 | 下午 |

关键时间节点：9:30、9:50-10:10、10:30

补充说明：

- `Pre-market` 作为顶层时段保留完整区间 `05:00-09:30`
- 但在需要更细粒度研究时，再拆成两个子时段：
  - `transition`: `05:00-06:59`
  - `us_premarket`: `07:00-09:30`
- 设计原则：
  - 顶层 session 只保留 `Asia / London / Premarket`
  - `transition` 不再作为和顶层并列的独立 session，而是 `Premarket` 的子时段
  - 这样既保留研究价值，又避免 session 结构混乱

---

## 2. V1 系统回顾（已有资产）

### 2.1 已有基础设施

| 组件 | 路径 | 说明 |
|------|------|------|
| 1m 价格数据库 | `trading_data.duckdb` | NQ 1 分钟 OHLCV，2005 至今，约 590 万行 |
| 原始 CSV | `NQ_full_1min.csv` | 源数据 |
| 价格查询 API | `price_lookup_api.py` | FastAPI 服务，支持按日期/时间/周期查询 OHLC |
| 复盘 UI | `yaml_panel.html` | 浏览器端复盘面板，支持 YAML 导入导出、图片记录、价格回填 |
| DuckDB Schema | `duckdb_schema.sql` | `futures_1m` 表 |
| Windows 打包 | `windows_bundle/` | 便携版 |

### 2.2 已有 YAML 样本

- `NQ_2012-01-05 (1).yaml` — 完整的日度复盘记录样本
- `NQ_2012-01-09 (1).yaml` — 另一份样本
- `architect/htf_observation_smoke_test.yaml` — HTF 快照样本

### 2.3 已有设计文档

| 文档 | 路径 | 核心内容 |
|------|------|----------|
| PROJECT_PROFILE.md | `architect/` | 项目定义：以 9:29 为截面，9:30-10:30 为研究窗口 |
| PENDULUM_SPEC.md | `architect/` | HTF 结构状态机规格，独立于 daily journal |
| PENDULUM_SCHEMA.sql | `architect/` | Pendulum 的 DuckDB 表设计（snapshots/events/structure_points） |
| MEMO.md | `architect/` | 已完成和未完成功能清单 |
| about HTF Bias | `architect/done/` | HTF bias 量化方法讨论 |
| about pendulum | `architect/done/` | Pendulum 钟摆模型的起源讨论 |

### 2.4 V1 的问题（为什么要做 V2）

1. **按日期记录导致 HTF PDA 碎片化**：一个周线 FVG 可能活跃数周，但被割裂在每天的 YAML 里反复描述
2. **观察与预判混在一起**：客观记录和主观判断混在同一份 YAML 中，复盘时难以区分
3. **HTF bias 容易被主观带偏**：每天重新判断 HTF，容易"重写故事"
4. **Pendulum 与 daily journal 接口不清**：两套系统各做各的，没有明确的引用关系
5. **急于实现代码，没想清楚数据结构**

---

## 3. V2 系统架构

### 3.1 核心设计原则

1. **两层存储，各管各的生命周期**：PDA 是长期的，日度记录是短期的
2. **日度记录引用 PDA，不重复描述**
3. **观察与预判分离**：客观记录和主观判断用不同字段，方便事后验证
4. **尽可能量化，减少主观成分**
5. **时间优先**：关键点首先是"什么时间发生"，其次才是"什么价格"
6. **半自动化**：能算的让程序算，需要判断的留给人

### 3.2 整体数据流

```
第一层：PDA 登记簿（长生命周期，跨日）
  - 每个 PDA 一条记录
  - 从创建到失效全程跟踪
  - 存 DuckDB 或持续追加的文件
        │
        ▼
第二层：高周期结构状态（Pendulum，中等生命周期）
  - 结构 bias / protected levels / dealing range
  - 只在结构真正变化时更新
  - 引用第一层的 PDA
        │
        ▼
第三层：日度复盘记录（日生命周期，每天一份 YAML）
  - 930 前 session 观察
  - 引用第一层活跃 PDA + 第二层结构状态
  - 930 情景选择 + 预期
  - 930-1100 机会与结果
  - 事后验证
```

### 3.3 目录结构

```
backtesting/
  v2/
    schema/              # Schema 定义文件
    data/
      pda/               # PDA 登记簿数据
      structure/         # 高周期结构状态数据
      daily/             # 日度复盘 YAML（按年/月组织）
    scripts/             # 半自动化工具
    docs/                # 设计文档（本文件在此）
  architect/             # V1 文档，保留不动
  yaml_panel.html        # V1 UI，保留不动
  trading_data.duckdb    # 共用，1m 价格数据
  price_lookup_api.py    # 共用，价格查询 API
```

---

## 4. 第一层：PDA 登记簿

### 4.1 设计思路

第一层正式拆成两部分：

1. **PDA 静态登记簿**
   - 只记录：价格向前走时留下了什么 PDA
   - 例如：
     - 哪天形成了一个日线 FVG
     - 哪个 1H 高点成为 BSL
     - 哪个 NWOG / NDOG 诞生
   - 不记录后续什么时候被 tap、什么时候被 fill、什么时候失效

2. **PDA 事件流**
   - 单独记录后续动态行为
   - 例如：
     - `tapped`
     - `partially_filled`
     - `filled`
     - `invalidated`
     - `respected`

这样做的原因：

- `tap / invalidation` 是动态的，而且可能不止一次，硬塞回 PDA 主表会越来越别扭
- 静态登记簿更适合长期存在、被 daily 记录引用
- 事件流更适合记录时间不稳定、次数不确定的后续行为

### 4.2 PDA 静态登记簿 Schema

```yaml
# 每个 PDA 一条静态记录
pda:
  id: "pda_20120105_D_fvg_001"        # 唯一 ID
  instrument: NQ
  timeframe: D                         # W / D / 4H / 1H
  type: fvg                            # 枚举见下方
  direction: bullish                   # bullish / bearish；bsl / ssl 可留空
  
  # 价格边界 / 关键价格
  price: null                          # 供 bsl / ssl 使用
  price_high: 2350.00
  price_low: 2340.00
  price_ce: 2345.00

  # 形成与确认
  created_date: "2012-01-03"           # PDA 形成的日期
  created_time: ""                     # D / W 可留空
  verified_time: "2012-01-03"          # 某些 PDA 要等后续 K 线才确认
  anchor_time: "2012-01-03"            # 锚定的原始 K 线时间（可选）
  origin_start_date: ""                # 供 OB 这类区间型 PDA 使用
  origin_end_date: ""
  
  # 轻量快照状态
  registry_status: active              # active / archived
  
  # 备注
  note: ""
```

### 4.3 PDA 事件流 Schema

```yaml
event:
  id: "event_20120105_D_fvg_001"
  pda_id: "pda_20120103_D_fvg_001"     # 引用静态登记簿
  instrument: NQ
  timeframe: D

  event_type: tapped                   # 见枚举
  event_date: "2012-01-05"
  event_time: "08:42"
  event_price: 2344.50

  reaction: reversal                   # reversal / continuation / no_reaction / unknown
  fill_ratio: 0.0                      # 仅属于动态事件，不回写静态主表
  invalidation_reason: ""

  note: ""
```

### 4.4 PDA type 枚举

| type | 说明 |
|------|------|
| `bsl` | Buy Side Liquidity（明显高点上方的流动性） |
| `ssl` | Sell Side Liquidity（明显低点下方的流动性） |
| `fvg` | Fair Value Gap |
| `ob` | Order Block |
| `breaker` | Breaker Block |
| `vi` | Volume Imbalance |
| `nwog` | New Week Opening Gap |
| `ndog` | New Day Opening Gap |

### 4.5 BSL / SSL 候选点识别规则（当前试行版）

`bsl / ssl` 的第一步不是直接“凭感觉找点”，而是先按分周期的候选识别规则去筛。

设计原则：

- 越低周期，噪音越大，需要更多左右确认 K 线
- 日线不能太细，否则干扰点过多；也不能太粗，否则会漏掉重要极值
- 因此当前不采用全周期统一规则，而采用“分周期”试行规则

当前建议：

| timeframe | left bars | right bars | 用途 |
|-----------|-----------|------------|------|
| `D` | 1 | 2 | 日线候选高低点，先取折中方案 |
| `4H` | 2 | 2 | 4H 候选高低点 |
| `1H` | 3 | 3 | 1H 候选高低点，增强确认 |

判定方式：

- `candidate_high`
  - 当前 K 线的 `high` 高于左侧 `N` 根的 `high`
  - 且高于右侧 `M` 根的 `high`
- `candidate_low`
  - 当前 K 线的 `low` 低于左侧 `N` 根的 `low`
  - 且低于右侧 `M` 根的 `low`

其中：

- `D` 使用 `left=1, right=2`
- `4H` 使用 `left=2, right=2`
- `1H` 使用 `left=3, right=3`

说明：

- 这条规则当前只定义“候选点识别”
- 不等于该点已经自动成为最终有效 `bsl / ssl`
- 最终是否登记进 PDA 静态表，仍允许人工二次筛选
- 后续如果样本积累后发现某一周期不顺，可单独微调，不影响其他周期
| `key_level` | 关键价位（前高前低、equilibrium 等） |
| `eqh` | Equal Highs |
| `eql` | Equal Lows |

### 4.5 PDA event_type 枚举

| event_type | 说明 |
|------------|------|
| `tapped` | 首次或再次触碰 PDA |
| `partially_filled` | 部分回补 / 部分填充 |
| `filled` | 完整回补 / 完整填充 |
| `invalidated` | PDA 失效 |
| `respected` | 触碰后被尊重并折返 |
| `ignored` | 触碰后几乎无反应 |

### 4.6 统计维度（数据积累后可做的分析）

- 按 timeframe 分：各周期 PDA 的 tap 率、折返成功率
- 按 type 分：FVG vs OB vs Liquidity 的有效性对比
- FVG 被尊重次数 vs 被穿越次数（按周期分）
- 被穿越时是否伴随 displacement
- 穿越后是否回踩变 breaker
- 各 type PDA 的平均存活时间
- 日线及以上 PDA tap 后的折返空间（是否足够日内交易者获利）

---

## 5. 第二层：高周期结构状态（Pendulum）

### 5.1 设计思路

延续 V1 的 Pendulum 概念，但简化。
只在结构真正变化时更新，不是每天重写。
输出 structural bias，供日度记录引用。

### 5.2 结构状态 Schema

```yaml
instrument: NQ
timeframe: 1H                          # 支持 W / D / 4H / 1H
last_updated: "2012-01-05 09:00"

state:
  structural_bias: bullish              # bullish / bearish / range / neutral
  structure_status: intact              # intact / testing_break / broken
  phase: trend                          # trend / range / transition / post_break
  confirmation_state: confirmed         # confirmed / awaiting_confirmation / failed_confirmation

protected_levels:
  protected_high: 2350.00
  protected_high_time: "2012-01-03 14:00"
  protected_low: 2280.00
  protected_low_time: "2012-01-02 10:00"

active_range:
  high: 2350.00
  low: 2280.00

last_break:
  side: none                            # high / low / none
  time: ""
  price: null

break_assessment:
  status: undecided                     # continuation / reversal / false_break / undecided
  note: ""

structure_points:
  - type: HH                            # HH / HL / LH / LL
    time: "2012-01-03 14:00"
    price: 2350.00
  - type: HL
    time: "2012-01-02 10:00"
    price: 2280.00

judgement:
  confidence: medium                    # high / medium / low
  reasoning: "HH/HL 结构完整，protected low 未被触及"

# 引用当前活跃的 HTF PDA
active_pda_refs:
  - "pda_20120103_D_fvg_001"
  - "pda_20120102_W_ssl_001"
```

### 5.3 枚举汇总

| 字段 | 可选值 |
|------|--------|
| structural_bias | `bullish` / `bearish` / `range` / `neutral` |
| structure_status | `intact` / `testing_break` / `broken` |
| phase | `trend` / `range` / `transition` / `post_break` |
| confirmation_state | `confirmed` / `awaiting_confirmation` / `failed_confirmation` / `not_applicable` |
| break_assessment.status | `continuation` / `reversal` / `false_break` / `undecided` |
| structure_points.type | `HH` / `HL` / `LH` / `LL` |

---

## 6. 第三层：日度复盘记录

### 6.1 设计思路

每天一份 YAML。
不再重复描述 HTF PDA 细节，只引用第一层 PDA id 和第二层结构状态。
按时间顺序分区块：盘前 → 930 预判 → 930-1100 记录 → 事后验证。

### 6.2 日度记录 Schema

```yaml
date: "2012-01-05"
instrument: NQ

# ─── 红色文件夹新闻 ───
red_folder_news:
  - event: "Claims"
    time: "08:30"

# ─── 高周期引用（从第二层拉取，不手动重写） ───
htf_refs:
  - timeframe: W
    structural_bias: bullish
    phase: trend
    source: "pendulum_W_20120105.yaml"     # 引用第二层文件
  - timeframe: D
    structural_bias: bullish
    phase: transition
    source: "pendulum_D_20120105.yaml"
  - timeframe: 4H
    structural_bias: bearish
    phase: post_break
    source: "pendulum_4H_20120105.yaml"
  - timeframe: 1H
    structural_bias: bullish
    phase: trend
    source: "pendulum_1H_20120105.yaml"

# 当日活跃 PDA（引用第一层 id）
active_pdas_today:
  - id: "pda_20120103_D_fvg_001"
    relevance: "日线看涨 FVG，价格从上方回撤可能 tap"
  - id: "pda_20120104_4H_bsl_001"
    relevance: "4H BSL 未被扫，上方目标"

# ─── 盘前 Session 观察（客观记录，930 之前已发生的事实） ───
sessions:
  asia:
    direction: bullish                     # bullish / bearish / sideways
    range_high: 2325.00
    range_low: 2310.00
    htf_context_note: "在日线 discount 区域内小幅上行"
    pdas_created: []                       # 如果留下了新 PDA，引用 id
    pdas_tapped: []                        # 如果 tap 了某个 PDA，引用 id
  
  london:
    direction: bearish
    range_high: 2330.00
    range_low: 2305.00
    htf_context_note: "sweep 了 Asia high 后回落"
    pdas_created: []
    pdas_tapped: []
  
  premarket:
    direction: bullish
    range_high: 2335.00
    range_low: 2308.00
    htf_context_note: "反弹回到 LDN 高点附近"
    pdas_created: []
    pdas_tapped: []
    sub_sessions:
      transition:
        direction: bearish
        range_high: 2322.00
        range_low: 2308.00
        note: "05:00-06:59 先回落，承接伦敦尾声的弱势。"
      us_premarket:
        direction: bullish
        range_high: 2335.00
        range_low: 2314.00
        note: "07:00-09:30 再次反弹，回到 LDN 高点附近。"

# 930 开盘时的价格快照
open_snapshot:
  price_at_929: 2321.00
  orr_high: null                           # Opening Range 高点（如果已形成）
  orr_low: null
  premium_discount: discount               # 相对于当日关键 dealing range
  position_pct: 35                         # 在 dealing range 中的百分位

# ─── 930 预判（主观判断，事后验证） ───
pre_930_expectation:
  # 三种情景选一个
  scenario: 1
  # 1 = 大方向没走完，Judas 之后继续
  # 2 = 回撤方向快走完/刚走完，要走主方向
  # 3 = 大方向 target 即将到位，空间不大，等回撤
  
  expected_direction: bullish              # bullish / bearish / neutral
  reasoning: "D bias bullish, 价格在 discount, LDN sweep 后反弹, 预期 930 Judas 下扫后继续上行"
  target_pda_ref: "pda_20120104_4H_bsl_001"   # 预期目标 PDA
  invalidation: "跌破 2305 (LDN low) 并伴随 displacement"
  
  # 事后填写
  actual_outcome: ""                       # correct / partially_correct / wrong / did_not_play_today
  outcome_note: ""

# ─── 930-1100 精细机会记录 ───
opportunities:
  - id: "opp_001"
    time_window: "930"                     # 930 / 950-1010 / 1030
    time: "09:32"
    type: judas_swing                      # judas_swing / macro_950 / silver_bullet_1000 / silver_bullet_1030 / other
    direction: bearish                     # Judas 方向（假动作）
    pda_ref: ""                            # 触及的 PDA
    structure_note: "930 开盘后先下扫 PM low"
    
    # 如果基于此机会入场了
    entry:
      entered: true
      entry_time: "09:35"
      entry_price: 2318.00
      stop_price: 2310.00
      based_on: "judas_swing_immediately_930"
      target_internal: 2325.00
      target_swing: 2335.00
      target_external: 2350.00
      
      # 结果
      exit_time: "10:05"
      exit_price: 2328.00
      exit_type: target_internal           # target_internal / target_swing / target_external / stop / breakeven / manual
      mae: -3.00                           # Maximum Adverse Excursion (点数)
      mfe: 12.00                           # Maximum Favorable Excursion (点数)
      pnl_points: 10.00
      
      positive_factors:
        - "顺 HTF bias"
        - "在 discount 入场"
      negative_factors:
        - "volume 偏低"
      
      # 如果拿到 swing target 会怎样
      alternative_exit_swing_pnl: 17.00
    
    # 如果没入场
    skip_reason: ""                        # 不符合条件 / 犹豫 / 已有持仓 / 其他

# ─── Reversals 记录（930-1100 期间的反转点，不管是否入场） ───
reversals:
  - id: "rev_001"
    time: "09:32"
    price: 2315.00
    direction: bullish                     # 反转后的方向
    shape: normal                          # v_shape / normal / immediate_rebalance
    pda_trigger: "pda_20120103_D_fvg_001"  # 引起反转的 PDA
    session: ny_am
    tradeable: true
    skip_reason: ""
    reached_internal: true
    reached_internal_time: "09:50"
    reached_swing: true
    reached_swing_time: "10:20"
    note: ""

# ─── 事后总结 ───
daily_review:
  htf_bias_accuracy: correct               # correct / wrong / mixed
  session_read_accuracy: correct            # 盘前 session 分析是否准确
  scenario_accuracy: correct               # 930 情景判断是否准确
  best_opportunity: "opp_001"              # 当天最好的机会
  missed_opportunity: ""                   # 错过的机会
  lessons: ""                              # 今天学到了什么
  note: ""
```

---

## 7. 半自动化需求

### 7.1 可自动计算的部分（从 1m 数据）

以下字段可以通过程序从 DuckDB 中的 1m 数据自动计算：

| 可计算项 | 数据来源 | 说明 |
|----------|----------|------|
| Swing High / Swing Low | 1m/5m/15m/1H/4H/D/W OHLC | 识别显著高低点 |
| FVG | 连续三根 K 线 | 第一根 high < 第三根 low（或反之） |
| Volume Imbalance | 相邻两根 K 线 | 前一根 close ≠ 后一根 open 的缺口 |
| NWOG / NDOG | 特定时间点价格 | 16:59 close vs 18:00 open |
| Premium / Discount / Position % | Dealing range + 当前价格 | 纯算术 |
| Equilibrium | (range_high + range_low) / 2 | 纯算术 |
| Session 区间 (Asia / London / Premarket) | 按时间段切割 1m 数据 | range_high / range_low |
| Premarket 子时段 (transition / us_premarket) | 按 05:00-06:59 与 07:00-09:30 继续切割 | 用于更细粒度研究 |
| MAE / MFE | 入场后的 1m 数据 | 最大逆向/顺向偏移 |
| EQH / EQL | 相近价位的多个高点/低点 | 差值在阈值内 |

### 7.2 需要人工输入的部分

| 需人工项 | 说明 |
|----------|------|
| 选择哪个 Dealing Range | 半量化：人选 swing high/low 的日期，程序算价格 |
| Structural bias 判断 | 基于结构点序列，人确认 |
| PDA 的"有意义"筛选 | 程序可以扫出所有 FVG，但哪些"值得关注"需要人判断 |
| 930 情景选择 | 三选一，人做 |
| 预期方向和目标 | 人做 |
| 反转点标注 | 人标注，程序可辅助定位时间 |
| 入场决策 | 人做 |
| 事后评价 | 人做 |

### 7.3 工具需求优先级

| 优先级 | 工具 | 说明 |
|--------|------|------|
| P0 | PDA 扫描器 | 给定 timeframe 和日期范围，自动扫出所有 FVG / VI / EQH / EQL / NWOG / NDOG |
| P0 | PDA 状态更新器 | 检查已登记的 active PDA 是否被 tap / 穿越 / 失效 |
| P1 | Session 切割器 | 自动计算 Asia / London / Premarket 的 range，并支持 Premarket 子时段切割 |
| P1 | 价格快照工具 | 给定日期，自动填充 open_snapshot 相关字段 |
| P2 | 结构点识别器 | 辅助识别 HH / HL / LH / LL 序列 |
| P2 | 日度 YAML 模板生成器 | 给定日期，自动生成预填好可计算字段的 YAML 模板 |
| P3 | 统计分析脚本 | 批量解析 YAML，输出各类概率统计 |
| P3 | ML 数据导出器 | 将结构化数据导出为 DataFrame 供 ML 使用 |

---

## 8. 已有技术栈

| 组件 | 版本/说明 |
|------|-----------|
| DuckDB | 已安装，含 `futures_1m` 表 |
| Python | 3.11+ |
| FastAPI | 价格查询 API 已在用 |
| 前端 | 纯 HTML + React + Tailwind（yaml_panel.html 方案） |
| YAML | PyYAML / ruamel.yaml |
| 数据 | NQ 1m OHLCV，2005 至今 |

### 8.1 DuckDB 现有表

```sql
create table if not exists futures_1m (
  instrument varchar not null,
  ts timestamp not null,
  open double not null,
  high double not null,
  low double not null,
  close double not null,
  volume bigint
);
```

### 8.2 Pendulum 已设计的表（V1，可参考）

```sql
-- 结构快照
create table pendulum_snapshots (
  snapshot_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  snapshot_ts timestamp not null,
  structural_bias varchar not null,
  structure_status varchar not null,
  phase varchar not null,
  confirmation_state varchar not null,
  protected_high double,
  protected_high_ts timestamp,
  protected_low double,
  protected_low_ts timestamp,
  active_range_high double,
  active_range_low double,
  last_break_side varchar,
  last_break_ts timestamp,
  last_break_price double,
  break_assessment_status varchar,
  break_assessment_note varchar,
  judgement_confidence varchar,
  judgement_reasoning varchar,
  is_current boolean not null default false,
  created_at timestamp not null default current_timestamp
);

-- 结构事件
create table pendulum_events (
  event_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  event_ts timestamp not null,
  snapshot_id varchar,
  event_type varchar not null,
  event_side varchar,
  price double,
  reference_ts timestamp,
  old_value varchar,
  new_value varchar,
  note varchar,
  created_at timestamp not null default current_timestamp
);

-- 结构点
create table pendulum_structure_points (
  point_id varchar primary key,
  instrument varchar not null,
  timeframe varchar not null,
  snapshot_id varchar,
  point_type varchar not null,
  point_ts timestamp not null,
  price double not null,
  is_protected boolean not null default false,
  is_active boolean not null default true,
  note varchar,
  created_at timestamp not null default current_timestamp
);
```

---

## 9. 实施建议

### 9.1 V2 第一阶段范围（V2.0）

第一阶段只做“能开始积累有效数据”的最小闭环，不追求全功能。

#### 第一阶段包含

1. **第一层 PDA 登记簿的最小版本**
   - 先支持以下 `type`：
     - `fvg`
     - `ob`
     - `bsl`
     - `ssl`
     - `nwog`
     - `ndog`
   - 先支持以下生命周期字段：
     - `created_date`
     - `status`
     - `tap_date`
     - `tap_reaction`
     - `invalidation_date`
     - `invalidation_reason`

2. **第二层 Pendulum 的最小版本**
   - 先只做：
     - `1H`
     - `4H`
   - 先只保留：
     - `structural_bias`
     - `phase`
     - `protected_high / low`
     - `active_range`
     - `active_pda_refs`

3. **第三层日度记录的最小版本**
   - 先做：
     - `htf_refs`
     - `active_pdas_today`
     - `sessions`
     - `open_snapshot`
     - `pre_930_expectation`
     - `opportunities`

4. **第一批工具**
   - `PDA 扫描器`
   - `PDA 状态更新器`
   - `Session 切割器`
   - `价格快照工具`

#### 第一阶段目标

- 能把某一天之前已经存在的高周期 PDA 记录下来
- 能在日度 YAML 里只“引用”这些 PDA，而不是重复描述
- 能在 `9:29` 前得到足够稳定的 snapshot，供后续归因
- 能开始积累样本，而不是继续停留在 schema 讨论

### 9.2 暂缓项（不进入 V2.0）

以下内容明确暂缓，避免第一阶段再次失焦：

- `breaker`
- `vi`
- `eqh / eql`
- `key_level` 的完整体系
- `W / D` 的完整 Pendulum 状态机
- `confirmation_state` 的复杂分支
- `break_assessment.note` 的细化
- `reversals` 的完整细粒度记录
- `alternative_exit_swing_pnl`
- `统计分析脚本`
- `ML 数据导出器`
- 大型 UI 工程

原则：

- **先让数据流动起来，再追求完整**
- **先做最常用、最客观、最容易标准化的对象**

### 9.3 第一批文件（建议直接建立）

```text
v2/
  schema/
    pda_registry.sql
    pendulum_minimal.sql
  data/
    pda/
    structure/
    daily/
  scripts/
    scan_pdas.py
    update_pda_status.py
    build_session_ranges.py
    build_daily_snapshot.py
  docs/
    SPEC.md
```

建议含义：

- `pda_registry.sql`
  - 第一层最小表结构
- `pendulum_minimal.sql`
  - 只覆盖 `1H / 4H` 的最小结构状态表
- `scan_pdas.py`
  - 从 `futures_1m` 扫出第一批 PDA
- `update_pda_status.py`
  - 更新 `active -> tapped / invalidated`
- `build_session_ranges.py`
  - 自动切出 `Asia / London / Premarket(+sub_sessions)`
- `build_daily_snapshot.py`
  - 给定日期，预填第三层日度记录里可计算的部分

### 9.4 推进顺序

1. **先建 PDA 登记簿的存储**（DuckDB 表或 YAML 文件）
2. **写 PDA 扫描器**：从 1m 数据自动扫出 FVG / VI / NWOG / NDOG
3. **选 3-5 个历史交易日手工填一遍**：验证 schema 够不够用
4. **写 PDA 状态更新器**：自动检测 active PDA 是否被 tap
5. **搞定日度 YAML 模板生成器**：自动预填可计算字段
6. **完善半自动化复盘流程**：人只需要填主观判断部分
7. **积累数据后做统计 / ML**

### 9.5 关键约束

- **不要过早做 UI**：先用 YAML + 命令行工具跑通流程
- **不要精细到每一根 K 线**：只记录"明确在 PDA 处反转的"和"方向可预期的"
- **Schema 可以迭代**：先跑通最小版本，再根据实际复盘体验增补字段
- **保留 V1**：V1 的 yaml_panel.html 和已有 YAML 不删不改，V2 在 `v2/` 子目录独立发展

### 9.6 工作目录

```
/home/leo/myworkspace/trading/backtesting/v2/
```

V2 的所有新代码、schema、数据都在这个目录下。
共用的 `trading_data.duckdb` 和 `price_lookup_api.py` 在父目录。
