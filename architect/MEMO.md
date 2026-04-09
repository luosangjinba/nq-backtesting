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

### 2. HTF Context 仍有剩余坑

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

### 3. Bias Update 日志还没做

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

### 4. Sweep vs Break 的量化判断还没落地

目前只是研究结论，还没进入页面或 YAML：

- `daily_close_side`
- `next_daily_close_side`
- `penetration_atr_pct`
- `body_beyond_pct`
- `wick_ratio`
- `sweep_break_assessment`

这块建议不要急着做 UI，优先作为研究规格保留。

### 5. Entry 目标结构还没重构

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

1. 补 `mae_time / mfe_time`
2. 再做 `beyond_swing`
3. 再做 `HTF bias_updates`

### 可以后做

1. `retracement_after_internal`
2. `bias_updates`
3. `targets` 结构重构

### 暂不建议做

1. 主题系统
2. Sweep/Break 全量量化 UI

## 维护规则

后续每次出现以下情况，都更新这份文件：
- 已讨论并确认方向，但没有马上实现
- 已实现一半，剩余部分决定后做
- 发现旧需求有“口头确认过，但代码没跟上”
