# V4 用户说明书

V4 是图表式复盘工具，用来在 NQ K 线图上手工标注 PDA、绘制 1H price legs、关联 PDA response，并用 Composite Move 记录多段式高周期移动。

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

时间建议使用：

```text
YYYY-MM-DD HH:mm
```

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

## 保存与导入导出

V4 有两种保存方式：

### LocalStorage 草稿

浏览器会自动保存：

- PDA annotations
- market segments
- segment groups / Composite Moves

这是工作草稿，不是正式归档。

### Review JSON

点击 `Archive` 后可以：

- `Export Review JSON`
- `Import Review JSON`

Review JSON 包含：

- PDA annotations
- market segments
- segmentGroups

不包含 K 线数据。

## 推荐复盘流程

1. 加载目标时间区间和周期。
2. 标注关键 PDA。
3. 手动画连续 1H segments。
4. 把相关 PDA 链接到 segment。
5. 查看 `Review Metrics` 与 `Terminal PDA Candidates`。
6. 对多段式 move 创建 Composite Move。
7. 使用 isolate 检查局部结构。
8. 导出 Review JSON 归档。

## 常见注意事项

- Segment 应尽量首尾相接，否则 `Extension Ratio` 和 `Took Extreme` 语义会变弱。
- Segment 端点建议统一使用 K 线 high/low。
- `draft child` 是创建前的临时选择。
- `child segment` 是 Composite Move 创建后的正式子段。
- `target segment` 不一定是 child segment，通常是被突破或被参考的上一段。
- Wick CE 是 PDA，可以链接到 segment，也会参与 terminal reaction 查看。
