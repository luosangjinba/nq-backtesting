# Pendulum Spec

更新时间：2026-04-10

## 1. 目的

`pendulum` 不是当前日级 `backtesting journal` 的一部分，而是一个更上游、更慢变量的结构判断系统。

它的目标不是记录某一天的盘前判断，而是：

- 用半机械化方式维护较高时间框架的结构状态
- 尽量减少 `HTF bias` 被主观解释带偏
- 为日级 backtesting 系统提供一个更稳定的上游结构输入

一句话定义：

`Pendulum 是一个独立的 HTF 结构状态机，用于输出 structural bias，而不是直接替代日内交易计划。`

---

## 2. 为什么要独立

当前 `yaml_panel.html` 的系统边界是：

- 每天一份记录
- 盘前观察截面统一为 `9:29`
- 核心研究窗口为 `9:30-10:30`

而 `pendulum` 的边界不同：

- 生命周期可能是数周甚至数月
- 更新频率低
- 只有结构真正变化时才更新
- 关注的是 `HTF structure`，不是某一天的具体执行细节

因此：

- `pendulum` 不应直接塞进 daily journal 主表单
- 更合理的方式是把它作为独立系统维护
- daily system 只引用它的当前结论

---

## 3. 要解决的问题

当前 `bias` 判断存在的问题：

- 过度依赖主观解释
- 每天都容易“重写故事”
- 结构未变时，也可能因为局部波动改变 bias

`pendulum` 要解决的是：

- 在 bullish / bearish 结构未被真正破坏前，不轻易改结构 bias
- 在 range 内部波动阶段，承认“暂时无法定向”或“仍属旧结构”
- 在出现突破时，不立即草率认定反转，而是进入下一步确认

---

## 4. 核心思想

### 4.1 Protected Level

- bullish 结构中存在 `protected low`
  - 只要这个 `protected low` 没被有效跌破
  - 结构仍视为 `bullish`

- bearish 结构中存在 `protected high`
  - 只要这个 `protected high` 没被有效突破
  - 结构仍视为 `bearish`

### 4.2 Range 内部波动不等于结构改变

- 在已有结构范围内部的上下摆动
- 默认仍属于当前结构内部波动
- 不因为短期 swing 的变化立刻改写大结构 bias

### 4.3 Break 之后需要二次判断

当 range 一侧被突破后，不直接写死“结构已经反转”，而是进入下一步判断：

- `continuation`
- `reversal`
- `false_break`
- `undecided`

也就是说：

- `break` 只是事件
- 不是最终结论

---

## 5. Pendulum 输出什么

`pendulum` 更适合输出：

- `structural_bias`
- `structure_status`
- `phase`
- `confirmation_state`
- `protected_high / protected_low`
- `current active dealing range`
- `last confirmed structural shift`

它不直接输出：

- 今天 9:30 一定做多还是做空
- 具体首小时入场方向

因为那是日级系统结合：

- `pendulum`
- `premium/discount`
- `nearest_draw`
- `session context`

之后才要回答的问题。

---

## 6. 与 Daily Backtesting System 的关系

推荐架构：

### 上游：Pendulum

负责：

- HTF 结构状态
- protected level
- 结构是否 intact
- 当前是在 trend / range / transition / post-break 哪个阶段

### 下游：Daily Backtesting Journal

负责：

- 当天 9:29 的盘前快照
- 9:30-10:30 的走势与机会记录
- Reversal / Entry / Outcome

### 关系

Daily 系统只引用 `pendulum` 当前结论，例如：

```yaml
htf_context:
  pendulum_ref:
    source_timeframe: 1h
    structural_bias: bullish
    phase: transition
    confirmation_state: awaiting_confirmation
    protected_low: 23450.0
    protected_high: 24420.0
```

---

## 7. 建议的数据结构

第一版建议先用独立文件维护：

- `pendulum_state.yaml`

建议结构：

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

structure_points:
  - type: LL
    time: "2026-03-31 10:00"
    price: 22970.0
  - type: HL
    time: "2026-04-02 13:00"
    price: 23450.0
  - type: HH
    time: "2026-04-03 14:00"
    price: 24420.0

judgement:
  confidence: medium
  reasoning: "HH 已形成，但仍需下一阶段确认是否完成真正 bullish shift。"
```

---

## 8. 最小落地版本

在不急着做 UI 的前提下，第一版建议只先确认这些字段：

- `structural_bias`
- `structure_status`
- `phase`
- `confirmation_state`
- `protected_high`
- `protected_high_time`
- `protected_low`
- `protected_low_time`
- `active_range.high`
- `active_range.low`
- `break_assessment.status`
- `judgement.reasoning`

这是最小可用集。

---

## 9. 状态建议

### 9.1 structural_bias

- `bullish`
- `bearish`
- `range`
- `neutral`

### 9.2 structure_status

- `intact`
- `testing_break`
- `broken`

### 9.3 phase

- `trend`
- `range`
- `transition`
- `post_break`

### 9.4 confirmation_state

- `confirmed`
- `awaiting_confirmation`
- `failed_confirmation`
- `not_applicable`

### 9.5 break_assessment.status

- `continuation`
- `reversal`
- `false_break`
- `undecided`

---

## 10. 实施建议

### 10.1 先不做 UI

原因：

- 规则本身还在收敛
- 太早做 UI，后面容易频繁返工

### 10.2 先做规格 + 样本验证

建议顺序：

1. 固定字段结构
2. 选 3-5 个历史样本
3. 手工填 `pendulum_state.yaml`
4. 检查这套状态机是否稳定
5. 再决定是否需要独立页面

### 10.3 后续如果做界面

建议做成独立页面或独立工具，而不是塞进 `yaml_panel.html`：

- `pendulum_editor.html`
- 或 `pendulum_panel.html`

---

## 11. 当前结论

当前共识：

- `pendulum` 是可行方向
- 它应该独立于当前 daily backtesting system
- 它更适合作为 `HTF structural bias engine`
- 当前先做规格，不进主系统，不做 UI

