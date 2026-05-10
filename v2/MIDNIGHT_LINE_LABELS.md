# 午夜线日期标签优化

## 背景

用户希望在每条午夜线（00:00）的下方显示完整的日期/时间/周简写，方便快速识别日期边界。

## 实现方案

### 原始行为
- 只显示午夜线（垂直红线）
- 无日期标签
- 需要通过十字光标查看日期

### 优化后
- 保留午夜线（垂直红线）
- 在午夜线下方添加日期标签
- 标签格式：`YYYY-MM-DD 00:00 Weekday`
- 示例：`2008-02-14 00:00 Thu`

## 代码实现

**文件**：`v2/docs/kline_viewer.html`  
**位置**：第 2193-2236 行（午夜线绘制函数）
### 修改内容

```javascript
for (const ts of midnights) {
  const idx = findBarIndex(candleData, ts);
  if (idx >= 0) {
    // 1. Draw vertical line (午夜线)
    const lineId = chart.createOverlay({
      name: 'verticalStraightLine',
      points: [{ timestamp: ts, value: candleData[idx].close }],
      styles: { line: { color: 'rgba(180, 80, 80, 0.25)', style: 'solid', size: 1 } },
      lock: true,
    });
    if (lineId) midnightOverlayIds.push(lineId);

    // 2. Format date label
    const date = new Date(ts);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekday = weekdays[date.getUTCDay()];
    const label = `${year}-${month}-${day} 00:00 ${weekday}`;

    // 3. Draw date label at the bottom
    const labelId = chart.createOverlay({
      name: 'text',
      points: [{ timestamp: ts, value: candleData[idx].low }],
      text: label,
      styles: {
        text: {
          color: '#b45050',              // 红色文字
          size: 10,                 // 字体大小
          family: 'monospace',           // 等宽字体
          weight: 'normal',
          backgroundColor: 'rgba(30, 27, 24, 0.8)',  // 半透明背景
          borderColor: 'rgba(180, 80, 80, 0.5)',     // 红色边框
          borderSize: 1,
          borderRadius: 2,
          paddingLeft: 4,
          paddingRight: 4,
          paddingTop: 2,
          paddingBottom: 2,
        }
      },
    lock: true,
    });
    if (labelId) midnightOverlayIds.push(labelId);
  }
}
```

### 关键改进

1. **双重绘制**：
   - 先绘制午夜线（`verticalStraightLine`）
   - 再绘制日期标签（`text` overlay）

2. **日期格式化**：
   ```javascript
   const label = `${year}-${month}-${day} 00:00 ${weekday}`;
   // 示例：2008-02-14 00:00 Thu
   ```

3. **标签位置**：
   - 使用 `candleData[idx].low`（当天最低价）作为 Y 坐标
   - 标签会显示在 K 线下方

4. **样式设计**：
   - **颜色**：红色文字（`#b45050`）与午夜线颜色一致
   - **字体**：等宽字体（`monospace`）确保对齐
   - **背景**：半透明深色背景（`rgba(30, 27, 24, 0.8)`）
   - **边框**：红色半透明边框（`rgba(180, 80, 80, 0.5)`）

5. **ID 管理**：
   - 午夜线和标签的 ID 都存入 `midnightOverlayIds`
   - 切换午夜线开关时，两者会同时显示/隐藏

## 显示效果

### 标签格式
```
2008-02-13 00:00 Wed
2008-02-14 00:00 Thu
2008-02-15 00:00 Fri
```

### 视觉效果
- 红色垂直线（午夜线）
- 红色文字标签（日期/时间/周）
- 半透明深色背景
- 红色边框

### 位置
- 标签位于午夜线下方
- Y 坐标为当天最低价
- 不会遮挡 K 线

## 适用范围

### 生效条件
1. **时间周期**：≤ 1H（15M, 30M, 1H）
2. **午夜线开关**：已勾选
3. **数据存在**：有 00:00 时刻的 K 线

### 不生效情况
- 时间周期 > 1H（4H, D, W）
- 午夜线开关未勾选
- 无 00:00 时刻的 K 线数据

## 用户交互

### 开关控制
- 工具栏：`☑ 午夜线` 复选框
- 勾选：显示午夜线 + 日期标签
- 取消：隐藏午夜线 + 日期标签

### 锁定状态
- 标签已锁定（`lock: true`）
- 无法通过鼠标拖动或编辑
- 防止误操作

## 技术细节

### 时区处理
- 使用 UTC 时间（`getUTCHours()`, `getUTCDate()`, `getUTCDay()`）
- 与图表的 `timezone: 'UTC'` 配置一致
- 确保午夜线准确对应 00:00 UTC

### 周简写
```javascript
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const weekday = weekdays[date.getUTCDay()];
```
- `getUTCDay()` 返回 0-6（周日到周六）
- 映射到英文简写

### 性能优化
- 使用 `Set` 去重午夜时间戳
- 只在午夜线位置绘制标签
- 标签数量 = 午夜线数量

## 测试验证

### 测试步骤
1. 刷新浏览器（强制刷新：Ctrl+Shift+R）
2. 加载 1H 图表数据
3. 确保"午夜线"复选框已勾选
4. 观察午夜线下方是否显示日期标签

### 预期结果
- 每条午夜线下方显示日期标签
- 标签格式：`YYYY-MM-DD 00:00 Weekday`
- 标签颜色：红色文字 + 半透明背景
- 标签位置：K 线下方，不遮挡价格

### 如果标签不显示
可能原因：
1. 午夜线开关未勾选
2. 时间周期 > 1H
3. 数据中无 00:00 时刻的 K 线
4. 浏览器缓存未清除

## 相关文件

- `v2/docs/kline_viewer.html`：主文件

## 日期

2026-05-10
