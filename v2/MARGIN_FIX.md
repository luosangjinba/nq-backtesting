# K线右侧边距修复

## 问题诊断

从截图看到：
- K线紧贴右边界，没有空白区域
- `setOffsetRightDistance()` 没有生效

## 根本原因

`setOffsetRightDistance()` 在 KLineCharts v9.8.12 中可能存在以下问题：
1. 在某些情况下不生效
2. 被后续的滚动操作覆盖
3. 需要在特定时机调用

## 解决方案

改用 `scrollByDistance()` 方法实现右侧边距：

```javascript
// 旧方法（不生效）
chart.setOffsetRightDistance(chart.getBarSpace() * RIGHT_MARGIN_BARS);
chart.scrollToDataIndex(lastIndex);

// 新方法（使用负向滚动）
chart.scrollToDataIndex(lastIndex, 0);  // 先滚动到最后
const marginPixels = chart.getBarSpace() * RIGHT_MARGIN_BARS;
chart.scrollByDistance(-marginPixels, 0);  // 再向左滚动（创建右侧空白）
```

## 工作原理

1. `scrollToDataIndex(lastIndex)` - 将最后一根K线滚动到视口右边缘
2. `scrollByDistance(-marginPixels)` - 向左滚动指定像素，在右侧创建空白
3. 负数表示向左滚动，正数表示向右滚动

## 修改的函数

1. `resetView()` - 重置视图时应用边距
2. `updateReplayDisplay()` - 回放更新时应用边距
3. `centerOnPda()` - 定位到PDA时应用边距
4. `locateToTime()` - 定位到时间时应用边距

## 测试步骤

1. **强制刷新浏览器**
   ```
   Ctrl + Shift + R
   ```

2. **加载数据**
   - 打开 http://127.0.0.1:8000/v2/docs/kline_viewer.html
   - 选择日期：2008-02-14
   - 点击"结束"按钮加载

3. **观察效果**
   - 初始状态：第1根K线应该距离右边缘有约2根K线宽度的空白
   - 点击播放：每根新K线出现时，右侧应保持约2根K线的空白
   - 拖动进度条：跳转后右侧应保持空白

4. **预期效果**
   ```
   改动前:
   [=====K线=====]|  <- 紧贴右边界
   
   改动后:
   [=====K线=====]  [空白]|  <- 距离右边界约2根K线宽度
                   ↑ 约2根K线
   ```

## 如果仍然紧贴

### 方案 A: 增加边距值

编辑 `kline_viewer.html` 第1108行：

```javascript
const RIGHT_MARGIN_BARS = 5;  // 从2改为5，更明显
```

### 方案 B: 使用固定像素值

```javascript
// 在 resetView() 等函数中
chart.scrollToDataIndex(lastIndex, 0);
chart.scrollByDistance(-100, 0);  // 固定100像素
```

### 方案 C: 调试检查

在浏览器控制台（F12）输入：

```javascript
// 查看当前K线宽度
console.log('Bar space:', chart.getBarSpace());

// 手动测试滚动
chart.scrollToDataIndex(lastCandleData.length - 1, 0);
chart.scrollByDistance(-50, 0);  // 向左滚动50像素
```

## 技术细节

### scrollByDistance API

```typescript
scrollByDistance(distance: number, animationDuration?: number): void
```

- `distance`: 滚动距离（像素）
  - 正数：向右滚动（显示更早的K线）
  - 负数：向左滚动（创建右侧空白）
- `animationDuration`: 动画时长（毫秒）
  - 0 或不传：无动画，立即滚动

### 为什么用负数

```
初始状态（scrollToDataIndex后）:
[K线区域]|
        ↑ 最后一根K线在右边缘

向左滚动 -50px:
[K线区域] [50px空白]|
        ↑ 最后一根K线向左移动50px
```

## 参考文档

- [scrollByDistance API](https://klinecharts.com/en-US/api/instance/scrollByDistance)
- [scrollToDataIndex API](https://klinecharts.com/en-US/api/instance/scrollToDataIndex)
- [getBarSpace API](https://klinecharts.com/en-US/api/instance/getBarSpace)
