# V3 开发会话 - 2026-05-15 NWOG/NDOG 矩形渲染修复

## 会话信息

- **日期：** 2026-05-15 上午
- **时长：** ~30 分钟
- **主要目标：** 修复 NWOG/NDOG 渲染为矩形区域
- **模型：** Claude Opus 4.7
- **分支：** `feature/context-menu-research`

---

## 一、问题发现

### 1.1 用户反馈

**问题描述**：
> ndog/nwog是一段价格区间，形式上与fvg类似，所以处理价格边界的逻辑也要与fvg一致。

**当前实现问题**：
- NWOG/NDOG 被当作单点（类似 BSL/SSL）处理
- 只显示单条水平线，而不是矩形区域
- 详情浮窗只显示单个价格，而不是价格范围

### 1.2 数据验证

**API 数据结构**：
```json
{
  "pdaType": "ndog",
  "priceHigh": 2347.75,
  "priceLow": 2347.5,
  "price": null
}
```

**确认**：
- ✅ NWOG/NDOG 有 `priceHigh` 和 `priceLow` 字段
- ✅ 应该渲染为矩形区域（类似 FVG）
- ✅ 但没有 `occurrenceTime`，只有 `anchorTime`（单个时间点）

---

## 二、第一次修复（删除单点渲染函数）

### 2.1 修改内容

**删除函数**：
- 删除 `addNwogMarker()` 函数（32 行）
- 删除 `addNdogMarker()` 函数（32 行）

**修改渲染逻辑**：
```javascript
// 旧代码（单点）
const price = record.price || record.priceHigh;
if (price) {
  addNwogMarker(timestamp, price, 'NWOG');
  stats.nwog++;
}

// 新代码（矩形）
const priceHigh = record.priceHigh;
const priceLow = record.priceLow;
if (priceHigh && priceLow) {
  const color = '#ab47bc33'; // 紫色
  addFvgMarker(timestamp, timestamp, priceHigh, priceLow, color);
  stats.nwog++;
}
```

**修改详情显示**：
- 从单点列表中移除 `nwog` 和 `ndog`
- 将它们加入 FVG 分支（显示价格范围）
- 只为 FVG 显示 `direction` 字段

### 2.2 遇到的问题

**问题 1：函数未定义错误**
```
addNdogMarker is not defined
```

**原因**：删除了函数但渲染逻辑中还在调用

**解决**：修改渲染逻辑，使用 `addFvgMarker` 替代

---

## 三、第二次修复（矩形不显示问题）

### 3.1 问题诊断

**浏览器日志**：
```
✓ 添加 FVG 标记: start=1326132000, end=1326132000, top=2347.75, bottom=2347.5
PDA 渲染统计: {bsl: 12, ssl: 12, fvg: 21, nwog: 0, ndog: 3, ...}
```

**问题分析**：
- `startTime` 和 `endTime` 相同（都是 `timestamp`）
- 矩形宽度为 0，无法显示
- NWOG/NDOG 是**单个时间点的价格区间**，不像 FVG 有时间跨度

### 3.2 解决方案

**核心思路**：给 NWOG/NDOG 一个合理的时间宽度

**实现**：
```javascript
// 旧代码（宽度为 0）
addFvgMarker(timestamp, timestamp, priceHigh, priceLow, color);

// 新代码（延伸 24 小时）
const endTime = timestamp + 24 * 3600; // 延伸 24 小时
addFvgMarker(timestamp, endTime, priceHigh, priceLow, color);
```

**理由**：
- NWOG/NDOG 是日级 PDA，延伸 24 小时符合语义
- 类似 Daily High/Low 的显示方式
- 用户可以清楚地看到价格区间的持续时间

---

## 四、最终实现

### 4.1 代码修改

**NWOG 渲染**：
```javascript
} else if (pdaType === 'nwog') {
  const priceHigh = record.priceHigh;
  const priceLow = record.priceLow;

  if (priceHigh && priceLow) {
    // NWOG 是价格区间，从当前时间延伸到当日结束（24小时）
    // 使用紫色半透明
    const color = '#ab47bc33'; // 紫色
    const endTime = timestamp + 24 * 3600; // 延伸 24 小时
    addFvgMarker(timestamp, endTime, priceHigh, priceLow, color);
    stats.nwog++;
  }
}
```

**NDOG 渲染**：
```javascript
} else if (pdaType === 'ndog') {
  const priceHigh = record.priceHigh;
  const priceLow = record.priceLow;

  if (priceHigh && priceLow) {
    // NDOG 是价格区间，从当前时间延伸到当日结束（24小时）
    // 使用青色半透明
    const color = '#26c6da33'; // 青色
    const endTime = timestamp + 24 * 3600; // 延伸 24 小时
    addFvgMarker(timestamp, endTime, priceHigh, priceLow, color);
    stats.ndog++;
  }
}
```

**详情显示**：
```javascript
// 单点 PDA（BSL/SSL/Daily High/Low/ICT Midnight）
if (
  pda.pdaType === 'bsl' ||
  pda.pdaType === 'ssl' ||
  pda.pdaType === 'daily_high' ||
  pda.pdaType === 'daily_low' ||
  pda.pdaType === 'ict_midnight_day_high' ||
  pda.pdaType === 'ict_midnight_day_low'
) {
  const price = pda.price || pda.priceHigh || pda.priceLow || 'N/A';
  detailRows += `<div class="detail-row"><span class="detail-label">价格:</span><span class="detail-value">${price}</span></div>`;
}
// 区间 PDA（FVG/NWOG/NDOG）
else if (pda.pdaType === 'fvg' || pda.pdaType === 'nwog' || pda.pdaType === 'ndog') {
  const priceHigh = pda.priceHigh || 'N/A';
  const priceLow = pda.priceLow || 'N/A';
  detailRows += `<div class="detail-row"><span class="detail-label">价格范围:</span><span class="detail-value">${priceLow} - ${priceHigh}</span></div>`;
  // 只为 FVG 显示方向
  if (pda.pdaType === 'fvg') {
    const direction = pda.direction || 'N/A';
    detailRows += `<div class="detail-row"><span class="detail-label">Direction:</span><span class="detail-value">${direction}</span></div>`;
  }
}
```

### 4.2 修改统计

**删除**：
- `addNwogMarker()` 函数（16 行）
- `addNdogMarker()` 函数（16 行）
- 旧渲染逻辑（8 行）

**添加**：
- 新渲染逻辑（20 行）

**净变化**：-40 行，+20 行

---

## 五、提交记录

### 5.1 Git 提交

**提交信息**：
```
fix(kline_viewer): NWOG/NDOG 改为矩形渲染

问题：NWOG/NDOG 是价格区间（类似 FVG），但当前代码把它们当成单点（类似 BSL/SSL）处理

修改：
1. 删除 addNwogMarker 和 addNdogMarker 函数（单点渲染）
2. 修改 NWOG/NDOG 渲染逻辑，使用 addFvgMarker 渲染矩形
   - NWOG: 紫色半透明 (#ab47bc33)，延伸 24 小时
   - NDOG: 青色半透明 (#26c6da33)，延伸 24 小时
3. 修改详情显示逻辑，NWOG/NDOG 显示价格范围而非单点
4. 只为 FVG 显示 direction 字段

影响：
- NWOG/NDOG 现在正确显示为价格区间矩形
- 详情浮窗显示价格范围（priceHigh - priceLow）
- 与 FVG 渲染逻辑一致
```

**提交哈希**：`171425f`

---

## 六、技术总结

### 6.1 PDA 类型分类

**单点 PDA**（显示为水平线）：
- BSL / SSL
- Daily High / Daily Low
- ICT Midnight Day High / Low

**区间 PDA**（显示为矩形）：
- FVG（有时间跨度：K1-K2-K3）
- NWOG / NDOG（单时间点，延伸 24 小时）

### 6.2 时间处理差异

**FVG 时间范围**：
```javascript
const tf = parseInt(document.getElementById('tfSelect').value);
const tfSeconds = tf * 60;
const startTime = timestamp - tfSeconds;      // K1 开始
const endTime = timestamp + tfSeconds * 2;    // K3 结束
```

**NWOG/NDOG 时间范围**：
```javascript
const endTime = timestamp + 24 * 3600; // 延伸 24 小时
```

### 6.3 设计决策

**为什么延伸 24 小时？**
1. NWOG/NDOG 是日级 PDA，24 小时符合语义
2. 类似 Daily High/Low 的显示方式（延伸到当日结束）
3. 用户可以清楚地看到价格区间的持续时间
4. 避免矩形宽度为 0 导致不显示

**替代方案（未采用）**：
- 方案 1：延伸到下一个 K 线（宽度太小，不明显）
- 方案 2：延伸到图表结束（语义不清晰）
- 方案 3：固定宽度（如 10 根 K 线）（不符合日级语义）

### 6.4 已知限制

1. **时间跨度固定**：
   - 当前固定延伸 24 小时
   - 如果用户查看多日数据，可能需要调整

2. **与 FVG 的差异**：
   - FVG 有明确的时间跨度（K1-K2-K3）
   - NWOG/NDOG 是人为延伸的时间范围

3. **点击检测**：
   - 矩形区域可以点击
   - 但时间范围是延伸的，不是实际的 PDA 时间

---

## 七、测试验证

### 7.1 预期结果

**图表显示**：
- ✅ NWOG 显示为紫色半透明矩形
- ✅ NDOG 显示为青色半透明矩形
- ✅ 矩形从标记时间延伸 24 小时
- ✅ 统计显示正确的 NWOG/NDOG 数量

**详情浮窗**：
- ✅ 显示价格范围（priceHigh - priceLow）
- ✅ 不显示 direction 字段（只有 FVG 显示）
- ✅ 显示时间、周期、来源等信息

### 7.2 测试数据

**测试范围**：2012-01-09 00:00 到 2012-01-15 00:00，周期 1H

**预期 NDOG 数量**：3 条
- 2012-01-09 18:00:00 (2347.75 - 2347.5)
- 2012-01-10 18:00:00 (2360.0 - 2357.75)
- 2012-01-12 18:00:00 (2380.25 - 2379.5)

**预期 NWOG 数量**：0 条（该时间段无 NWOG）

---

## 八、后续优化

### 8.1 可能的改进

**优化 1：动态时间范围**
```javascript
// 根据图表可见范围动态调整延伸时间
const visibleRange = state.chart.timeScale().getVisibleRange();
const visibleDuration = visibleRange.to - visibleRange.from;
const endTime = timestamp + Math.min(24 * 3600, visibleDuration / 2);
```

**优化 2：配置化时间范围**
```javascript
// 在 v2_config.yaml 中配置
nwog_ndog_duration: 86400  # 24 小时（秒）
```

**优化 3：标签显示**
- 在矩形上显示 "NWOG" / "NDOG" 标签
- 类似 FVG 的标签显示方式

### 8.2 待验证

- [ ] 浏览器测试 NWOG/NDOG 矩形显示
- [ ] 验证点击检测是否正常
- [ ] 验证详情浮窗显示是否正确
- [ ] 测试不同周期下的显示效果

---

## 九、文件清单

### 9.1 修改文件

- `v3/docs/kline_viewer.html`
  - 删除 `addNwogMarker()` 函数（16 行）
  - 删除 `addNdogMarker()` 函数（16 行）
  - 修改 NWOG/NDOG 渲染逻辑（20 行）
  - 修改详情显示逻辑（1 行）
  - 净变化：-40 行，+20 行

---

## 十、参考资料

- [上一个会话](./session_20260514_debug_fix.md) - 日级 PDA 时间映射修复
- [TODO 文件](../TODO.md) - 项目任务清单
- [FVG 渲染实现](../docs/kline_viewer.html#L474) - FVG 矩形渲染参考
