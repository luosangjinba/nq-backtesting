# Session 2026-05-20: V4 Replay Bar MVP

## 目标
实现类似 TradingView Bar Replay 的最小可用版本：开启/关闭 replay、回退到第一根、回到上次位置、选择指定 K 线、逐根前进/后退、自动播放。

## 关键决策
- Replay Bar 默认关闭，关闭时恢复正常完整数据视图。
- “完整数据视图”沿用现有 `showStartOfData()` 策略：视口只显示必要宽度的 K 线，多余部分通过拖动/滚动查看，不压缩全部 K 线到 canvas。
- `Select bar` 不再作为一级主按钮，合并为 `Pick`，表示“选择回退位置”。
- Replay 状态只存在前端会话内，不写 DB，不写 localStorage。
- 后续“跳转到指定时间”单独增强，不放进 MVP。

## 完成内容
1. 新增 `v4/src/ui/replay-controls.js`
   - Replay Bar On/Off 主开关
   - First / Last Pos / Pick
   - 上一根 / 播放暂停 / 下一根
   - 速度选择：1x / 3x / 5x / 7x / 10x
2. 修改 `v4/src/app.js`
   - 初始化 replay controls
   - 每次 bars loaded 后同步 replay 数据
3. 修改 `v4/src/chart/chart-manager.js`
   - 新增 `updateBar()`
   - 新增 `showEndOfData()` 用于 replay 播放时视图跟随
4. 修改 `v4/src/data/bar-store.js`
   - 默认 timeframe 与 toolbar 默认值对齐
5. 修改 `v4/style.css`
   - 增加底部 Replay Bar 样式
6. 修改 `v4/index.html`
   - 启用 replay controls 容器

## 当前交互
- `Replay Bar Off`: 正常图表模式。
- `Replay Bar On`: 进入 replay；优先回到上次位置，没有上次位置则回到当前区间第一根。
- `First`: 回退到当前加载区间第一根 K 线。
- `Last Pos`: 回到上次退出或跳转前的位置。
- `Pick`: 点击图表选择回退位置。
- `< / >`: 逐根后退 / 前进。
- `▶ / ||`: 自动播放 / 暂停。
- `X`: 退出 replay 并恢复正常图表。

## 验证
- `node --check v4/src/ui/replay-controls.js` 通过。
- Headless Chrome 能初始化 `http://127.0.0.1:8000/v4/index.html`。
- 无数据时 replay 操作按钮禁用，加载数据后由 `syncReplayData()` 启用。

## 后续
- 跳转到指定时间。
- 键盘快捷键。
- 当前 replay cursor 视觉标记。
- Pick 状态提示优化。
