# 开发会话记录

## 2026-05-09 下午 - TF切换保持视图 & 移除扩展功能 & 右键菜单优化

### 背景
用户接手项目，提出三个需求：
1. 切换时间周期（TF）时，保持当前显示的时间区间不变
2. 移除"扩展K线根数"功能
3. 优化右键菜单，将标记类菜单项折叠为悬浮子菜单

### 完成的工作

#### 1. TF切换保持视图功能 ✅
- **问题**：切换TF时会重置到只显示第一根K线
- **需求**：以当前显示的K线为基础计算新TF，保持时间区间不变

- **实现方案**：
  1. **保存时间范围**（第2963-2980行）
     - 在 `tfSelect.onchange` 事件中
     - 切换前保存当前显示的起始和结束时间戳到 `replayState.savedTimeRange`
  
  2. **恢复时间范围**（第2285-2313行）
     - 在 `loadData()` 函数中检查 `savedTimeRange`
     - 在新TF数据中找到对应的结束时间索引
     - 设置 `replayState.currentIndex` 为该索引
     - 显示从第一根到该索引的所有K线
  
  3. **保持视图位置**（第2359-2367行）
     - 当 `initialIndex > 0` 时（表示TF切换），跳过 `resetView()`
     - 避免视图被重置到最右边

- **代码修改**：
  - 添加 `replayState.savedTimeRange` 字段（第1134行）
  - 修改 `tfSelect.onchange` 事件处理器
  - 修改 `loadData()` 函数的初始化逻辑
  - 修改 `onDataReady` 处理器的视图重置逻辑
  - 更新信息显示使用实际的 `currentIndex`（第2403行）

- **测试说明**：详见 `TF_SWITCH_TEST.md`

#### 2. 移除扩展K线根数功能 ✅
- **移除内容**：
  - HTML：移除"扩展"输入框和警告文本（第752、759行）
  - JavaScript：移除 `MAX_PADDING` 常量（第1105行）
  - JavaScript：移除 `getPadding()` 函数（第1314-1326行）
  - JavaScript：移除 `paddingInput.onchange` 事件监听器（第3005行）
  - API调用：移除 `padding` 参数（第2180行）

- **效果**：工具栏更简洁，只保留必要控件

#### 3. 右键菜单悬浮子菜单 ✅
- **问题**：右键菜单有4个独立的"标记"菜单项，显得冗长
- **需求**：折叠为子菜单，并在右侧悬浮显示

- **实现方案**：
  1. **HTML结构调整**（第793-804行）
     - 将4个独立菜单项改为一个父菜单项"标记 PDA"
     - 子菜单容器嵌套在父菜单项内部
     - 包含BSL、SSL、FVG、OB四个子选项
  
  2. **CSS样式**（第714-756行）
     - 父菜单项添加 `.has-submenu` 类，显示右侧箭头 `▶`
     - 子菜单使用绝对定位：`position: absolute`
     - 位置设置：`left: 100%`（父菜单右侧），`top: -5px`（顶部对齐）
     - 使用 `:hover` 伪类控制显示：`.has-submenu:hover .ctx-submenu { display: block; }`
     - 子菜单独立的背景、边框、圆角
  
  3. **JavaScript简化**（第3279-3297行）
     - 移除点击展开/折叠逻辑
     - 完全依赖CSS的hover效果
     - 保持简单的全局点击关闭逻辑

- **效果**：
  - 鼠标悬停在"标记 PDA"上时，子菜单立即在右侧弹出
  - 符合传统桌面应用的菜单交互习惯
  - 纯CSS实现，性能更好，无JavaScript延迟

### 文件修改
- `v2/docs/kline_viewer.html`
  - TF切换保持视图功能（多处修改）
  - 移除扩展K线根数功能（多处删除）
  - 右键菜单悬浮子菜单（HTML、CSS、JavaScript）
- `TF_SWITCH_TEST.md`（新建）
  - TF切换功能的测试说明和技术文档
- `CTX_MENU_FOLD.md`（新建/更新）
  - 右键菜单悬浮子菜单的实现说明

### 技术细节

#### 时间范围恢复算法
```javascript
// 保存当前时间范围
replayState.savedTimeRange = {
  startTime: currentData[0].timestamp,
  endTime: currentData[currentData.length - 1].timestamp
};

// 在新TF数据中找到对应索引
let targetIndex = candleData.findIndex(bar => bar.timestamp > endTime);
if (targetIndex === -1) {
  targetIndex = candleData.length - 1;
} else if (targetIndex > 0) {
  targetIndex = targetIndex - 1;
}
```

#### 悬浮子菜单关键CSS
```css
.ctx-submenu {
  position: absolute;
  left: 100%;
  top: -5px;
  display: none;
  z-index: 101;
}
.ctx-menu-item.has-submenu:hover .ctx-submenu {
  display: block;
}
```

### 已知限制
- 切换TF后 `viewportAnchor` 会重置，用户需重新滚动设置锚点
- Y轴压缩状态保持不变（`yAxisCompressed` 不重置）
- 子菜单如果超出屏幕右侧，当前未实现自动调整位置

### 当前状态
- API服务运行中（PID=3404961，端口8765）
- 静态文件服务器运行中（端口8000）
- 待提交到git

---

## 2026-05-09 上午 - K线回放功能改进与 Bug 修复

### 背景
上次会话因上下文满中断，本次继续完成 Y 轴价格密度压缩功能，并修复回放模式下的 FVG 显示 bug。

### 完成的工作

#### 1. Y轴价格密度压缩功能 ✅
- **问题**：上次会话中断，代码已实现但未验证
- **验证**：添加调试日志，确认功能正常工作
  - 压缩前：1800.8 - 1806.65（5.85点）
  - 压缩后：1799.34 - 1808.11（8.78点）
  - 扩大比例：1.5x（50%）
- **调整**：应用户要求，将压缩系数从 1.5 改为 2.0（强力压缩）
- **位置**：`v2/docs/kline_viewer.html` 第 2337-2370 行
- **状态标志**：`replayState.yAxisCompressed` 防止重复压缩

#### 2. 修复回放模式下 FVG 矩形显示 Bug ✅
- **问题描述**：
  - 向后拖动播放条遮蔽 K 线时，FVG 矩形不消失
  - 矩形错误地停留在屏幕右侧最后一根 K 线位置
  
- **根本原因**：
  - `findBarIndex(candleData, pdaTimeMs)` 返回 `<= targetTsMs` 的最后一根 K 线
  - 当 FVG 时间戳在未来（如第 60 根），但当前只播放到第 50 根时
  - 函数返回第 49 根（最接近的），导致 FVG 被错误绘制在当前最后一根 K 线位置

- **修复方案**：
  - 在 `buildPdaOverlays()` 函数开头添加时间范围检查
  - 如果在回放模式下，PDA 时间戳晚于当前最后一根可见 K 线，直接返回空数组
  - 这个修复适用于所有 PDA 类型（BSL、SSL、FVG、OB、EQH、EQL 等）

- **代码位置**：`v2/docs/kline_viewer.html` 第 1785-1801 行

```javascript
// 在回放模式下检查 PDA 是否在可见时间范围内
const lastVisibleBarTime = candleData[candleData.length - 1].timestamp;
if (replayState.enabled && pdaTimeMs > lastVisibleBarTime) {
  return []; // PDA 在未来，不绘制
}
```

### 技术细节

#### Y轴压缩实现
```javascript
const expandFactor = 2.0;  // 扩大100%价格范围
const center = (range.from + range.to) / 2;
const newRange = range.range * expandFactor;
const newFrom = center - newRange / 2;
const newTo = center + newRange / 2;
yAxis.setRange({ from: newFrom, to: newTo, ... });
```

#### FVG 时间范围检查
- **检查时机**：在 `buildPdaOverlays()` 开头，`findBarIndex()` 之前
- **检查条件**：`replayState.enabled && pdaTimeMs > lastVisibleBarTime`
- **效果**：确保 PDA 只在其时间戳到达时才显示，符合回放模式的时间逻辑

### 文件修改
- `v2/docs/kline_viewer.html`
  - 添加 Y 轴压缩调试日志（第 2340-2370 行）
  - 修改压缩系数为 2.0（第 2351 行）
  - 添加 PDA 时间范围检查（第 1797-1801 行）

### 测试验证
1. **Y轴压缩**：控制台日志显示压缩成功，价格范围扩大 2 倍
2. **FVG Bug**：待用户测试验证（需强制刷新浏览器）

### 待办事项
- [ ] 用户测试验证 FVG bug 修复
- [ ] 清理调试日志（如果不需要）
- [ ] 提交代码到 git
- [ ] 整理和清理文档文件

### 当前状态
- **工作区状态**：
  - 已修改：`v2/docs/kline_viewer.html`
  - 未跟踪文件：大量文档（.md）和截图（.png）
  - 本地分支领先 origin/main 57 个提交
- **等待用户**：
  - 测试 FVG bug 修复效果
  - 决定是否提交代码
  - 决定如何处理文档文件

### 相关文档
- `v2/KLINE_DENSITY.md` - Y轴密度压缩说明
- `v2/REPLAY_SUMMARY.md` - 回放功能完整总结

---
