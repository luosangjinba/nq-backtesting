# 会话记录 - 标注渲染修复（复用 PDA Primitive）

**日期**：2026-05-16 03:30 ~ 04:40
**分支**：`main`
**状态**：✅ 完成 / 待用户验证 FVG/Swing 渲染样式

---

## 背景

早上的会话（`session_20260516_annotation_feature.md`）实现了 Swing Low/High + FVG 右键标注功能，但在浏览器实测中发现：

1. **Swing Low/High 标注添加成功，控制台无报错，但图表上不渲染**
2. **FVG 标注同样不渲染**（即使 `[FVG 识别] 成功` 日志出现）
3. 用户拖动图表后，Swing 标注会出现 → 说明绘制本身可行，但 attach 后没触发 redraw

---

## 根因（按发现顺序）

### Bug 1：Custom Primitive API 实现错误

最初 `annotation.js` 的 `SwingPrimitive.draw(target)` 直接使用旧式单层 API。Lightweight Charts 4.2.1 要求三层结构：

- `Primitive.updateAllViews()` → 调用 `view.update()`
- `Primitive.paneViews()` → 返回 `[view]`
- `View.update()` → 计算坐标
- `View.renderer()` → 返回 `Renderer`
- `Renderer.draw(target)` → 实际绘制

旧实现中 `draw` 永远不被调用 → 重写为三层。

### Bug 2：renderer() 持有坐标对象快照

第一次重写后，`View.renderer()` 把 `this._p1`/`this._p2` 当作参数传给 Renderer。但 Lightweight Charts 在 `update()` 之前就反复调用 `renderer()`，那批早期 Renderer 拿到的是 `{x: null, y: null}` 的对象引用。即使后来 `update()` 重新赋值 `this._p1 = {x: 332, y: 672}`（新对象），旧 Renderer 持有的旧对象不会变。

→ 改为 **view 引用模式**：`Renderer` 持有 `this._view`，在 `draw()` 时通过 `this._view._p1` 读取最新坐标。同时把 `pda-renderer.js` 的 `FvgRenderer` / `LiquidityRenderer` 也统一改成 view 引用模式（避免后续踩同一个坑）。

### Bug 3：attachPrimitive 后没触发 redraw

交互式 attach（右键添加单个标注）不会自动触发图表重绘，必须手动推一次。批量 attach（如 `loadPdaData`）紧接着会有 `setData` 触发重绘，所以 PDA 路径不显症。

→ 添加 `triggerRedraw()` 工具函数（调用 `state.chart.applyOptions({})`），在 4 处 attach/detach 之后调用。

### Bug 4：自定义 FVG 矩形使用非 bar-aligned 时间，timeToCoordinate 返回 null

最初 `FvgAnnotationPrimitive` 使用 `anchorTime ± halfBar`（半根 K 线宽）作为矩形边界。这些时间戳不在任何 bar 上，`timeToCoordinate` 返回 null，drawer 早早 return。

→ 改用 `anchor - tfSec ~ anchor + 2*tfSec`（与 `pda-renderer` FVG 一致，bar-aligned）。

### Bug 5：Swing 样式与自动扫描 PDA 不一致

最初 SL 用蓝色居中文字，SH 用橙色居中文字。用户要求：与 PDA 的 BSL/SSL **完全相同的样式**（线在右侧延伸 + 文字在右上/右下，颜色一致）。

---

## 最终方案：复用 PDA Primitive

**思路**：彻底删掉 `annotation.js` 自己实现的 Renderer/View/Primitive，直接复用 `pda-render.js` 里**已经在生产里跑通**的 `LiquidityPrimitive` 和 `FvgPrimitive`。`annotation.js` 只剩 4 个 add 函数 + clearAll，纯薄包装。

**样式映射**：

| 标注类型 | 复用的 Primitive | 线色 | 文字色 | 位置 | 说明 |
|---------|-------------|------|-----|------|------|
| Swing Low | LiquidityPrimitive | `#ffb74d` 橙 | `#ef5350` 红 | below | 与 SSL 一致 |
| Swing High | LiquidityPrimitive | `#5b9cf6` 蓝 | `#26a69a` 绿 | above | 与 BSL 一致 |
| FVG（bullish） | FvgPrimitive | - | - | - | `#26a69a33` 绿底 |
| FVG（bearish） | FvgPrimitive | - | - | - | `#ef535033` 红底 |

---

## 改动文件

### `v3/modules/pda-renderer.js`

1. `FvgRenderer` 和 `LiquidityRenderer` 改为 view 引用模式（`constructor(view)` 而非 `constructor(p1, p2, ...)`）
2. 对应的 `View.renderer()` 返回 `new XxxRenderer(this)`
3. `FvgPrimitive` 和 `LiquidityPrimitive` 加上 `export class` 关键字（供 annotation.js import）

### `v3/modules/annotation.js`

完全重写，从 354 行缩到 ~110 行：

- 删除：`SwingRenderer / SwingView / SwingPrimitive / FvgAnnotationRenderer / FvgAnnotationView / FvgAnnotationPrimitive / convertMinutesToLabel`
- 保留：`addSwingLow / addSwingHigh / addFvgAnnotation / clearAllAnnotations / annotations` 导出
- 内部：`triggerRedraw()` 调用 `chart.applyOptions({})`、`makeId()` 生成短 ID
- 全部委托给 `LiquidityPrimitive` 和 `FvgPrimitive`（来自 `pda-renderer.js`）

### 兼容性

`kline_viewer.html:241` 处的 import 不变：`addSwingLow / addSwingHigh / addFvgAnnotation`。后两个函数虽然忽略了 `timeframe` 参数，但 JS 传多余参数无副作用，不需改 caller。

---

## 待验证

刷新浏览器后，应当：

- [ ] 右键 K 线 → "标注 Swing Low"：立刻显示橙色短线 + 红色 "SL" 文字（在线右下）
- [ ] 右键 K 线 → "标注 Swing High"：立刻显示蓝色短线 + 绿色 "SH" 文字（在线右上）
- [ ] 右键 FVG 区域 → "标注 FVG"：立刻显示半透明矩形（绿底 = bullish，红底 = bearish）
- [ ] 三种标注都不需要拖动图表就能看见
- [ ] 样式与左边自动扫描出的 BSL/SSL/FVG 视觉完全一致

---

## 关键经验

1. **Lightweight Charts 4.x 的 Custom Primitive 必须用三层架构**（Primitive / View / Renderer），且 Renderer 应通过 view 引用读坐标，不要持有坐标对象快照。
2. **交互式 attachPrimitive 后必须手动 redraw**（`chart.applyOptions({})`），批量 attach 因为后续会 `setData` 所以"看起来"不需要。
3. **不要重复造轮子**：自动扫描 PDA 已经有可用的 Renderer，标注功能本质上就是同样的几何 + 不同的颜色/标签，应当复用而非重写。这次绕了 4 个 bug 才回到这个判断。

---

## 提交

待此次会话结束时一并 commit（用户即将 `/clear`，需要让下次会话能直接接驳）。

---

## 顺便记录的待修 Bug（非本次工作内容）

- **周期切换下拉菜单切换后图表不刷新**：点 `tfSelect` 切换周期，K 线没换。已加到 `TODO.md` 的"已知 Bug"小节，下次处理。
