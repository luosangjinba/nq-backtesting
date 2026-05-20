# Session 2026-05-20: V4 Chart Viewport Controls

## 目标
实现类似 TradingView 底部浮动视口工具条的第一版：Zoom out / Zoom in / Reset chart view / Scroll left / Scroll right / Scroll to latest。

## 关键决策
- 该功能与 Replay Bar 分支不同，单独切出 `feature/v4-chart-viewport-controls`。
- 不引入插件；LightweightCharts 原生 timeScale API 已覆盖视口控制需求。
- 视口操作统一基于 logical range：
  - `getVisibleLogicalRange()`
  - `setVisibleLogicalRange()`
- `Reset chart view` 回到当前加载数据的默认显示策略，复用 `showStartOfData()`。
- `Scroll to latest` 保持当前缩放宽度，只把视口滚到最新 K 线右侧留约 7 根空间。
- `Maximize / restore chart` 先只在 controller 中预留空接口，后续交给多窗口 layout manager。

## 完成内容
1. 新增 `v4/src/chart/viewport-controller.js`
   - `zoomIn()`
   - `zoomOut()`
   - `scrollLeft()`
   - `scrollRight()`
   - `scrollToLatest()`
   - `resetChartView()`
   - `maximizeChart()` / `restoreChart()` 预留
2. 新增 `v4/src/ui/viewport-controls.js`
   - chart 内底部浮动控制条
   - 控件无数据时禁用，有数据后启用
   - `Alt + R` 触发 reset chart view
3. 修改 `v4/src/chart/chart-manager.js`
   - 新增 `setVisibleLogicalRange()`
   - 新增 `resetTimeScale()`
4. 修改 `v4/index.html`
   - 在 chart 容器内新增 `#viewport-controls`
5. 修改 `v4/src/app.js`
   - 初始化 viewport controls
6. 修改 `v4/style.css`
   - 新增 TradingView 风格的底部浮动按钮样式

## 当前交互
- `-`: Zoom out
- `+`: Zoom in
- `⛶`: Reset chart view
- `‹`: Scroll left
- `›`: Scroll right
- `↻`: Scroll to latest
- `Alt + R`: Reset chart view

## 验证
- `node --check v4/src/chart/viewport-controller.js` 通过。
- `node --check v4/src/ui/viewport-controls.js` 通过。
- `node --check v4/src/app.js` 通过。
- Headless Chrome 能初始化 `http://127.0.0.1:8000/v4/index.html`，控件正常渲染。

## 后续
- 根据实盘视觉反馈微调浮动位置、按钮尺寸、图标。
- 多窗口布局落地后接入 maximize / restore chart。
- 统一整理 Replay 与 Viewport 的快捷键冲突处理。
