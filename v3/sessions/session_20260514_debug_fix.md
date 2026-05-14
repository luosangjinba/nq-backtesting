# V3 开发会话 - 2026-05-14 调试修复（日级 PDA 时间映射）

## 会话信息

- **日期：** 2026-05-14 下午
- **时长：** ~60 分钟
- **主要目标：** 修复日级 PDA 不显示问题
- **模型：** Claude Opus 4.7
- **分支：** `feature/context-menu-research`

---

## 一、问题诊断

### 1.1 问题现象

**用户反馈**：
- 日级 PDA（Daily High/Low, ICT Midnight High/Low）不显示
- 数据已加载和合并，但渲染统计显示计数为 0
- 控制台没有看到 "✓ 添加 XXX 标记" 日志

### 1.2 调试准备

**添加调试日志（3 层）**：

1. **数据处理层**（loadPdaData 的 forEach 循环）
   - 显示每条日级 PDA 记录的 timestamp, price, record
   - 确认是否调用渲染函数

2. **渲染函数层**（addDailyHighMarker 等函数内部）
   - 显示传入的参数
   - 确认函数执行完成

3. **底层渲染层**（LiquidityView.update 方法）
   - 显示坐标转换结果（anchorCoord, y）
   - 如果 anchorCoord 为 null，警告标记不会显示

### 1.3 根因发现

**浏览器控制台日志**：
```
[DEBUG] LiquidityView.update: {label: 'Daily High', anchorTime: 1326189840, price: 2378.25, anchorCoord: null, y: 280.46}
[DEBUG] anchorCoord 为 null，标记不会显示: Daily High
```

**根因分析**：
- 日级 PDA 的 `occurrenceTime` 不在 K 线数据的时间点上
- 例如：K 线数据是 1H 周期（整点：09:00, 10:00, 11:00...）
- Daily High 发生在 10:04:00（非整点）
- `timeScale.timeToCoordinate(1326189840)` 返回 `null`
- 导致标记无法渲染

**验证**：
- 部分日级 PDA 的 `anchorCoord` 不为 null（例如 Daily Low: 1326132000 → 270.95）
- 说明只有时间点恰好在 K 线上的才能显示
- 大部分日级 PDA 的时间点不在 K 线上，所以不显示

---

## 二、解决方案

### 2.1 技术方案

**核心思路**：将日级 PDA 的时间映射到最近的 K 线时间

**实现步骤**：
1. 存储所有 K 线的时间戳到 `state.barTimestamps`
2. 添加 `findNearestBarTime()` 函数，查找最接近目标时间的 K 线时间
3. 在渲染日级 PDA 前，将时间映射到最近的 K 线时间

### 2.2 代码实现

#### 1. 存储 K 线时间戳

**位置**：`loadKlineData` 函数

```javascript
// 设置数据
state.candlestickSeries.setData(candleData);

// 存储 K 线时间戳列表（用于日级 PDA 查找最近时间）
state.barTimestamps = candleData.map((bar) => bar.time);
```

#### 2. 添加查找最近时间的函数

**位置**：`clearAllPdaMarkers` 函数之后

```javascript
/**
 * 查找最接近目标时间的 K 线时间戳
 * @param {number} targetTime - 目标时间戳（秒）
 * @returns {number|null} - 最接近的 K 线时间戳，如果没有 K 线数据则返回 null
 */
function findNearestBarTime(targetTime) {
  if (!state.barTimestamps || state.barTimestamps.length === 0) {
    return null;
  }

  let nearest = state.barTimestamps[0];
  let minDiff = Math.abs(targetTime - nearest);

  for (const barTime of state.barTimestamps) {
    const diff = Math.abs(targetTime - barTime);
    if (diff < minDiff) {
    minDiff = diff;
      nearest = barTime;
    }
  }

  return nearest;
}
```

#### 3. 在渲染前映射时间

**位置**：`loadPdaData` 函数的 forEach 循环中，时间转换之后

```javascript
// 日级 PDA 需要查找最近的 K 线时间（因为 occurrence_time 可能不在 K 线数据中）
if (useOccurrenceTime) {
  const nearestTime = findNearestBarTime(timestamp);
  if (nearestTime !== null) {
    console.log(
      `[DEBUG] 日级 PDA 时间映射: ${pdaType} ${timestamp} → ${nearestTime} (偏移 ${Math.abs(timestamp - nearestTime)}s)`
    );
    timestamp = nearestTime;
  } else {
    console.warn(`[DEBUG] 无法找到最近的 K 线时间: ${pdaType} ${timestamp}`);
  }
}
```

#### 4. 添加 null 警告

**位置**：`LiquidityView.update` 方法

```javascript
if (anchorCoord !== null) {
  const logical = timeScale.coordinateToLogical(anchorCoord);
  if (logical !== null) {
    rightX = timeScale.logicalToCoordinate(logical + this._source._options.lineLength);
  }
} else {
  console.warn('[DEBUG] anchorCoord 为 null，标记不会显示:', this._source._label);
}
```

### 2.3 代码清理

**清理调试日志**：
- 删除大部分 DEBUG 日志（addDailyHighMarker 被调用、完成等）
- 保留关键日志：时间映射、anchorCoord 为 null 警告
- 共删除 14 行调试日志

**代码格式化**：
```bash
npx --yes prettier@3.3.3 --write v3/docs/kline_viewer.html
```

---

## 三、测试验证

### 3.1 预期日志

```
✓ 获取到 45 条 1H PDA 记录
当前周期 >= 15M，额外加载日级 PDA...
✓ 获取到 17 条日级 PDA 记录
✓ 合并后共 62 条 PDA 记录

[DEBUG] 日级 PDA 时间映射: daily_high 1326189840 → 1326189600 (偏移 240s)
[DEBUG] 日级 PDA 时间映射: daily_low 1326132000 → 1326132000 (偏移 0s)
[DEBUG] 日级 PDA 时间映射: ict_midnight_day_high 1326094800 → 1326092400 (偏移 2400s)
...

PDA 渲染统计: {bsl: 12, ssl: 12, fvg: 21, nwog: 0, ndog: 3, daily_high: 4, daily_low: 4, ...}
```

### 3.2 预期结果

- ✅ 所有日级 PDA 都能正确显示
- ✅ 标记显示在最接近实际发生时间的 K 线上
- ✅ 控制台不再有大量 "anchorCoord 为 null" 警告
- ✅ 时间偏移在控制台日志中显示，方便验证映射是否合理

---

## 四、提交记录

### 4.1 Git 提交

**提交信息**：
```
fix(kline_viewer): 日级 PDA 时间映射到最近 K 线

问题：日级 PDA 的 occurrence_time 不在 K 线时间点上，导致 anchorCoord 为 null，标记不显示

根因：
- K 线数据：1H 周期（整点：09:00, 10:00, 11:00...）
- Daily High 发生在：10:04:00（非整点）
- timeScale.timeToCoordinate(10:04:00) 返回 null

解决方案：
1. 存储所有 K 线时间戳到 state.barTimestamps
2. 添加 findNearestBarTime() 查找最近 K 线时间
3. 日级 PDA 渲染前映射到最近的 K 线时间

修改：
- 添加 findNearestBarTime() 函数
- loadKlineData 中存储 barTimestamps
- loadPdaData 中添加时间映射逻辑
- 添加调试日志显示时间偏移
- LiquidityView.update 中添加 null 警告

影响：
- Daily High/Low 标记现在能正确显示
- ICT Midnight Day High/Low 标记能正确显示
- NWOG/NDOG 标记能正确显示
- 控制台显示时间映射日志，方便验证
```

**提交哈希**：`6ee7d65`

---

## 五、技术总结

### 5.1 问题本质

**时间离散化问题**：
- 图表库（Lightweight Charts）基于离散的 K 线时间点
- 日级 PDA 的 `occurrenceTime` 是连续时间（任意秒）
- 需要将连续时间映射到离散时间点

### 5.2 解决方案优劣

**方案 1：时间映射（已采用）**
- ✅ 简单直接，易于理解
- ✅ 符合语义（标记显示在最近的 K 线上）
- ✅ 性能良好（O(n) 查找，n 为 K 线数量）
- ⚠️ 时间偏移可能较大（如果 K 线稀疏）

**方案 2：扩展 LiquidityPrimitive 支持全宽度线（未采用）**
- ✅ 标记可以显示在任意时间点
- ❌ 需要修改 Primitive 渲染逻辑，复杂度高
- ❌ 语义不清晰（标记不在实际发生时间）

### 5.3 已知限制

1. **时间偏移**：
   - 如果 K 线数据稀疏，日级 PDA 可能显示在距离较远的 K 线上
   - 例如：Daily High 发生在 10:04，但最近的 K 线是 09:00，偏移 1 小时

2. **性能**：
   - `findNearestBarTime()` 是 O(n) 算法
   - 如果 K 线数量很大（>10000），可能影响性能
   - 优化方案：使用二分查找（O(log n)）

3. **边界情况**：
   - 如果没有 K 线数据，`findNearestBarTime()` 返回 null
   - 此时日级 PDA 仍然不会显示

### 5.4 后续优化

**优化 1：二分查找**
```javascript
function findNearestBarTime(targetTime) {
  if (!state.barTimestamps || state.barTimestamps.length === 0) {
    return null;
  }

  // 假设 barTimestamps 已排序
  let left = 0;
  let right = state.barTimestamps.length - 1;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (state.barTimestamps[mid] < targetTime) {
      left = mid + 1;
    } else {
      right = mid;
  }

  // 比较 left 和 left-1，返回更近的
  if (left > 0) {
    const diffLeft = Math.abs(state.barTimestamps[left] - targetTime);
    const diffPrev = Math.abs(state.barTimestamps[left - 1] - targetTime);
    return diffPrev < diffLeft ? state.barTimestamps[left - 1] : state.barTimestamps[left];
  }

  return state.barTimestamps[left];
}
```

**优化 2：缓存映射结果**
- 如果同一个时间戳被多次查询，可以缓存结果
- 使用 Map 存储 `targetTime → nearestTime` 映射

---

## 六、文件清单

### 6.1 修改文件

- `v3/docs/kline_viewer.html`
  - 添加 `findNearestBarTime()` 函数（25 行）
  - 修改 `loadKlineData()` 存储 barTimestamps（3 行）
  - 修改 `loadPdaData()` 添加时间映射逻辑（13 行）
  - 修改 `LiquidityView.update()` 添加 null 警告（2 行）
  - 共 +41 行

### 6.2 备份文件

- `v3/docs/kline_viewer.html.backup-debug` - 调试版本（包含大量 DEBUG 日志）

---

## 七、下一步

### 7.1 待验证

- [ ] 浏览器测试：刷新页面，验证日级 PDA 是否显示
- [ ] 检查时间偏移：观察控制台日志，确认偏移是否合理
- [ ] 性能测试：加载大量 K 线数据，测试 `findNearestBarTime()` 性能

### 7.2 待优化

- [ ] 如果性能有问题，实现二分查找优化
- [ ] 如果时间偏移过大，考虑添加偏移阈值警告
- [ ] 考虑添加配置项，允许用户选择是否启用时间映射

### 7.3 待完成功能

- [ ] 标签防重叠优化（P1）
- [ ] 阶段 E：Manual PDA 编辑功能（移至新分支 `feature/pda-workbench`）

---

## 八、参考资料

- [上一个会话](./session_20260514_late_night.md) - occurrence_time 定位修复
- [TODO 文件](../TODO.md) - 项目任务清单
- [调试总结](/tmp/debug_summary.md) - 调试流程和诊断逻辑
- [测试说明](/tmp/test_fix.md) - 修复测试步骤
