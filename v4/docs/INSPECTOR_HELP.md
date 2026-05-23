# V4 Inspector 帮助文档

Inspector 是右侧对象面板。选中图表上的 PDA 或 1H Segment 后，它会显示该对象的基础信息、关联关系、复盘指标和显示控制。

本文先解释 1H Segment 的 Inspector，因为当前 Segment Review 工作流主要依赖这些字段。

## Market Segment

这一组显示当前选中的 1H 行情段基础信息。

- `Selected`
  - 当前选中的对象。
  - 例如 `1H DOWN LEG` 表示当前选中的是一个 1H 下跌段。

- `Direction`
  - Segment 方向。
  - `up` 表示终点价格高于起点价格。
  - `down` 表示终点价格低于起点价格。
  - `flat` 表示起点和终点价格相同。

- `Timeframe`
  - 当前 segment 所属周期。
  - 目前手动行情段固定为 `1H`。

- `Source`
  - Segment 来源。
  - `manual` 表示用户手动画出的 segment。

- `ID`
  - Segment 的内部唯一 ID。
  - 主要用于导出/import、调试和对象关联，一般不用人工解读。

- `PDA Responses`
  - 当前 segment 已关联的 PDA 数量。
  - 这些 PDA 会参与 `Terminal PDA Candidates` 和 PDA interruption 等只读指标。

- `Created`
  - Segment 创建时间。

- `Updated`
  - Segment 最近更新时间。
  - 修改 narrative、tags、display mode、PDA response 等都会更新它。

## Start / End

`Start` 和 `End` 显示 segment 起点和终点。

- `Kind`
  - 端点使用的是该根 K 线的哪一个极值。
  - `swing-high` 表示取该根 K 线 high。
  - `swing-low` 表示取该根 K 线 low。
  - 新建 segment 时由右键菜单明确选择：
    - `Start 1H Segment from Low`
    - `Start 1H Segment from High`
    - `End 1H Segment at High`
    - `End 1H Segment at Low`

- `Time`
  - 端点所在 K 线时间。

- `Price`
  - 端点价格。
  - 该价格来自你选择的那根 K 线 high 或 low，不再由系统用 close 自动推断。

## PDA Responses

这一组显示当前 segment 手动关联了哪些 PDA，以及你如何描述 segment 对这些 PDA 的反应。

每条 PDA response 包含：

- 序号
  - 当前 response 在列表中的顺序。

- PDA 类型
  - 例如 `FVG`、`BSL`、`SSL`、`Wick CE`、`OB`、`Breaker`、`Fib`、`EQH`、`EQL`、`NDOG`、`NWOG`。

- Relation 下拉框
  - 你对该 PDA 和 segment 关系的人工分类。
  - `respected`：价格尊重该 PDA。
  - `swept`：价格扫过该 PDA。
  - `approached`：价格接近但未明确触碰或扫过。
  - `rejected`：价格触碰/接近后被拒绝。
  - `delivered-through`：价格穿过该 PDA 并继续 delivery。

- Display Mode 下拉框
  - 控制选中 segment 时，该 PDA 如何显示。
  - `highlight`：跟随 segment 高亮。
  - `normal`：显示但不高亮。
  - `hidden`：在 segment isolate/联动视图中隐藏该 PDA。

- `Response note`
  - 针对这条 PDA response 的短备注。
  - 这是人工补充，不参与当前只读 metrics 计算。

- `Remove`
  - 删除这条 PDA response 关联。
  - 只删除 segment 与 PDA 的关联，不删除 PDA 本身。

## Review Metrics

这一组是系统只读计算指标，用来描述当前 segment 相对上一段的结构关系，以及 terminal bar 的事实。

### 上一段对比

- `Previous`
  - 系统按时间顺序找到的上一条 segment ID。

- `Current Range`
  - 当前 segment 幅度。
  - 计算方式：`abs(end.price - start.price)`。

- `Previous Range`
  - 上一段 segment 幅度。
  - 计算方式同上。

- `Extension Ratio`
  - 当前段幅度 / 上一段幅度。
  - 这个字段用于判断当前段是否只是回撤、轻微扫过，还是明显 expansion。
  - 在首尾连续、反向、端点使用 high/low 的前提下：
    - `<= 1.0`：没有拿掉上一段 opposing extreme。
    - `1.0 - 1.1`：偏 marginal sweep。
    - `1.1 - 1.5`：偏 meaningful break。
    - `> 1.5`：偏 strong expansion。

- `Extension State`
  - 系统根据 `Extension Ratio` 给出的粗分类。
  - `no take`：未拿掉上一段 extreme。
  - `marginal sweep`：轻微扫过。
  - `meaningful break`：有意义的突破。
  - `strong expansion`：强 expansion through。

- `Took Extreme`
  - 当前段是否实际拿掉上一段 opposing extreme。
  - `yes` 表示拿掉。
  - `no` 表示没有拿掉。

- `Prev Extreme`
  - 上一段被当前段挑战的 opposing extreme。
  - 当前段向上时，它是上一段起点高点。
  - 当前段向下时，它是上一段起点低点。

`Overshoot`、`Overshoot Ratio`、`Stopped Inside` 不再作为主字段显示。它们本质上都是 `Extension Ratio` 的不同侧面：小于 1 是 stopped inside，等于 1 是 equal，大于 1 是 overshoot。

### Terminal Bar

Terminal bar 是 segment 终点所在的那根 K 线。

- `Terminal Time`
  - 终点 K 线时间。

- `Open / High / Low / Close`
  - 终点 K 线 OHLC。

- `Body High`
  - `max(open, close)`。

- `Body Low`
  - `min(open, close)`。

- `Upper Wick`
  - 上影线长度。
  - 计算方式：`high - bodyHigh`。

- `Lower Wick`
  - 下影线长度。
  - 计算方式：`bodyLow - low`。

- `Body Points`
  - 实体长度。
  - 计算方式：`bodyHigh - bodyLow`。

### Incomplete 状态

如果 Review Metrics 显示 `Status`，表示系统没有足够条件可靠计算上一段对比。

常见原因：

- `missing previous segment`
  - 没有找到上一段 segment。

- `segments are not endpoint-continuous`
  - 当前段起点不是上一段终点。
  - 这种情况下 `Extension Ratio` 和 `Took Extreme` 没有稳定解释。

- `segments are not opposite direction`
  - 当前段和上一段不是反向段。

- `missing segment range`
  - 起点或终点价格缺失，或者 range 为 0。

- `terminal bar not loaded`
  - 当前加载的 K 线数据中找不到终点 K 线。

## Terminal PDA Candidates

这一组是系统根据当前 segment 已关联 PDA 自动计算的 terminal reaction 候选。

注意：这里只从 `PDA Responses` 中已关联的 PDA 里选，不会扫描全图未关联 PDA。

每条候选显示：

- 序号
  - 候选排序。

- PDA 类型
  - 例如 `FVG`、`BSL`、`Wick CE`、`Fib`。

- Reaction summary
  - 系统根据 terminal bar 和 PDA 位置算出的反应摘要。

- Relation
  - 你在 `PDA Responses` 中手工选择的 relation。
  - 这可以和系统 reaction summary 对照，检查人工标注是否一致。

- `Reaction Type`
  - 按 PDA 类型显示详细反应分类。
  - 可能是 `Range PDA Reaction`、`Liquidity PDA Reaction` 或 `Fib Reaction`。

### Range PDA 反应

适用于：

- `FVG`
- `OB`
- `Breaker`
- `NDOG`
- `NWOG`

可能出现的摘要：

- `range touched by wick`
  - 终点 K 线影线进入了 range。

- `range touched by body`
  - 终点 K 线实体进入了 range。

- `CE touched by wick`
  - 影线触碰了 range 的 CE 中线。

- `CE touched by body`
  - 实体触碰了 CE 中线。

- `range swept then reversed`
  - 价格扫过 range 边界，但收盘回到 range 内或边界内侧。

- `range delivered through`
  - 价格穿过 range，并收盘在穿越方向外侧。

- `approached X pts`
  - 接近但没有触碰 range，距离为 X points。

### Liquidity PDA 反应

适用于：

- `BSL`
- `SSL`
- `EQH`
- `EQL`

可能出现的摘要：

- `swept then reversed`
  - 终点 K 线扫过 liquidity level，但收盘回到 level 内侧。

- `swept and delivered through`
  - 终点 K 线扫过 liquidity level，并收盘在穿越方向外侧。

- `exact equality`
  - 终点 K 线 high/low 正好等于 liquidity level。

- `approached X pts`
  - 接近但没有扫过或等价触碰。

### Fib 反应

适用于：

- `Fib`

可能出现的摘要：

- `level touched by wick`
  - 终点 K 线影线触碰最近 Fib level。

- `level touched by body`
  - 终点 K 线实体触碰最近 Fib level。

- `level swept then reversed`
  - 终点 K 线扫过最近 Fib level，但没有收盘穿过去。

- `level delivered through`
  - 终点 K 线扫过最近 Fib level，并收盘穿过去。

- `nearest level VALUE @ PRICE`
  - 没有触碰时，显示离 terminal bar 最近的 Fib level。

## Fluency Components

这一组是 segment delivery 流畅度的只读组件指标。当前不合成最终分数。

- `Bars`
  - 当前 segment 覆盖的 K 线数量。
  - 包含起点和终点 K 线。

- `Range`
  - Segment 端点幅度。
  - 计算方式：`abs(end.price - start.price)`。

- `Path Range`
  - Segment 内所有 K 线 high-low range 的总和。
  - 它近似表示这段路径内部波动总量。

- `Efficiency`
  - Directional efficiency。
  - 计算方式：`Range / Path Range`。
  - 越接近 `1.000`，说明 delivery 越直接。
  - 越低，说明段内来回波动越多。

- `Overlap Ratio`
  - 相邻 K 线实体发生重叠的比例。
  - 越高，越偏 overlap/chop。

- `Counter Closes`
  - 逆 segment 方向收盘的 K 线比例。
  - 对 up segment：红 K 或 close < open 计入 counter close。
  - 对 down segment：绿 K 或 close > open 计入 counter close。

- `Directional Closes`
  - 顺 segment 方向收盘的 K 线比例。
  - 它和 `Counter Closes` 是互补观察。

- `Avg Body`
  - 平均实体占单根 K 线 range 的比例。
  - 越高，表示 K 线实体更饱满。

- `Max Adverse`
  - 最大逆向回撤幅度，占 segment range 的百分比。
  - 系统采用保守计算：先根据进入当前 K 线前的 running extreme 计算 adverse，再更新当前 K 线 extreme，避免假设同一根 1H K 内 high/low 的先后顺序。

- `Points / Bar`
  - 每根 K 线平均推进 points。
  - 计算方式：`Range / Bars`。

- `PDA Interruptions`
  - 在 terminal bar 之前，segment 已关联 PDA 中有多少个被段内 K 线触碰或扫过。
  - 用于观察 delivery 过程中是否被多个 PDA 干扰。

### Fluency Incomplete 状态

如果显示 `Status`，说明系统没有足够 bar 数据计算 fluency。

常见原因：

- `segment endpoint bars not fully loaded`
  - 当前加载区间没有包含 segment 起点或终点 K 线。

- `not enough bars inside segment`
  - Segment 内 K 线数量不足。

- `missing segment range`
  - Segment 端点价格缺失或 range 为 0。

## Review Notes

这是当前旧的人工备注区，暂时保留。

- `Narrative`
  - 自由文本说明。
  - 可写你对这段行情的人工解释。
  - 当前不会参与 structured review metrics。

- `Tags`
  - 逗号分隔标签。
  - 例如：`accumulation, expansion`。
  - 当前主要用于人工分类和后续筛选预留。

后续如果 `segment.review` controlled selection 成熟，`Narrative` 和 `Tags` 可能会降级为补充字段。

## Display

这一组控制当前 segment 的显示方式。

- `Show segment label`
  - 控制图表上是否显示 segment label。

- `Isolate segment`
  - 开启后，只显示当前 segment 和它关联的 PDA。
  - 适合专注复盘当前一段。

- `Prev segments`
  - 在 isolate 状态下，额外显示当前 segment 前面的 N 个 segment。
  - 例如填 `1` 表示显示前 1 个 segment，填 `3` 表示显示前 3 个 segment。
  - 这些前序 segment 只是上下文，按普通样式显示，不会抢当前 isolate segment 的高亮。

- `Include previous PDA responses`
  - 配合 `Prev segments` 使用。
  - 勾选后，前 N 个 segment 关联的 PDA responses 也会临时显示。
  - 这些 PDA responses 以普通可见状态显示；当前 isolate segment 自己的 PDA response 仍然按各自的 `highlight / normal / hidden` 控制。

- `Segment in isolate`
  - 控制当前 segment 在 isolate 模式下的显示强度。
  - `highlight`：高亮显示。
  - `normal`：正常显示。
  - `hidden`：隐藏 segment 本身，但保留 isolate 逻辑。

- `Delete Segment`
  - 删除当前 segment。
  - 不会删除 PDA 本身。

## Archive

当没有选中 PDA 或 segment，Inspector 会显示 Archive 操作。

- `Export Review JSON`
  - 导出当前 PDA annotations 和 market segments。
  - 不导出 K 线数据。

- `Import Review JSON`
  - 导入 review package。
  - 会处理 PDA id remap、segment id 冲突和 orphan response。

- `Export PDA JSON`
  - 只导出 PDA annotations。

- `Import PDA JSON`
  - 只导入 PDA annotations。

- `Clear Saved PDA`
  - 清除浏览器 localStorage 中保存的 PDA 工作草稿。
  - 不影响已下载的 JSON 文件。

## 当前使用建议

1. 先手动画连续 1H segment。
2. 创建 segment 时明确选择 High/Low 端点。
3. 把相关 PDA 链接到 segment，并选择 relation。
4. 看 `Review Metrics` 判断当前段是否拿掉上一段 extreme。
5. 看 `Terminal PDA Candidates` 判断终点是否确实反应在某个 PDA。
6. 看 `Fluency Components` 判断这段 delivery 是直接、顺畅，还是重叠/回撤较多。
7. 先验证 5-10 个真实样例，再决定是否进入正式 `segment.review` 持久化。

## Composite Move

`Composite Move` 用来记录多条 atomic segment 共同完成的一次高周期移动。

典型场景：

- 第一条反转 leg 没有直接突破上一段 extreme。
- 中间出现一条明确 pullback leg。
- 后续第二条同向 leg 才完成突破或到达目标。

使用方式：

右键方式：

1. 右键第一条子 segment，点击 `Add Segment To Draft`。
2. 右键后续子 segment，继续点击 `Add Segment To Draft`。
3. 右键被突破/被参考的上一段，点击 `Set Segment As Target`。
4. staged 子 segment 至少 2 条后，右键任意 segment，点击 `Create Composite Move`。

如果加错了：

- 右键已加入的 segment，点击 `Remove Segment From Draft`。
- 或点击 `Clear Composite Draft` 清空草稿。

临时标记：

- 已加入 draft 的 child segment 会显示为橙色加粗。
- 被设置为 target 的 segment 会显示为紫色加粗。
- 创建 Composite Move 后，这些临时标记会清空。

Inspector 方式：

1. 选中第一条子 segment。
2. 在 `Composite Move Builder` 点击 `Add Current To Draft`。
3. 依次选中后续子 segment，并加入 draft。
4. 可选择一个 `Target Segment`，例如被突破的上一段。
5. 点击 `Create Composite Move`。

创建后，当前 segment 所属的 group 会出现在 `Composite Moves` 区。

字段含义：

- `Children`
  - 该 Composite Move 包含的子 segment 数量。

- `Net Range`
  - 从第一个子 segment 起点到最后一个子 segment 终点的净移动点数。

- `Total Path`
  - 所有子 segment range 的绝对值总和。

- `Efficiency`
  - `Net Range / Total Path`。
  - 越接近 `1`，说明整体移动越直接；越低，说明中间回撤/折返越多。

- `Max Pullback`
  - 与 Composite Move 主方向相反的最大子 segment range。

- `Pullback Ratio`
  - `Max Pullback / 第一条同向推进 segment range`。

- `Took Target Extreme`
  - 如果选择了 `Target Segment`，这里显示最后一条子 segment 是否突破 target segment 的起点 extreme。

图表上，Composite Move 会画一条更淡、更细的父级线，从第一个子 segment 起点连接到最后一个子 segment 终点。它只表达高周期大局，不替代子 segment 本身。

Composite Move 创建后可以直接点击父级线选中。选中后右侧会打开独立 Inspector，可查看 children、metrics，并编辑：

- `Target Segment`
- `Objective`
- `Outcome`
- `Notes`
- `Show composite label`
- 删除当前 Composite Move

## Wick CE PDA

`Wick CE` 是独立 PDA，显示为一条水平线。

右键菜单入口：

- `Mark Upper Wick CE`
- `Mark Lower Wick CE`

计算方式：

```text
bodyHigh = max(open, close)
bodyLow  = min(open, close)

Upper Wick CE = (high + bodyHigh) / 2
Lower Wick CE = (low + bodyLow) / 2
```

命名会带当前图表周期：

```text
1H Upper Wick CE
1H Lower Wick CE
4H Upper Wick CE
D Lower Wick CE
```

选中 Wick CE 后，Inspector 的 `Point` 区会显示：

- `Price`
  - Wick CE 水平线价格。

- `Anchor`
  - 来源 K 线时间。

- `Timeframe`
  - 创建 Wick CE 时的图表周期。

- `Wick Side`
  - `upper` 或 `lower`。

- `Wick Points`
  - 该影线长度。

- `High / Low`
  - 来源 K 线的 high / low。

- `Body High / Body Low`
  - 来源 K 线实体上下沿。
