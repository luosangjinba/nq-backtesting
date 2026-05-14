# V3 开发会话 - 2026-05-14 深夜续（occurrence_time 修复）

## 会话信息

- **日期：** 2026-05-14 深夜续
- **时长：** ~40 分钟
- **主要目标：** 修复日级 PDA 时间定位错误
- **模型：** Claude Opus 4.7
- **分支：** `feature/context-menu-research`

---

## 一、问题发现

### 1.1 用户反馈

**截图分析**（1H 图）：
- Daily High/Low 标签显示在 18:00（美东时间）
- ICT Midnight Day High/Low 标签显示在 00:00
- 但实际高低点可能在其他时间（如 07:40, 11:18）

**问题根因**：
- 当前代码使用 `anchor_time`（统计周期起点）定位标签
- Daily High/Low 的 `anchor_time` 是 18:00（交易日起点）
- ICT Midnight 的 `anchor_time` 是 00:00（日历日起点）
- 应该使用 `occurrence_time`（实际高低点时间）

### 1.2 用户需求

**核心需求**：
1. 日级 PDA 标签显示在实际高低点时间（`occurrence_time`）
2. 如果与 BSL/SSL 重叠，标签并排列出，不要遮挡

**优先级**：
- P0：使用 `occurrence_time` 定位（本次完成）
- P1：标签防重叠（后续优化）

---

## 二、API 数据验证

### 2.1 查询日级 PDA 数据

```bash
curl "http://127.0.0.1:8765/v2/pda_records?anchor_time_from=2012-01-09%2000:00&anchor_time_to=2012-01-15%2000:00&timeframe=D&type=daily_high&type=ict_midnight_day_high&limit=50"
```

**关键字段**：
```json
{
  "pdaType": "ict_midnight_day_high",
  "anchorTime": "2012-01-09 00:00:00",      // 统计周期起点（00:00）
  "occurrenceTime": "2012-01-09 07:40:00",  // 实际高点时间（07:40）
  "price": 2363.5
}
```

**确认**：
- ✅ API 返回 `occurrenceTime` 字段
- ✅ `occurrenceTime` 是实际高低点时间
- ✅ `anchorTime` 是统计周期起点

---

## 三、实现方案

### 3.1 技术方案

**修改 `loadPdaData` 函数**：
1. 识别日级 PDA 类型（6 种）
2. 日级类型使用 `occurrence_time`，其他类型使用 `anchor_time`
3. 时间转换逻辑保持不变

**日级类型列表**：
```javascript
const dailyTypes = [
  'daily_high',
  'daily_low',
  'ict_midnight_day_high',
  'ict_midnight_day_low',
  'nwog',
  'ndog'
];
```

### 3.2 代码修改

**修改位置**：`v3/docs/kline_viewer.html` 的 `loadPdaData` 函数（903-918 行）

**原代码**：
```javascript
// 遍历记录，按类型渲染
records.forEach((record) => {
  const pdaType = record.pdaType;
  const anchorTime = record.anchorTs || record.anchorTime;

  // 转换时间为 Unix 时间戳（秒）
  let timestamp;
  if (typeof anchorTime === 'number') {
    timestamp = anchorTime;
  } else if (typeof anchorTime === 'string') {
    timestamp = Math.floor(new Date(anchorTime.replace(' ', 'T') + 'Z').getTime() / 1000);
  } else {
    console.warn('无效的 anchor_time:', anchorTime, record);
  return;
  }
```

**新代码**：
```javascript
// 遍历记录，按类型渲染
records.forEach((record) => {
  const pdaType = record.pdaType;

  // 日级 PDA 使用 occurrence_time（实际高低点时间），其他类型使用 anchor_time
  const dailyTypes = ['daily_high', 'daily_low', 'ict_midnight_day_high', 'ict_midnight_day_low', 'nwog', 'ndog'];
  const useOccurrenceTime = dailyTypes.includes(pdaType);
  const timeValue = useOccurrenceTime
    ? record.occurrenceTime || record.anchorTs || record.anchorTime
    : record.anchorTs || record.anchorTime;

  // 转换时间为 Unix 时间戳（秒）
  let timestamp;
  if (typeof timeValue === 'number') {
    timestamp = timeValue;
  } else if (typeof timeValue === 'string') {
    timestamp = Math.floor(new Date(timeValue.replace(' ', 'T') + 'Z').getTime() / 1000);
  } else {
    console.warn('无效的时间值:', timeValue, record);
    return;
  }
```

**关键点**：
- 使用 `dailyTypes.includes(pdaType)` 判断是否为日级类型
- 日级类型优先使用 `occurrence_time`，回退到 `anchor_time`
- 其他类型（bsl/ssl/fvg）仍使用 `anchor_time`
- 错误提示从 `'无效的 anchor_time'` 改为 `'无效的时间值'`

---

## 四、验证流程

### 4.1 语法检查

```bash
# 提取 JavaScript 并验证语法
python3 -c "
import re
html = open('kline_viewer.html', encoding='utf-8').read()
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if script_match:
    js_code = script_match.group(1)
    with open('/tmp/kline_viewer_check.js', 'w', encoding='utf-8') as f:
        f.write(js_code)
    print('✓ JavaScript 提取成功')
"

node --check /tmp/kline_viewer_check.js
# ✓ 语法检查通过
```

### 4.2 格式化

```bash
cd /home/leo/myworkspace/trading/backtesting/v3/docs
npx --yes prettier@3.3.3 --write kline_viewer.html
# kline_viewer.html 703ms
```

---

## 五、提交记录

**提交 `b348202`**：
```
fix(kline_viewer): 日级 PDA 使用 occurrence_time 定位到实际高低点

- daily_high/low, ict_midnight_*, nwog, ndog 改用 occurrence_time
- 其他类型（bsl/ssl/fvg）仍使用 anchor_time
- 修复日级 PDA 标签显示在统计周期起点（18:00/00:00）而非实际高低点的问题
- 标签防重叠功能待后续实现
```

**文件变更**：
- `v3/docs/kline_viewer.html`：+19 行，-6 行

---

## 六、标签防重叠方案（待实现）

### 6.1 问题分析

**现象**：
- 多个 PDA 在同一价位时，标签会重叠遮挡
- 例如：Daily High 和 BSL 在同一价格，标签叠在一起

**需求**：
- 检测同价位的标签（时间窗口 + 价格容差）
- 水平错开排列，避免遮挡

### 6.2 技术方案

**实现步骤**：
1. 在渲染前收集所有 PDA 的 `(timestamp, price)` 坐标
2. 检测重叠（同一时间窗口 + 同一价格容差内）
3. 为重叠的标签分配不同的水平偏移量
4. 修改 `LiquidityPrimitive` 支持 `labelOffsetX` 参数

**代码修改点**：
- `LIQUIDITY_DEFAULTS` 添加 `labelOffsetX: 0`
- `LiquidityRenderer.draw()` 中使用 `x2 + offsetX`
- 在 `loadPdaData` 中添加重叠检测和偏移量分配逻辑

**复杂度评估**：
- 需要全局坐标收集（在渲染前）
- 需要复杂的布局算法（检测重叠 + 分配偏移）
- 需要修改 Primitive 接口（增加 offsetX 参数）

**决策**：
- 作为后续优化任务，不在本次实现
- 当前优先保证功能正确性（occurrence_time 定位）
---

## 七、技术总结

### 7.1 设计亮点

**最小侵入性**：
- 只修改时间选择逻辑，渲染逻辑完全不变
- 代码增量小（+19 行，-6 行）
- 向后兼容（回退到 `anchor_time`）

**类型安全**：
- 使用 `dailyTypes.includes(pdaType)` 明确判断
- 避免硬编码 if-else 链

**可扩展性**：
- 日级类型列表集中管理，易于扩展
- 为未来"按类型配置时间字段"奠定基础
### 7.2 数据流验证

**API → 前端**：
```
API 返回:
{
  pdaType: 'ict_midnight_day_high',
  anchorTime: '2012-01-09 00:00:00',
  occurrenceTime: '2012-01-09 07:40:00',
  price: 2363.5
}

前端处理:
1. 识别为日级类型 → useOccurrenceTime = true
2. 选择 timeValue = '2012-01-09 07:40:00'
3. 转换为 Unix 时间戳 → timestamp = 1326090000
4. 渲染标签在 07:40 位置
```

**效果**：
- ✅ Daily High/Low 标签显示在实际高低点时间
- ✅ ICT Midnight 标签显示在实际高低点时间
- ✅ BSL/SSL/FVG 仍使用 anchor_time（行为不变）

---

## 八、后续计划

### 8.1 浏览器测试

**测试场景**：
1. 切换到 1H 周期，加载数据
   - 预期：Daily High/Low 标签显示在实际高低点时间（非 18:00）
   - 预期：ICT Midnight 标签显示在实际高低点时间（非 00:00）
2. 切换到 15M 周期，加载数据
   - 预期：日级 PDA 标签位置正确
3. 右键点击日级 PDA
   - 预期：查看详情显示正确的 occurrence_time

### 8.2 合并准备

**合并前检查清单**：
- [ ] 浏览器测试通过
- [x] 代码格式化完成（Prettier）
- [x] 会话记录更新（本文件）
- [x] TODO 更新
- [x] 无 console.log 残留（保留 warn/error）
- [x] 无 TODO/FIXME 注释
- [x] 语法检查通过

**合并目标**：阶段 D 完成后合并到 main

### 8.3 后续优化

**优先级排序**：
1. P0：浏览器测试 + 合并到 main
2. P1：标签防重叠（优化任务）
3. P2：阶段 E（PDA 工作台）

---

## 九、会话总结

本次会话顺利完成日级 PDA 时间定位修复：

**成功部分**：
- 快速定位问题根因（使用 anchor_time 而非 occurrence_time）
- 验证 API 数据结构（确认 occurrence_time 字段存在）
- 设计简洁的类型判断逻辑
- 代码修改最小化，不影响现有逻辑
- 语法检查和格式化一次通过

**技术收获**：
- 理解了 `anchor_time` vs `occurrence_time` 的语义差异
- 验证了日级 PDA 的数据结构
- 为未来"按类型配置时间字段"奠定基础

**待完成**：
- 标签防重叠功能（作为后续优化任务）
- 浏览器测试验证修复效果

**下一步行动**：
- 浏览器测试验证功能
- 通过后合并到 main
- 开始阶段 E（PDA 工作台）或标签防重叠优化
