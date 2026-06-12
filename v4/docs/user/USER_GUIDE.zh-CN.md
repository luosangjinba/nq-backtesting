# V4 用户说明书

V4 是图表式复盘工具，用来在 NQ/ES K 线图上回放行情、手工标注 PDA、绘制 price legs、记录 Chart Notes、建立 Order Setup、按 Calendar/Inspector 做每日复盘，并通过 ES 副图手工标注 SMT evidence。

当前版本以手工复盘为主。它不是自动交易信号系统，不自动判断 setup 是否成立。除精确复盘阶段的自动 actor TF 取数、canvas 框选 K 线群、最终 verdict 和统计页外，主要图表复盘流程已经可用。

## 启动

推荐启动方式：

```bash
cd v4
bash start.sh start
```

这个脚本会启动 V4 API，并在 8001 端口启动 Web 服务。

浏览器打开：

```text
http://127.0.0.1:8001/index.html
```

V4 API 通常运行在：

```text
http://127.0.0.1:8766/v4/health
```

常用服务命令：

```bash
bash start.sh status
bash start.sh restart
bash start.sh stop
```

如果看到 `Failed to fetch`、Replay History restore failed、Calendar/价格查询失败，优先检查 API 是否在 `8766` 运行。

如果把 `v4/` 复制为独立目录运行，先准备 `data/trading_data.duckdb`，或设置 `V4_TRADING_DB`。详细步骤见 [Standalone Run Guide](STANDALONE_RUN.md)。

## 加载图表

顶部工具栏提供：

- `Date`：当前加载区间。点击后打开 Date Range Calendar，可选择 start/end，也可手工输入精确时间。
- `Main`：主图品种。当前完整支持 `NQ` 和 `ES` 常规复盘；默认仍是 `NQ`。
- `Main TF`：选择主图 K 线周期，例如 `1M`、`30M`、`1H`、`4H`、`D`。
- `加载`：请求并显示 K 线。
- `Archive`：打开导入/导出区域。
- `Split`：显示/隐藏副图。
- `Sub`：副图品种，目前常用 `ES`。
- `Sub TF`：副图周期。
- `Layout`：副图布局，支持上下分屏和左右分屏。

时间建议使用：

```text
YYYY-MM-DD HH:mm
```

1M 大范围加载会使用窗口化策略：图表只显示当前窗口，避免一次性把很长 1M 区间全部塞进浏览器。需要切换窗口时使用图表底部的窗口/定位控制。

## Main Instrument

`Main` 是 workspace 级状态。切换 `NQ` / `ES` 后，主图加载、Replay History、PDA、Segments、Chart Notes、Time Reaction、Order Setup、Time Lines、Economic Event notes 和 display mode 都会以当前 Main 为上下文。

兼容与隔离规则：

- 默认 Main 是 `NQ`，旧 NQ 复盘数据继续按 NQ workspace 读取。
- 新建对象会写入当前 Main 的本地分区，例如 NQ 对象和 ES 对象互不混用。
- Calendar、Archive、Replay History 只显示/导入/导出当前 Main 对应的数据；导入不同 instrument 的 archive 会被拒绝，避免静默混入。
- Daily Regime 中的 `VIX` 是共享市场背景；`Trend` / `Range` 跟随当前 Main，NQ 读取 `data/daily-regime-nq.csv`，ES 读取 `data/daily-regime-es.csv`。
- 其他品种只有扩展接口。要完整支持，需要先补齐数据库数据、tick 配置、roll 规则和相关 workflow 规则。

## Replay Bar

Replay Bar 用来按历史 K 线逐根回放。

底部控制包括：

- `Replay Bar On/Off`：开启或关闭回放。
- `First`：跳到当前加载数据第一根。
- `Last Pos`：回到上次 replay 位置。
- `Pick`：在当前已经回放出来的 K 线里点击一根，截断 replay 到该位置。
- `Next`：前进到下一个固定时间点。
- `<` / `播放` / `>`：单步后退、自动播放、单步前进。
- `History`：恢复最近 replay workspace。

Replay Pick 的规则：

- 只命中当前已经显示出来的 replay K 线。
- 不会展开完整 date range。
- 不会加载未来 K 线。
- 适合“感觉行情走多了，回退一小段”。

Replay History 会保存主图窗口、cursor、Split 设置等工作区状态，但不保存 K 线数据。恢复失败时通常是 API 没开。

## Calendar / Daily Regime / Economic Events

右侧 Inspector 的 Calendar 是当前系统的日内复盘入口。

Calendar 每天会聚合：

- Order Setups
- Time Reaction Observation
- Chart Notes
- Economic Events
- SMT
- PDA
- Segments
- Composite
- Killzones / Time Lines

点击某一天会打开当天详情。`Show Day Objects` / `Hide Day Objects` 用来显示或隐藏当天外显图表对象，包括 PDA、Segments、Composite、SMT、Time Lines、Killzones 和 Chart Note boxes。

Daily Regime 显示在 Calendar 日期详情中：

- `VIX`：按日 VIX 档位，NQ/ES 共用 `data/vix-daily.csv`。
- `Trend`：当前 Main instrument 的静态 daily trend regime。
- `Range`：当前 Main instrument 的静态 daily range regime 与 ATR 倍数。
- `Events`：重要事件标签。`none` 表示当天没有重要事件标签；`unknown` 表示没有可用事件判断数据。

当前 ES Daily Regime 文件覆盖 `2008-01-02` 到 `2026-06-11`。如果后续用 Databento 或其他流程刷新了 K 线数据库，需要重新生成对应 instrument 的 `daily-regime-*.csv`，否则 Calendar 里的 Trend/Range 仍停留在旧 CSV。

Economic Events 使用本地 USD 事件 CSV。High/Medium 默认显示，Low 默认隐藏，Holiday 默认显示。经济事件不会在图表上常驻竖线；点击 Locate 时才定位并快闪。

## Split Screen 副图

Split Screen 用来把主图 Main 与副图 NQ/ES 放在同一个绝对时间区间里观察。

常用设置：

- 主图 `Main`：NQ 或 ES。
- 副图 `Sub`：ES。
- 副图 `Sub TF`：通常与主图周期一致；做 SMT 标注时必须一致。
- `Layout`：`Stack` 为上下分屏，`Side` 为左右分屏。

副图有独立右键菜单，支持有限的结构标注 workflow：

- 可在副图创建 BSL/SSL、Segment、FVG。
- 标注会保留 `sourceChartId/sourceInstrument/sourceTimeframe` 等来源信息。
- 可在主图/副图显示、选择、打开 Inspector，并可作为 active Order Setup 的 reason/ref。
- 会显示同步 hover cursor、replay cursor，以及 PDA/segment/composite overlay。

主图右键菜单的 `SMT -> Locate Time in Secondary` 可以把副图定位到当前主图 K 线附近，并显示副图 hover cursor。

## 手工 PDA 标注

在图表 K 线上右键，可以创建 PDA。

常用入口：

- `Mark BSL`
- `Mark SSL`
- `Start EQH Set`
- `Start EQL Set`
- `Mark FVG`
- `Mark IFVG`
- `Mark Bullish OB`
- `Mark Bearish OB`
- `Mark Bullish Breaker`
- `Mark Bearish Breaker`
- `Start Fib`
- `Mark Upper Wick CE`
- `Mark Lower Wick CE`
- `PDA -> OB Last Bar`

### EQH / EQL

1. 右键第一根 K 线，选择 `Start EQH Set` 或 `Start EQL Set`。
2. 右键后续 K 线，选择 `Add EQH Point` 或 `Add EQL Point`。
3. 点位足够后选择 `Finish EQH` / `Finish EQL`。

选中已有 EQH/EQL 后，也可以右键其他 K 线，使用 `Add to Selected EQH/EQL` 追加点。

### Wick CE

`Wick CE` 是独立 PDA，表示影线中点。

- Upper Wick CE：上影线中点。
- Lower Wick CE：下影线中点。

计算方式：

```text
bodyHigh = max(open, close)
bodyLow  = min(open, close)

Upper Wick CE = (high + bodyHigh) / 2
Lower Wick CE = (low + bodyLow) / 2
```

命名会带当前图表周期，例如：

```text
1H Upper Wick CE
4H Lower Wick CE
```

### OB Last Bar

`OB Last Bar` 是一种简化 PDA 类型。

使用方式：

1. 鼠标在目标 K 线上右键。
2. 选择 `PDA -> OB Last Bar`。
3. 系统会从该 K 线价格向右画一条灰色水平线段。

label 会显示名称、品种和时间周期。它与其他 PDA 一样支持通用 display / visibility / Review JSON 属性。

## 绘制 Segment

Segment 表示一条连续 price leg。

右键菜单提供显式端点选择：

- `Start Segment from Low`
- `Start Segment from High`
- `End Segment at Low`
- `End Segment at High`

建议只用 K 线 high/low 创建 segment，不用 close 表达极值段。

新建 segment 默认不显示 label。选中 segment 后，可以在 Inspector 的 `Display` 区开启 `Show segment label`。

Segment 可以在 1H 或更低周期上绘制。每条 segment 会记录来源周期；1H 图上无法在同一根 1H K 线内部放两个 1H 端点，如果需要更细端点，切到 30M/15M/5M/1M 后绘制低周期 segment。

切换周期时，已记录实际发生时间的端点会尽量映射到对应周期的真实位置。旧数据如果是在修复前创建、缺少 occurrence timestamp，可能需要删除后重画。

## Chart Notes

Chart Notes 是绑定到单根 K 线的轻量文字 note。

关键规则：

- note 绑定 `instrument + timeframe + timestamp`。
- 只在同周期显示。`1M` note 只显示在 `1M` 图，`30M` note 只显示在 `30M` 图。
- Replay On 时只显示当前已经 replay 出来的 note，不显示未来 note。
- Chart Note 不是 PDA/Segment/Order Setup 的一部分，但可以作为 Order Setup reason 的 selected object。

### 新增 / 编辑 / 删除

1. 在目标 K 线上右键。
2. 打开 `Chart Note`。
3. 选择 `Add Note Here`。
4. 在图表内 textarea 输入文字，`Save` 保存，`Cancel` 或 `Esc` 取消。

已有 note 的原始 K 线上右键，可使用：

- `Edit Note`
- `Delete Note`

### 图表显示

Chart Note box 固定显示在主图 canvas 顶部，使用浅黄色 box 和弱化虚线 leader line 指向所属 K 线。

布局规则：

- 每个 note 独占一行。
- 如果两个 box 水平不重叠，会尽量复用最顶行。
- 顶行无法容纳时，自动推到下一行。
- 文字默认截断，鼠标交互可展开/收起。

### Inspector / Calendar

Chart Notes 在 `Time Reaction Observation` 中有独立 `Chart Notes` 模块，不会再置顶到所有模块里。

三点菜单支持：

- `Locate`
- `Edit`
- `Delete`
- `Select Object`，用于 Order Setup reason 选择对象。

Calendar 的 `Show Day Objects` / `Hide Day Objects` 会包含当天 Chart Note boxes 和 leader lines。

Replay 特别规则：

- 如果 replay 已经走到后一天，再从 Calendar 选回前一天，Chart Notes 会按当前 replay visible bars 聚焦前一天。
- 正常 replay 换日后，不会继续堆叠前一天的 note boxes。

## 关联 PDA Response

先点击选中一个 segment，然后右键命中某个 PDA。

菜单会显示：

- `Respected`
- `Swept`
- `Approached`
- `Rejected`
- `Delivered Through`

选择后，该 PDA 会写入当前 segment 的 `PDA Responses`。

在 Segment Inspector 里可以继续修改：

- relation
- display mode
- response note
- remove

## Reaction Evidence

Reaction Evidence 是 PDA Response 下面的手工证据。它不自动判断 respect/sweep 是否成立，而是由用户先确认事件存在，再让系统计算客观指标。

当前支持：

- `FVG Respect Evidence`：用于 range PDA，按 FVG 高度计算 wick/body 进入百分比。
- `Liquidity Sweep Evidence`：用于 high/low liquidity PDA，按 liquidity price 计算 wick/body sweep 百分比。

每条 evidence 可编辑：

- `Actor TF`：actor K 线群所属周期。
- `Actor First`：actor K 线群第一根。
- `Actor Last`：actor K 线群最后一根。
- `Actor Terminal`：最终反应 K 线。
- FVG `entrySide`。
- note。

`Pick` 按钮可以从当前图表点击选择 Actor 时间；如果 `Actor TF` 与当前图表周期不一致，系统会拒绝 pick，避免按错误周期选 K 线。

注意：metrics 只在 `Actor TF` 与当前加载图表周期一致时计算。后续精确复盘阶段会补 actor TF 自动取数。

## Segment Inspector

点击 segment 后，右侧 Inspector 会显示：

- `Market Segment`
- `Start / End`
- `PDA Responses`
- `Composite Move Builder`
- `Composite Moves`
- `Review Metrics`
- `Terminal PDA Candidates`
- `Fluency Components`
- `Review Notes`
- `Display`

### Review Metrics

核心字段：

- `Extension Ratio`：当前 segment range / 上一段 range。
- `Extension State`：`no take`、`marginal sweep`、`meaningful break`、`strong expansion`。
- `Took Extreme`：是否拿掉上一段 opposing extreme。
- `Prev Extreme`：被挑战的上一段 extreme。

这些指标要求 segment 尽量首尾相接，并且端点语义统一使用 high/low。

### Terminal PDA Candidates

这里显示当前 segment 已关联 PDA 在 terminal bar 上的反应。

Range PDA 会显示：

- Wick Range / Body Range
- Wick CE / Body CE
- Wick Depth / Body Depth
- Swept/Reversed
- Delivered Through

Liquidity PDA 会显示：

- Touched
- Body Touch
- Swept
- Exact Equality
- Approach / Sweep points
- Swept/Reversed
- Delivered Through

Fib 会显示：

- Nearest Level
- Wick Touch
- Body Touch
- Swept
- Delivered Through

## Isolate Segment

选中 segment 后，在 `Display` 区可以开启：

- `Isolate segment`
- `Prev segments`
- `Include previous PDA responses`

用途：

- 只看当前 segment。
- 临时显示前 N 个 segment 作为上下文。
- 可选择是否显示前序 segment 的 PDA responses。

## Structure Sets

Inspector 空状态会显示 `Structure Sets`。

这里列出当前已有的：

- segment 绘制集。
- Composite Move 绘制集。

点击条目会定位到对应时间范围，并进入临时 focus 状态：

- 被 focus 的绘制集在图表上高亮。
- 原本因 Display Mode 隐藏的相关对象会临时显示。
- 再次点击同一条目会取消 focus。

这是前端临时查看状态，不写入 localStorage 或 Review JSON。

## Composite Move

Composite Move 用来记录多条 atomic segment 共同完成的一次高周期移动。

典型例子：

```text
segment0: previous down leg
segment1: first up attempt
segment2: pullback
segment3: second up leg that breaks target
```

这里：

- `segment1 + segment2 + segment3` 是 Composite Move 的 child segments。
- `segment0` 是 target segment。

### 右键创建方式

1. 右键第一条子 segment，选择 `Add Segment To Draft`。
2. 右键后续子 segment，继续选择 `Add Segment To Draft`。
3. 右键目标 segment，选择 `Set Segment As Target`。
4. 至少有 2 条 child draft 后，右键任意 segment，选择 `Create Composite Move`。

创建前的临时颜色：

- child draft：橙色。
- target draft：紫色。

### Inspector 创建方式

1. 点击选中某条 segment。
2. 在 `Composite Move Builder` 点击 `Add Current To Draft`。
3. 依次选中后续 segment 并加入 draft。
4. 选择 `Target Segment`、`Objective`、`Outcome`。
5. 点击 `Create Composite Move`。

### Composite Move 选中态

创建后，图表上会出现一条淡色父级线。

点击父级线后：

- 父级线白色高亮。
- child segments 显示橙色。
- target segment 显示紫色。
- 如果某条 segment 同时是 child 和 target，紫色优先。

### Composite Move Inspector

选中 Composite Move 后，Inspector 显示：

- child segment 列表
- target segment
- objective
- outcome
- notes
- net range
- total path
- efficiency
- max pullback
- pullback ratio
- took target extreme

## SMT Evidence

SMT 当前只做手工标注，第一版逻辑是 `NQ follows ES`，也就是以 NQ 做单为主，不做 ES follows NQ。即使主图 Main 已支持 ES 常规复盘，SMT 仍只在 `Main=NQ`、`Sub=ES`、主副图周期一致时启用。

使用前提：

- 开启 `Split`。
- `Main` 选择 `NQ`。
- `Sub` 选择 `ES`。
- 主图周期与 `Sub TF` 必须一致。
- 主图和副图都已经加载 K 线。

### Liquidity SMT

Liquidity SMT 用来记录：

- Bearish：NQ 右侧高点没有 sweep 左侧高点，同时间 ES 右侧高点 sweep 左侧高点，NQ 跟随 ES 反转下跌。
- Bullish：NQ 右侧低点没有 sweep 左侧低点，同时间 ES 右侧低点 sweep 左侧低点，NQ 跟随 ES 反转上涨。

标注方式：

1. 在 NQ 主图左侧 K 线上右键。
2. 打开 `SMT` 分组。
3. 选择 `Start Bearish Liquidity SMT` 或 `Start Bullish Liquidity SMT`。
4. 左键点击 NQ 主图右侧 K 线。

系统会用相同的 left/right timestamp 在 ES 副图查找对应 K 线，并校验：

- NQ no-sweep。
- ES sweep。

成功后：

- NQ 主图画 `NQ no sweep` 两点连线。
- ES 副图画 `ES sweep` 两点连线。
- Inspector 的 `SMT Evidence` 列表显示该记录。

### FVG SMT

FVG SMT 用来记录：

- ES 存在并尊重某个 FVG 后上涨/下跌。
- 同时间 NQ 没有记录 FVG，但跟随 ES 上涨/下跌。

标注方式：

1. 在 NQ 主图右键。
2. 打开 `SMT` 分组。
3. 选择 `Mark Bearish FVG SMT` 或 `Mark Bullish FVG SMT`。
4. 左键点击 NQ 主图中与 ES FVG 对应的同时间 K 线。

系统会在 ES 副图数据中查找该时间附近的同方向 FVG。

成功后：

- ES 副图正常显示 FVG range。
- NQ 主图显示同时间竖向 marker。
- Inspector 的 `SMT Evidence` 列表显示该记录。

### SMT Inspector

右侧 Inspector 会显示 `SMT Evidence`：

- `Locate`：定位到该 SMT 的时间范围。
- `Delete`：删除该 SMT。
- `Note`：记录备注。

SMT 记录带有原始周期。当前版本只在 record timeframe 与当前主图/副图周期一致时显示。

## Order Setup / Execution Lens

Order Setup 用来把一次做单复盘拆成三层：

- `Setup Thesis`：为什么这里有机会，可以引用 segment、Composite Move、PDA、SMT 或 Reaction Evidence。
- `Entry Plan`：方向、入场时间/价格、entry model、stoploss、target。
- `Result Review`：出场、结果、target progress、risk、points/R、持仓时间与备注。

当前版本是手工复盘，不自动判断 09:30 reversal、09:50 continuation/reversal 或 Silver Bullet 是否成立。

### 创建 Order Setup

当前主入口是主图右键菜单里的 `Order Setup` 分组：

- `Create Bullish Setup Here`
- `Create Bearish Setup Here`
- `Move Active Reversal Here`
- `Set Entry Here`
- `Set MSS Here`
- `Set Stop Loss Here`
- `Targets` 子菜单：
  - `Set Target Internal 1 Here`
  - `Set Target Internal 2 Here`
  - `Set Target Internal 3 Here`
  - `Set Target Swing Point Here`
  - `Set Target External 1 Here`
  - `Set Target External 2 Here`
  - `Set Target External 3 Here`
- `Add Manual Explanation Event Here`

`Set Entry Here` 会同时记录入场时间和入场价格。创建后该 setup 会成为 active setup。后续右键操作会写入 active setup。

Shift 右键某根 K 线会显示线段结束控制，包括 `Set All End Here`，以及 entry、MSS、stop loss 和每个 target 对应的 end 操作。

Segment、Composite Move、PDA、SMT 都只是 linked refs，不是订单父级。比如 `1H FVG 回调后反弹` 可以直接作为 setup 事件记录，不需要强行绘制 1H segment。

当理由不是已有的 Segment、PDA、SMT 或 Composite Move 时，使用 `Add Manual Explanation Event Here`。例如：1H K 线尊重前一个 1H FVG、30M 实体 touch FVG CE、1M sweep EQL，都可以先记录为 manual explanation event。

Inspector 默认聚焦当前 `Active Order Setup`，只显示当前 setup 的轻量摘要、少量动作和折叠的 `Advanced Edit`。全部历史 setup 主要通过 Calendar 的日期对象列表浏览和 `Open`。

### Order Setup 操作

每条 Order Setup 当前支持：

- `Set Active Setup`：设为当前图表操作目标。
- `Locate`：定位到 setup / entry / exit 的时间范围。
- `Hide` / `Show`：临时隐藏或恢复该 setup 的整组图表标注，适合多个 setup 重叠时使用。
- `Delete`：删除该订单复盘。
- `Result`：快速修改结果状态。
- `Note`：编辑订单级备注。

图表会显示轻量 overlay：

- reversal 单根 K 线三角标志
- entry helper line
- stoploss helper line
- target helper line
- risk zone / result helper

Result 面板会派生显示：

- `Risk`：entry 到 stoploss 的点数风险。
- `Points`：entry 到 exit 的结果点数。
- `R`：points / risk。
- `Hold`：entry 到 exit 的持仓时长。
- `Target Progress`：target 结果跟随当前阶梯（`Target Internal 1/2/3`、`Target Swing Point`、`Target External 1/2/3`）。当 result 选择更远的 target 时，前面的 target 会显示为已达。每个 target action 可标记为 `None`、`Fruit`、`Neutral` 或 `Best`。

Exit Time 可手工输入，也可以用 `Pick` 从图表选择。选择 Target/Stop/BE 结果时，系统会尝试用 1M 数据计算首次触碰时间；找不到时不会写错值。

当前不做订单拖拽编辑、自动 setup verdict 或统计页。

## 保存与导入导出

V4 有两种保存方式：

### LocalStorage 草稿

浏览器会自动保存：

- PDA annotations
- market segments
- segment groups / Composite Moves
- Order Setups
- SMT records
- Chart Notes

这是工作草稿，不是正式归档。

### Review JSON

点击 `Archive` 后可以：

- `Export Review JSON`
- `Import Review JSON`

Review JSON 包含：

- PDA annotations
- market segments
- segmentGroups
- pdaResponses 里的 reactionEvidence
- SMT records
- orderReviews
- dailyTimeReviews
- chartNotes
- dailyRegimes

`orderReviews` 是兼容字段名，UI 中对应 `Order Setup`。当前不会迁移这个字段名，避免破坏旧归档和本地草稿。

不包含 K 线数据。

## 推荐复盘流程

1. 加载目标时间区间和周期。
2. 查看 Calendar 当日 Daily Regime 与 Economic Events。
3. 开启 Replay Bar，逐根推进行情。
4. 观察中随手添加 Chart Notes，记录即时判断。
5. 标注关键 PDA。
6. 手动画连续 segments，必要时在低周期绘制细分段。
7. 把相关 PDA 链接到 segment。
8. 查看 `Review Metrics` 与 `Terminal PDA Candidates`。
9. 必要时在 PDA Response 下添加 Reaction Evidence。
10. 对多段式 move 创建 Composite Move。
11. 使用 isolate、Structure Sets focus 或 Calendar Show/Hide Day Objects 检查局部结构。
12. 如果需要 NQ/ES 关系证据，开启 Split 并手工标注 SMT。
13. 为关键机会创建 Order Setup，记录 setup、entry、stop、targets、result。
14. 在 Calendar/Inspector 中回看当天对象，补充 Chart Notes 与 Time Reaction Observation。
15. 导出 Review JSON 归档。

## 常见注意事项

- Segment 应尽量首尾相接，否则 `Extension Ratio` 和 `Took Extreme` 语义会变弱。
- Segment 端点建议统一使用 K 线 high/low。
- `draft child` 是创建前的临时选择。
- `child segment` 是 Composite Move 创建后的正式子段。
- `target segment` 不一定是 child segment，通常是被突破或被参考的上一段。
- Wick CE 是 PDA，可以链接到 segment，也会参与 terminal reaction 查看。
- Chart Notes 只显示在创建它的周期，不跨周期投影。
- Replay 回看旧日期时，如果从 Calendar 选日或 Locate 当天对象，Chart Note boxes 会聚焦该日期；正常换日不会无限堆叠旧日期 boxes。
- SMT 当前是手工 evidence，不会自动扫描候选。
- Order Setup 是复盘层，不是下单执行模块；第一版允许不完整草稿。
- Review JSON 不包含 K 线数据，迁移到其他机器时仍需要准备本地 DuckDB 行情数据。
- 精确复盘相关的自动 actor TF 取数、canvas 框选和统计页仍属于后续阶段。
