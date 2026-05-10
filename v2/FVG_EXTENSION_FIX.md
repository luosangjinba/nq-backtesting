# FVG 扩展隐性累加问题修复

## 问题描述

### 现象
当 FVG 扩展到 K 线最右端时：
1. 视觉上扩展停止（矩形框到达最右端）
2. 但后台 `extendBars` 值继续累加
3. 当增加 K 线后，隐性累加的扩展会突然显示出来

### 根本原因
```javascript
// 旧代码（第 1680 行）
pda.extendBars = (pda.extendBars || 0) + extendBars;

// 绘制时（第 2048 行）
const endIdx5 = Math.min(idx + 4 + extendBars, candleData.length - 1);
```

- `extendBars` 无限制累加
- 绘制时用 `Math.min()` 限制在 `candleData.length - 1`
- 当 `candleData.length` 增加时，之前累加的值会显示出来

### 示例场景
1. FVG 起始索引：10
2. 当前 K 线总数：100
3. 用户点击"扩展 10 根" 10 次
4. `extendBars` 累加到 100（但只显示到索引 99）
5. 增加 50 根 K 线后，`candleData.length` = 150
6. 之前隐藏的扩展突然显示到索引 114（10 + 4 + 100）

## 解决方案

### 核心思路
在 `extendFvg()` 函数中，限制 `extendBars` 不超过当前可见范围。

### 修改内容

**文件**：`v2/docs/kline_viewer.html`  
**位置**：第 1676-1711 行

```javascript
function extendFvg(fvgInfo, extendBars) {
  if (!fvgInfo) return;
  const { pda, source } = fvgInfo;

  // Calculate the maximum possible extension based on current data
  const fvgStartIdx = findBarIndex(lastCandleData, timeToTimestamp(pda.anchorTime || pda.occurrenceTime) * 1000);
  if (fvgStartIdx < 0) return;

  const maxPossibleExtend = lastCandleData.length - 1 - fvgStartIdx - 4;
  const currentExtend = pda.extendBars || 0;
  const newExtend = currentExtend + extendBars;

  // Cap the extension to the maximum visible range
  pda.extendBars = Math.min(newExtend, Math.max(0, maxPossibleExtend));

  const actualAdded = pda.extendBars - currentExtend;

  // Update in preview list if it's a manual PDA
  if (source === 'manual') {
    const index = manualPreviewPdas.findIndex(p => p === pda);
    if (index >= 0) {
      manualPreviewPdas[index] = { ...pda };
    }
  }

  drawAllOverlays();

  if (actualAdded > 0) {
    toast(`FVG 已扩展 ${actualAdded} 根 K 线（总计 ${pda.extendBars} 根）`, 'success');
  } else if (actualAdded === 0 && newExtend > maxPossibleExtend) {
    toast(`FVG 已到达最右端，无法继续扩展`, 'warning');
  } else {
    toast(`FVG 扩展已达上限（${pda.extendBars} 根）`, 'info');
  }
}
```

### 关键改进

1. **计算最大扩展值**：
   ```javascript
   const maxPossibleExtend = lastCandleData.length - 1 - fvgStartIdx - 4;
   ```
   - `lastCandleData.length - 1`：最后一根 K 线索引
   - `- fvgStartIdx`：减去 FVG 起始索引
   - `- 4`：减去 FVG 固定的 4 根 K 线

2. **限制扩展值**：
   ```javascript
   pda.extendBars = Math.min(newExtend, Math.max(0, maxPossibleExtend));
   ```
   - 不超过 `maxPossibleExtend`
   - 不小于 0

3. **计算实际扩展量**：
   ```javascript
   const actualAdded = pda.extendBars - currentExtend;
   ```
   - 用于准确的提示信息

4. **智能提示**：
   - `actualAdded > 0`：成功扩展
   - `actualAdded === 0 && newExtend > maxPossibleExtend`：已到达最右端
   - 其他：已达上限

## 测试验证

### 测试场景 1：正常扩展
1. 在 FVG 上右键 → "扩展 10 根"
2. **预期**：矩形框扩展 10 根，提示"FVG 已扩展 10 根 K 线（总计 10 根）"

### 测试场景 2：到达最右端
1. 扩展 FVG 到最右端
2. 再次点击"扩展 10 根"
3. **预期**：矩形框不变，提示"FVG 已到达最右端，无法继续扩展"

### 测试场景 3：增加 K 线后
1. 扩展 FVG 到最右端
2. 增加 K 线（回放模式前进）
3. **预期**：矩形框保持在之前的位置，不会突然延伸

### 测试场景 4：扩展到当前位置
1. 移动十字光标到某个位置
2. 右键 → "扩展到当前位置"
3. **预期**：矩形框扩展到十字光标位置，不超过最右端

## 影响范围
### 修改的函数
- `extendFvg()`：核心扩展逻辑

### 不受影响的功能
- FVG 绘制逻辑（`buildPdaOverlays()`）
- "扩展到当前位置"功能（`extendFvgToCurrent()`）
- 右键菜单显示逻辑

### 兼容性
- 已扩展的 FVG 不受影响（`extendBars` 值保留）
- 新扩展操作会自动限制在可见范围内
## 相关文件

- `v2/docs/kline_viewer.html`：主文件
- `v2/docs/FVG_EXTENSION_USAGE.md`：FVG 扩展功能使用说明

## 提交信息

```
修复：FVG 扩展到最右端后隐性累加问题

- 限制 extendBars 不超过当前可见范围
- 添加智能提示（成功/到达最右端/已达上限）
- 防止增加 K 线后隐性扩展突然显示
```

## 日期

2026-05-10
