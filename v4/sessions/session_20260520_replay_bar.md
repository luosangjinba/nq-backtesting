# Session 2026-05-20: V4 Replay Bar MVP

## 目标
实现类似 TradingView Bar Replay 的最小可用版本：开启/关闭 replay、回退到第一根、回到上次位置、选择指定 K 线、逐根前进/后退、自动播放。

## 关键决策
- Replay Bar 默认关闭，关闭时恢复正常完整数据视图。
- “完整数据视图”沿用现有 `showStartOfData()` 策略：视口只显示必要宽度的 K 线，多余部分通过拖动/滚动查看，不压缩全部 K 线到 canvas。
- `Select bar` 不再作为一级主按钮，合并为 `Pick`，表示“选择回退位置”。
- Replay 状态只存在前端会话内，不写 DB，不写 localStorage。
- 后续“跳转到指定时间”单独增强，不放进 MVP。
- Replay 播放/逐根前进不再 `fitContent()`；默认让最新 K 线锚定在 canvas 右侧约 7 根 K 线位置。
- Replay 前进时保留当前可见逻辑范围；如果用户播放中拖动/缩放，下一根会继承新的视口和锚点。
- Replay cursor 使用 series primitive 绘制竖线，只作为前端视觉定位，不写入数据。
- Replay On 状态切换周期时，按旧 cursor timestamp 在新周期中找对应 K 线并保持 Replay On；保留切换前手动拖动/缩放后的 viewport 锚点，自动播放先暂停。
- Replay Bar 支持输入时间跳转，复用 `formatTimeInput()`，按不晚于目标 timestamp 的最近 K 线定位。
- Replay Bar 支持键盘快捷键；输入框、选择框、可编辑区域聚焦时不响应快捷键。

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
   - `showEndOfData()` 改为基于 previous visible logical range 计算右侧锚点，避免 K 线突然贴左、过宽或过细
   - 新增 `showReplayCursor()` / `hideReplayCursor()` 管理 replay cursor 竖线
4. 修改 `v4/src/data/bar-store.js`
   - 默认 timeframe 与 toolbar 默认值对齐
5. 修改 `v4/style.css`
   - 增加底部 Replay Bar 样式
6. 修改 `v4/index.html`
   - 启用 replay controls 容器

## 当前交互
- `Replay Bar Off`: 正常图表模式。
- `Replay Bar On`: 进入 replay；优先回到上次位置，没有上次位置则回到当前区间第一根。
- Replay 播放/逐根前进：最新 K 线默认在右侧留约 7 根 K 线空间；播放中拖动/缩放后，下一根沿用新的视口锚点。
- Replay cursor: Replay On 后当前 K 线位置显示竖线；First / Last Pos / Pick / 上一根 / 下一根 / 自动播放时同步移动；Replay Off 后清除。
- 周期切换：Replay On 时切换周期不会退出 Replay，会对齐到新周期中不晚于旧 cursor timestamp 的最近 K 线，并继承切换前的可见 logical range 与右侧锚点。
- 时间跳转：Replay On 时可输入 `YYYY-MM-DD HH:mm` 或 `YYYYMMDDHHmm` 后按 Enter / Go，跳到当前加载区间内不晚于目标时间的最近 K 线；失败时只提示，不改变 cursor。
- 键盘快捷键：`Space` 播放/暂停，`ArrowRight` 下一根，`ArrowLeft` 上一根，`Home` 回第一根，`Esc` 退出 Pick 或关闭 Replay。
- `First`: 回退到当前加载区间第一根 K 线。
- `Last Pos`: 回到上次退出或跳转前的位置。
- `Pick`: 点击图表选择回退位置。
- `< / >`: 逐根后退 / 前进。
- `▶ / ||`: 自动播放 / 暂停。
- `X`: 退出 replay 并恢复正常图表。

## 验证
- `node --check v4/src/ui/replay-controls.js` 通过。
- `node --check v4/src/chart/chart-manager.js` 通过。
- Headless Chrome 能初始化 `http://127.0.0.1:8000/v4/index.html`。
- 无数据时 replay 操作按钮禁用，加载数据后由 `syncReplayData()` 启用。

## 后续
- Pick 状态提示优化。
