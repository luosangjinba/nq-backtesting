# 会话记录 - 周期切换 Bug 修复

**日期**：2026-05-16 17:00  
**分支**：`main`  
**提交**：`258934b`

---

## 问题描述

**现象**：点击周期下拉菜单选择新周期（例如 1H → 15M），图表不切换为新周期的 K 线

**影响**：用户无法通过下拉菜单切换周期，必须重新输入时间并点击"加载"按钮

**优先级**：中（不影响标注功能验证，但影响多周期工作流）

---

## 问题分析

### 排查过程

1. **检查事件监听器**
   - 查看 `v3/docs/kline_viewer.html` 中的 `initEventListeners()` 函数
   - 发现只有 `loadBtn` 绑定了 `click` 事件
   - **根因**：`tfSelect` 没有绑定 `change` 事件监听器

2. **确认修复方案**
   - 需要在 `tfSelect` 的 `change` 事件中调用 `refreshData()`
   - `refreshData()` 会重新读取当前的时间范围和周期，重新加载数据
   - 需要检查是否已加载数据，避免在未加载时触发刷新

---

## 解决方案

### 修改内容

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

### 关键逻辑

1. **事件监听**：监听 `tfSelect` 的 `change` 事件
2. **条件检查**：只有在已加载数据时才刷新（`state.candleData && state.candleData.length > 0`）
3. **自动刷新**：调用 `refreshData()` 重新加载当前时间范围的数据
4. **调试日志**：添加控制台日志以便调试

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
git commit -m "fix: 修复周期切换下拉菜单不刷新图表的问题

- 在 initEventListeners() 中添加 tfSelect 的 change 事件监听器
- 当周期改变时，如果已加载数据，自动调用 refreshData() 刷新图表
- 添加控制台日志以便调试

问题：点击周期下拉菜单选择新周期后，图表不切换为新周期的 K 线
根因：tfSelect 没有绑定 change 事件监听器
解决：添加事件监听器，检测到周期变化时自动刷新数据"
```

**提交哈希**：`258934b`

---

## 相关文件

- `v3/docs/kline_viewer.html` - 主页面（+9 行）
- `v3/TODO.md` - 更新状态和会话记录索引
- `v3/sessions/session_20260516_timeframe_switch_fix.md` - 本会话记录

---

## 经验总结

### 问题根因

- **遗漏事件绑定**：在实现周期选择器时，只添加了 UI 元素，没有绑定事件监听器
- **测试覆盖不足**：没有测试周期切换功能，导致问题未被及时发现

### 改进建议

1. **功能清单**：在实现新功能时，列出所有交互点，确保每个交互都有对应的事件处理
2. **测试流程**：在提交前测试所有交互路径，包括边缘情况
3. **代码审查**：检查所有 UI 元素是否都有对应的事件监听器

### 类似问题排查

如果遇到类似的"UI 元素不响应"问题，排查步骤：

1. 检查 HTML 中是否有对应的元素（ID 是否正确）
2. 检查 `initEventListeners()` 中是否绑定了事件
3. 检查事件处理函数是否正确（函数名、参数）
4. 检查浏览器控制台是否有 JavaScript 错误
5. 添加 `console.log` 确认事件是否触发

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
