# 会话记录 - 周期切换 Bug 修复

**日期**：2026-05-16 17:00  
**分支**：`main`  
**提交**：`258934b`, `3db9fff`, `875bcb8`

---

## 问题描述

**现象 1**：点击周期下拉菜单选择新周期（例如 1H → 15M），图表不切换为新周期的 K 线

**现象 2**（修复现象 1 后出现）：切换周期后，图表消失（空白）

**影响**：用户无法通过下拉菜单切换周期

**优先级**：中（不影响标注功能验证，但影响多周期工作流）

---

## 问题分析

### 问题 1：周期切换不触发刷新

**排查过程**：
1. 检查事件监听器
   - 查看 `v3/docs/kline_viewer.html` 中的 `initEventListeners()` 函数
   - 发现只有 `loadBtn` 绑定了 `click` 事件
   - **根因**：`tfSelect` 没有绑定 `change` 事件监听器

2. 确认修复方案
   - 需要在 `tfSelect` 的 `change` 事件中调用 `refreshData()`
   - `refreshData()` 会重新读取当前的时间范围和周期，重新加载数据
   - 需要检查是否已加载数据，避免在未加载时触发刷新

### 问题 2：切换周期后图表消失

**排查过程**：
1. 检查控制台日志
   - API 返回了 456 条 K 线数据（数据加载成功）
   - 但图表显示为空白

2. 检查回放模块
   - `loadReplayData()` 被调用，`currentIndex` 被设置为 0
   - `renderCurrentBars()` 使用 `slice(0, 0)` 返回空数组
   - **根因**：首次加载或切换周期时，`currentIndex` 为 0，导致显示 0 根 K 线

3. 确认修复方案
   - 首次加载或切换周期时，应该显示所有 K 线
   - 将 `currentIndex` 设置为 `bars.length`，而不是 0

---

## 解决方案

### 修复 1：添加周期切换事件监听器

**文件**：`v3/docs/kline_viewer.html`

**位置**：`initEventListeners()` 函数，第 665-674 行

**修改前**：
```javascript
// 加载按钮
document.getElementById('loadBtn').addEventListener('click', loadKlineData);

// 时间输入框格式化
['startInput', 'endInput'].forEach((id) => {
  // ...
});
```

**修改后**：
```javascript
// 加载按钮
document.getElementById('loadBtn').addEventListener('click', loadKlineData);

// 周期切换
document.getElementById('tfSelect').addEventListener('change', () => {
  console.log('[周期切换] 触发重新加载');
  // 如果已经加载过数据，则自动刷新
  if (state.candleData && state.candleData.length > 0) {
    refreshData();
  }
});

// 时间输入框格式化
['startInput', 'endInput'].forEach((id) => {
  // ...
});
```

**关键逻辑**：
1. **事件监听**：监听 `tfSelect` 的 `change` 事件
2. **条件检查**：只有在已加载数据时才刷新（`state.candleData && state.candleData.length > 0`）
3. **自动刷新**：调用 `refreshData()` 重新加载当前时间范围的数据
4. **调试日志**：添加控制台日志以便调试

### 修复 2：首次加载显示所有 K 线

**文件**：`v3/modules/replay.js`

**位置**：`loadReplayData()` 函数，第 83-95 行

**修改前**：
```javascript
// 尝试恢复进度
const savedProgress = loadProgress();
if (
  savedProgress &&
  savedProgress.start === start &&
  savedProgress.end === end &&
  savedProgress.tf === tf
) {
  replayState.currentIndex = savedProgress.index;
  console.log(`恢复进度: ${savedProgress.index}/${bars.length}`);
} else {
  replayState.currentIndex = 0;
}
```

**修改后**：
```javascript
// 尝试恢复进度
const savedProgress = loadProgress();
if (
  savedProgress &&
  savedProgress.start === start &&
  savedProgress.end === end &&
  savedProgress.tf === tf
) {
  replayState.currentIndex = savedProgress.index;
  console.log(`恢复进度: ${savedProgress.index}/${bars.length}`);
} else {
  // 首次加载或切换周期时，显示所有 K 线
  replayState.currentIndex = bars.length;
  console.log(`首次加载，显示所有 K 线: ${bars.length}`);
}
```

**关键逻辑**：
1. **恢复进度**：如果时间范围和周期匹配，恢复之前的进度
2. **首次加载**：如果不匹配（首次加载或切换周期），显示所有 K 线
3. **避免空白**：`currentIndex = bars.length` 确保 `renderCurrentBars()` 显示所有数据

---

## 验证步骤

1. 访问 `http://127.0.0.1:8000/docs/kline_viewer.html`
2. 输入时间：`2012-01-09 02:00` 到 `2012-01-09 16:00`
3. 点击"加载"按钮
4. 切换周期下拉菜单（例如从 1H 切换到 15M）
5. **预期结果**：
   - 图表自动刷新
   - 显示新周期的 K 线
   - PDA 数据一并刷新
   - 控制台输出 `[周期切换] 触发重新加载`

---

## 提交记录

```bash
# 修复 1：添加周期切换事件监听器
git commit -m "fix: 修复周期切换下拉菜单不刷新图表的问题

- 在 initEventListeners() 中添加 tfSelect 的 change 事件监听器
- 当周期改变时，如果已加载数据，自动调用 refreshData() 刷新图表
- 添加控制台日志以便调试

问题：点击周期下拉菜单选择新周期后，图表不切换为新周期的 K 线
根因：tfSelect 没有绑定 change 事件监听器
解决：添加事件监听器，检测到周期变化时自动刷新数据"

# 修复 2：首次加载显示所有 K 线
git commit -m "fix: 修复切换周期后图表消失的问题

- 首次加载或切换周期时，currentIndex 设置为 bars.length（显示所有 K 线）
- 之前设置为 0，导致 renderCurrentBars() 显示 0 根 K 线，图表消失

问题：切换周期后，图表消失（空白）
根因：loadReplayData() 中 currentIndex 被设置为 0，renderCurrentBars() 使用 slice(0, 0) 返回空数组
解决：首次加载时显示所有 K 线，而不是 0 根"
```

**提交哈希**：
- `258934b` - 修复 1（添加事件监听器）
- `3db9fff` - 修复 2（显示所有 K 线）
- `875bcb8` - 优化 3（注释调试日志）

---

## 附加优化：清理调试日志

**问题**：切换周期后，控制台出现大量 `[DEBUG] anchorCoord 为 null，标记不会显示: SL` 警告

**原因**：
- 当 PDA 的锚点时间不在当前图表的时间范围内时，`anchorCoord` 为 `null`
- 这在切换周期时是正常现象（例如 1H 周期的 PDA 在 15M 周期中可能找不到精确匹配的时间点）
- 这些警告日志是开发时用于调试的，不应该在正常使用时显示

**解决**：
- 将 `console.warn` 改为注释掉的 `console.debug`
- 添加注释说明这是正常情况
- 减少控制台噪音，提升用户体验

**文件**：`v3/modules/pda-renderer.js`，第 226-228 行

---

## 相关文件

- `v3/docs/kline_viewer.html` - 主页面（+9 行）
- `v3/modules/replay.js` - 回放模块（+3 行，-1 行）
- `v3/modules/pda-renderer.js` - PDA 渲染模块（+3 行，-1 行）
- `v3/TODO.md` - 更新状态和会话记录索引
- `v3/sessions/session_20260516_timeframe_switch_fix.md` - 本会话记录

---

## 经验总结

### 问题根因

**问题 1**：
- **遗漏事件绑定**：在实现周期选择器时，只添加了 UI 元素，没有绑定事件监听器
- **测试覆盖不足**：没有测试周期切换功能，导致问题未被及时发现

**问题 2**：
- **回放逻辑缺陷**：首次加载时，`currentIndex` 为 0，导致显示 0 根 K 线
- **边界条件未考虑**：`renderCurrentBars()` 使用 `slice(0, currentIndex)`，当 `currentIndex` 为 0 时返回空数组
- **用户体验问题**：切换周期后图表消失，用户不知道发生了什么

### 改进建议

1. **功能清单**：在实现新功能时，列出所有交互点，确保每个交互都有对应的事件处理
2. **测试流程**：在提交前测试所有交互路径，包括边缘情况
3. **代码审查**：检查所有 UI 元素是否都有对应的事件监听器
4. **边界条件**：在实现数组切片等操作时，考虑边界情况（0、空数组、最大值）
5. **用户反馈**：在数据加载过程中，提供清晰的状态反馈（加载中、成功、失败）

### 类似问题排查

如果遇到类似的"UI 元素不响应"或"数据加载后不显示"问题，排查步骤：

1. 检查 HTML 中是否有对应的元素（ID 是否正确）
2. 检查 `initEventListeners()` 中是否绑定了事件
3. 检查事件处理函数是否正确（函数名、参数）
4. 检查浏览器控制台是否有 JavaScript 错误
5. 添加 `console.log` 确认事件是否触发
6. 检查数据流：API → 数据转换 → 状态更新 → UI 渲染
7. 检查边界条件：空数组、0 值、null/undefined

---

## 下一步工作

**选项 1**：推进阶段 3（行情段标注）
- Swing Low/High 手动标记
- 行情段连线渲染
- PDA 关联

**选项 2**：推进阶段 E（PDA 工作台实现）
- PDA 列表显示
- PDA 编辑/删除
- PDA 选择交互

**选项 3**：根据 `CODE_QUALITY_REPORT.md` 的建议进行代码优化

---

**修复完成！** ✅
