# V4 用户说明书

V4 是图表式复盘工具，用来在 NQ K 线图上手工标注 PDA、绘制 1H price legs、关联 PDA response、记录 reaction evidence、用 Composite Move 复盘多段式高周期移动，并通过 ES 副图手工标注 SMT evidence。

当前版本以手工复盘为主。除精确复盘阶段的自动 actor TF 取数、canvas 框选 K 线群、最终 verdict 和统计页外，主要图表复盘流程已经可用。

## 启动

在项目目录启动静态服务：

```bash
cd /home/leo/myworkspace/trading/backtesting
python3 -m http.server 8001
```

浏览器打开：

```text
http://127.0.0.1:8001/v4/index.html
```

V4 API 通常运行在：

```text
http://127.0.0.1:8766/v4/health
```

## 加载图表

顶部工具栏提供：

- `开始`：加载区间起点。
- `结束`：加载区间终点。
- `周期`：选择 K 线周期，例如 `1H`、`4H`、`D`。
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

## Split Screen 副图

Split Screen 用来把主图 NQ 与副图 NQ/ES 放在同一个绝对时间区间里观察。

常用设置：

- 主图：NQ。
- 副图 `Sub`：ES。
- 副图 `Sub TF`：通常与主图周期一致；做 SMT 标注时必须一致。
- `Layout`：`Stack` 为上下分屏，`Side` 为左右分屏。

副图是只读图表：

- 不接管右键菜单。
- 不直接编辑 PDA/segment。
- 会显示同步 hover cursor、replay cursor，以及只读 PDA/segment/composite overlay。

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

## 绘制 1H Segment

Segment 表示一条连续 price leg。

右键菜单提供显式端点选择：

- `Start 1H Segment from Low`
- `Start 1H Segment from High`
- `End 1H Segment at Low`
- `End 1H Segment at High`

建议只用 K 线 high/low 创建 segment，不用 close 表达极值段。

新建 segment 默认不显示 label。选中 segment 后，可以在 Inspector 的 `Display` 区开启 `Show segment label`。

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

SMT 当前只做手工标注，第一版逻辑是 `NQ follows ES`，也就是以 NQ 做单为主，不做 ES follows NQ。

使用前提：

- 开启 `Split`。
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

## Order Review / Execution Lens

Order Review 用来把一次做单复盘拆成三层：

- `Setup Thesis`：为什么这里有机会，可以引用 segment、Composite Move、PDA、SMT 或 Reaction Evidence。
- `Entry Plan`：方向、入场时间/价格、entry model、stoploss、target。
- `Result Review`：出场、结果、是否达到预期目标、points/R。

当前版本是手工复盘，不自动判断 09:30 reversal、09:50 continuation/reversal 或 Silver Bullet 是否成立。

### 创建 Order Review

右侧 Inspector 支持三种入口：

- 空状态：点击 `Create Blank Order Review`。
- 选中 segment：点击 `Create Order Review From Segment`，会自动添加 segment linked ref。
- 选中 Composite Move：点击 `Create Order Review From Composite`，会自动添加 composite linked ref。

Order Review 列表显示在 Inspector 的空状态、Archive 视图，以及选中 segment / Composite Move 时的下方区域。

### Order Review 操作

每条 Order Review 当前支持：

- `Locate`：定位到 setup / entry / exit 的时间范围。
- `Delete`：删除该订单复盘。
- `Result`：快速修改结果状态。
- `Note`：编辑订单级备注。

图表会显示轻量 overlay：

- setup / entry / exit vertical marker
- stoploss helper line
- target helper line

第一版不做订单 hit-test、拖拽编辑、自动 target hit 判断或统计页。

## 保存与导入导出

V4 有两种保存方式：

### LocalStorage 草稿

浏览器会自动保存：

- PDA annotations
- market segments
- segment groups / Composite Moves
- Order Reviews

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

不包含 K 线数据。

## 推荐复盘流程

1. 加载目标时间区间和周期。
2. 标注关键 PDA。
3. 手动画连续 1H segments。
4. 把相关 PDA 链接到 segment。
5. 查看 `Review Metrics` 与 `Terminal PDA Candidates`。
6. 必要时在 PDA Response 下添加 Reaction Evidence。
7. 对多段式 move 创建 Composite Move。
8. 使用 isolate 或 Structure Sets focus 检查局部结构。
9. 如果需要 NQ/ES 关系证据，开启 Split 并手工标注 SMT。
10. 为关键机会创建 Order Review，记录 setup、entry、result。
11. 导出 Review JSON 归档。

## 常见注意事项

- Segment 应尽量首尾相接，否则 `Extension Ratio` 和 `Took Extreme` 语义会变弱。
- Segment 端点建议统一使用 K 线 high/low。
- `draft child` 是创建前的临时选择。
- `child segment` 是 Composite Move 创建后的正式子段。
- `target segment` 不一定是 child segment，通常是被突破或被参考的上一段。
- Wick CE 是 PDA，可以链接到 segment，也会参与 terminal reaction 查看。
- SMT 当前是手工 evidence，不会自动扫描候选。
- Order Review 是复盘层，不是下单执行模块；第一版允许不完整草稿。
- Review JSON 不包含 K 线数据，迁移到其他机器时仍需要准备本地 DuckDB 行情数据。
- 精确复盘相关的自动 actor TF 取数、canvas 框选和统计页仍属于后续阶段。
