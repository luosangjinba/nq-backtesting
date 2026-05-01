# Implementation Memo

这个文件用于记录：
- 已讨论并确认方向，但暂未实现的功能
- 已部分实现，但还没做完整的功能
- 后续开发时容易遗漏的“坑”

更新时间：2026-04-10

## 当前已完成的大项

- `session_bias + htf_context + alignment` 第一版
  - 已在 `Bias Context` 区块落地
  - 已支持 YAML 导入/导出
- `HTF Context` 第二版
  - 已落地：
    - `dealing_range.timeframe`
    - `swing_high_date / swing_low_date`
    - `reference_price`
    - `equilibrium / position_pct / premium_discount`
    - `liquidity_above / liquidity_below`
    - `nearest_draw / nearest_draw_target`
    - `bias_confidence / narrative`
    - `invalidation`
  - `reference_price` 已固定为 `Today 09:29 close`
  - `swing_high / swing_low` 已改为通过日期自动计算
  - 已增加 dealing range 校验：
    - 区间内 `max(high)` 必须等于 `swing_high`
    - 区间内 `min(low)` 必须等于 `swing_low`
- `reversal.tradeable + skip_reason`
  - 已落地
- `统一以 swing 为研究基准` 第一版
  - 已落地：
    - `internal_reached`
    - `internal_reached_time`
    - `swing_reached`
    - `swing_reached_time`
    - `swing_review_note`

## 当前主线工程

### 2026-04-14 方向收口：快速研究优先

最新讨论后，V2 当前定位进一步收口为：

- **优先做快速研究，不优先做伪实盘训练**
- `God Eye View` 用于研究是合理的
- `Pseudo-live` 以后可作为独立训练支线，不并入当前 V2 主流程

这意味着：

- 第一层 `PDA Registry` 要服务于大样本快速扫描
- 第二层重点是 `Structure Path`
- 第三层 `Daily Journal` 只保留研究所需的轻量记录，不去重建逐根 K 线训练过程

第一层当前正式原则：

- **纯机械**
- **不过滤**
- **不同周期不去重**
- **不在第一层判断“这个点到底重不重要”**

当前已落地：

- `v2/schema/pda_registry.sql`
- `v2/schema/pda_events.sql`
- `v2/scripts/scan_layer1_pda.py`

当前脚本已支持的第一层扫描：

- `swing_high`
- `swing_low`
- `bsl_candidate`
- `ssl_candidate`
- `fvg`
- `vi`

当前仍待补充到程序层：

- `nwog`
- `ndog`
- `ce_candidate`

### Pendulum 独立结构引擎

当前共识：

- 现有 daily 系统中的 `HTF bias` 判断仍然粗糙，容易被主观带偏
- 接下来现阶段的主线，不再继续堆旧 `bias` 系统，而是优先实现独立的 `pendulum` 工程
- `pendulum` 不属于 daily journal 主表单，它是上游结构状态机
- `pendulum` 的生命周期是连续的、长时间跨度的，因此主存储应优先考虑数据库，而不是单个 YAML/JSON 文件

目标：

- 用半机械化方式维护 HTF 结构状态
- 输出更稳定的 `structural bias`
- 后续由 daily 系统引用 pendulum 当前状态，而不是每天重新主观判断 HTF bias

相关文档：

- [PENDULUM_SPEC.md](/home/leo/myworkspace/trading/backtesting/architect/PENDULUM_SPEC.md)
- [PENDULUM_SCHEMA.sql](/home/leo/myworkspace/trading/backtesting/architect/PENDULUM_SCHEMA.sql)
- [pendulum-point-skill-v1/SKILL.md](/home/leo/myworkspace/trading/backtesting/architect/pendulum-point-skill-v1/SKILL.md)

当前 pendulum point 方向收敛到：

- 先用全局规则识别 `candidate point`
  - 当前默认：`pivot_strength = 3`
  - high: 左右两侧各连续 3 根 K 线的 `high` 都低于它
  - low: 左右两侧各连续 3 根 K 线的 `low` 都高于它
- `daily_points` / `h1_points` 只记录已经通过 candidate rule 的点
- `pending_condition` 不再推荐长期使用纯自然语言
  - 第一版建议拆成：
    - `pending_condition_type`
    - `pending_condition_detail`
  - 当前收敛为：
    - `pending_condition_type` 固定为 `opposite_3bar_confirm`
    - `pending_condition_detail` 改为多选 PDA 理由
  - 当前建议多选：
    - `1D FVG`
    - `1W FVG`
    - `1D OB`
    - `1W OB`
  - 后续如果寻找 PDA 的流程固定下来，`pending_condition_detail` 可以从抽象理由升级成直接引用具体 FVG / OB
- `verification_reason` 也同步收敛为轻结构化
  - 第一版建议拆成：
    - `verification_reason_type`
    - `verification_reason_detail`
  - 当前建议枚举：
    - `touch_equilibrium`
    - `touch_ote`
    - `bos`
    - `protected_level_confirmed`
    - `other`
- 已增加 `bias_yaml_maker` 的第一版扫描助手思路
  - 先只处理 `daily`
  - 输入起止日期
  - 通过 `/htf_bars` 拉取日线 bars
  - 用全局 `pivot_strength=3` 规则自动逐 bar 找下一个 candidate point
  - 命中后停下，由人工决定：
    - 记为 `swing high`
    - 记为 `swing low`
    - 或跳过继续
  - 这样先把“机械识别候选点 + 人工确认是否录入”跑通，再考虑更深自动化
- pendulum 下一步方向已明确
  - 在点找齐之后，下一阶段不是先判 bias
  - 而是先把这些点连成行情段
  - 主要从：
    - `internal -> external`
    - `external -> internal`
    的视角去记录每个行情段“干了什么”
  - 这样 pendulum 结构会更明显，也更容易判断当前价格所处阶段及其大概率行为
- 候选高低点识别规则，先按“分周期”处理，不全局一刀切
  - 当前建议：
    - `D`: `left=1, right=2`
    - `4H`: `left=2, right=2`
    - `1H`: `left=3, right=3`
  - 解释：
    - `D` 需要在“不过细”和“不漏点”之间折中，先试 `左1右2`
    - `4H / 1H` 噪音更大，需要更强确认
  - 这条规则当前先作为：
    - `bsl / ssl` 候选点识别标准
    - 以及 pendulum point 的初始候选识别标准
  - 后续如果样本证明不顺，再按周期单独微调

## 明确未完成的坑

### 1. Swing 研究基准的第 4 条未做

这是之前已经排过优先级、但还没有实现的部分：

- `mae_time`
- `mfe_time`
- `beyond_swing`
- `retracement_after_internal`

说明：
- 这 4 项属于“统一以 swing 为研究基准”的增强层
- 当前系统只实现了到达状态和回顾备注
- 还没有把价格路径细节结构化下来

建议后续顺序：
1. `mae_time`
2. `mfe_time`
3. `beyond_swing`
4. `retracement_after_internal`

### 2. 旧 HTF Bias 系统应停止继续扩张

现阶段共识：

- 原系统中的 `HTF bias` 作为过渡版本保留兼容
- 但不再作为主研究方向继续扩字段
- 新的结构判断主线转向 `pendulum`

因此：

- 不再继续围绕旧 `bias` 系统做大规模增强
- 旧系统只保留 daily 引用层所需的最低兼容能力
- 新研究优先投入到独立的 `pendulum` 结构引擎

### 3. Pendulum 工程待实现

建议拆成 3 个阶段：

#### Phase 1. 数据模型与存储

优先目标：

- 确定 pendulum 的数据库表结构
- 不先做 UI
- 先能稳定保存：
  - 当前结构状态
  - 结构事件流
  - 关键结构点

建议主存储：

- `DuckDB`

建议保留：

- `YAML/JSON` 只作为样例、快照、导出格式

#### Phase 2. 结构判定流程

核心：

- protected high / protected low
- range 内部波动不改结构
- break 之后再评估 continuation / reversal / false_break
- 输出 `structural_bias / phase / confirmation_state`

补充共识（2026-04-13）：

- 第二层的重点，不再先做抽象 `bias` 判断器
- 而是优先做：
  - `关键反转点`
  - `结构路径（structure path）`
  - `延续 / 不延续`
  - `低周期确认`
- 方法论改为：
  - 先记录事实，不先做预期
  - 让“预期”从足够多的复盘统计中长出来
- 第二层新的主线文档：
  - [STRUCTURE_PATH_SPEC.md](/home/leo/myworkspace/trading/backtesting/v2/docs/STRUCTURE_PATH_SPEC.md)
- 当前理解：
  - `4H / 1D / 1W` PDA 主要提供高质量反应区
  - 真正是否转向，要依赖更低周期的结构确认
  - 系统目标不是精确抓高周期顶底，而是识别“价格接下来大概率去哪儿”

#### Phase 3. 融合进 daily system

融合原则：

- daily 系统不维护 pendulum 本体
- daily 只引用 pendulum 当前结论
- daily 中原有 `htf_context` 改成“消费上游 pendulum 结果”的薄层

建议 daily 融合字段：

```yaml
htf_context:
  pendulum_ref:
    source_timeframe: 1h
    pendulum_snapshot_id: "..."
    structural_bias: bullish
    phase: transition
    confirmation_state: awaiting_confirmation
    protected_high: 24420.0
    protected_low: 23450.0
    active_range_high: 24420.0
    active_range_low: 23450.0
```

说明：

- daily 保留 `session_bias`
- daily 仍可保留 `dealing_range / premium_discount / nearest_draw`
- 但主导 HTF 方向判断的上游，改为 `pendulum`

#### Pendulum 第一版建议字段

建议最小可落地字段：

```yaml
instrument: NQ
timeframe: 1h

state:
  structural_bias: bullish
  structure_status: intact
  phase: transition
  confirmation_state: awaiting_confirmation

protected_levels:
  protected_high: 24420.0
  protected_high_time: "2026-04-03 14:00"
  protected_low: 23450.0
  protected_low_time: "2026-04-02 13:00"

active_range:
  high: 24420.0
  low: 23450.0

last_break:
  side: none
  time: ""
  price: ""

break_assessment:
  status: undecided
  note: ""

judgement:
  confidence: medium
  reasoning: ""
```

建议数据库拆分时至少有 3 类实体：

- `pendulum_snapshots`
- `pendulum_events`
- `pendulum_structure_points`

第一版 schema 已起草，后续实现以 `PENDULUM_SCHEMA.sql` 为准。

### 4. HTF Context 仍有剩余坑

当前还没做完的主要是：
- `bias_updates[]`
- `sweep / break` 的量化研究字段
- 更自动化的 `narrative` / `nearest_draw` 推断

说明：
- `HTF Context` 的主体结构已经不是轻量版
- 当前剩下的是增强层和研究层，不是基础录入层

#### HTF bias 下一阶段建议的最终字段

建议最终目标结构：

```yaml
htf_context:
  dealing_range:
    timeframe: daily
    swing_high: 2398.5
    swing_high_date: "2012-01-03"
    swing_low: 2310.0
    swing_low_date: "2011-12-28"
    reference_price: 2371.0

  equilibrium: 2354.25
  position_pct: 68.7
  premium_discount: premium

  liquidity_above:
    - price: 2398.5
      type: swing_high
      date: "2012-01-03"
      note: "未扫日线高点"

  liquidity_below:
    - price: 2310.0
      type: swing_low
      date: "2011-12-28"
      note: ""

  nearest_draw: above
  nearest_draw_target: 2398.5

  bias: bearish
  bias_confidence: medium
  narrative: sweep_then_reverse
  reasoning: "价格位于 premium 区，但上方有明显日线 liquidity，预期先扫后反。"

  invalidation:
    - condition: "扫完 2398.5 后 30 分钟内无 bearish MSS"
      implication: "sweep_then_reverse 叙事失效"
    - condition: "日线收盘 > 2398.5"
      implication: "dealing range 失效"

  images: []
```

#### HTF bias 建议实施顺序

1. 增加 `bias_updates`
2. 增加 `sweep / break` 量化字段
3. 评估是否需要自动提示 `nearest_draw / narrative`

说明：
- 第一阶段“盘前快照结构化”已经完成
- 下一阶段重点转向研究增强，而不是再补基础表单

### 5. Bias Update 日志还没做

已讨论过的结构：
- `bias_updates[]`

当前未实现原因：
- 第一阶段先保留“盘前快照”
- 先把静态 HTF context 做稳定

后续再加：
- `timestamp`
- `trigger`
- `old_bias`
- `new_bias`
- `action_taken`
- `note`

### 6. Sweep vs Break 的量化判断还没落地

目前只是研究结论，还没进入页面或 YAML：

- `daily_close_side`
- `next_daily_close_side`
- `penetration_atr_pct`
- `body_beyond_pct`
- `wick_ratio`
- `sweep_break_assessment`

这块建议不要急着做 UI，优先作为研究规格保留。

### 7. HTF Structural Bias 方案已确认，但暂不实现

已确认这套逻辑适合作为 `HTF bias` 的一个判断层：

- `bullish structure`
  - 只要 `protected low` 没被有效跌破，bullish 结构不变
- `bearish structure`
  - 只要 `protected high` 没被有效突破，bearish 结构不变
- 在结构内部的 range 波动
  - 仍视为当前结构内波动
  - 直到 range 一侧被突破，才进入下一步判断
- range 被突破后
  - 再判断是 `continuation`、`reversal` 还是 `false_break`

建议未来落地为 `htf_context.structure_state`：

```yaml
htf_context:
  structure_state:
    structural_bias: bullish
    structure_status: intact
    dealing_state: trend

    protected_high: 2398.5
    protected_high_date: "2012-01-03"
    protected_low: 2310.0
    protected_low_date: "2011-12-28"

    current_range_high: 2376.25
    current_range_low: 2348.5

    last_break_side: none
    break_assessment: undecided
    reasoning: "日线仍是 HH/HL，protected low 未破，当前只是在结构内震荡。"
```

建议最小实现集：
- `structural_bias`
- `structure_status`
- `protected_high`
- `protected_high_date`
- `protected_low`
- `protected_low_date`
- `dealing_state`
- `reasoning`

说明：
- 这套结构不替代现有 `premium/discount`
- 它回答的是“结构有没有变”
- 现有 `dealing_range + premium/discount + nearest_draw` 继续保留

### 8. Entry 目标结构还没重构

讨论过的理想结构：

```yaml
targets:
  internal:
  swing:
  external:
```

当前仍然是旧结构：
- `target_internal`
- `target_swing`
- `target_external`

说明：
- 目前旧结构可用
- 不影响研究
- 但后续如果要继续做 `beyond_swing` 或 BE 模拟，重构成 `targets` 会更干净

## 建议中的下一步优先级

### 推荐优先做

1. 实现 `pendulum` 数据模型与存储
2. 实现 `pendulum` 最小状态机
3. 设计 pendulum 如何引用进 daily system

### 可以后做

1. `mae_time / mfe_time`
2. `beyond_swing`
3. `retracement_after_internal`
4. `targets` 结构重构

### 暂不建议做

1. 主题系统
2. Sweep/Break 全量量化 UI
3. 继续扩张旧版 `HTF bias` 表单

## 维护规则

后续每次出现以下情况，都更新这份文件：
- 已讨论并确认方向，但没有马上实现
- 已实现一半，剩余部分决定后做
- 发现旧需求有“口头确认过，但代码没跟上”
- 每一次重大改变
- 每一个当前还比较天马行空、但可能演化成正式方向的想法
## 2026-04-11 - HTF Observation Recorder 成为新主线

- 旧的 bias maker / pendulum daily point smoke-test 相关材料已归档到 `archive/htf_observation/legacy-bias-maker/`
- 当前主线切换为独立的 `HTF Observation Recorder`
- 这个 recorder 不碰 daily 主系统，不按 trading day 的严格表单节奏设计
- 当前目标不是直接产出 bias，而是先记录：
  - `Snapshot @ 9:29`
  - `Recent HTF Events`
  - `Daily Link`
- 建议优先观察的周期：
  - `1D`
  - `4H`
  - `1H`
  - `1W` 先只保留特别关键的背景 PDA / 结构，不做重录入
- 第一版记录类型：
  - `tap_pda`
  - `fill_pda`
  - `sweep_liquidity`
  - `structure_rotation`
  - `smt`
  - `displacement`
  - `session_behavior`
  - `nwog_ndog`
  - `gap_behavior`
- 原则：
  - 先观察，不先判断
  - 先记录发生了什么，再和主系统的 9:30-11:00 结果做归因
