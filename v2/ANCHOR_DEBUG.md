# 锚点模式调试指南

## 问题诊断

锚点模式没有生效，需要调试。

## 调试步骤

### 1. 强制刷新浏览器
```
Ctrl + Shift + R
```

### 2. 打开浏览器控制台
```
F12 或 Ctrl + Shift + I
```

### 3. 加载数据并测试

1. 加载数据（2008-02-14, 1H）
2. 点击播放
3. 观察控制台输出：
   ```
   Follow mode: scrolling to latest 0
   Follow mode: scrolling to latest 1
   Follow mode: scrolling to latest 2
   ...
   ```

4. 暂停播放
5. 用鼠标向左拖动K线
6. 观察控制台输出：
   ```
   Anchor set to index: 5
   ```

7. 继续播放
8. 观察控制台输出：
   ```
   Anchor mode: scrolling to index 5
   Anchor mode: scrolling to index 5
   Anchor mode: scrolling to index 5
   ```

### 4. 检查状态

在控制台输入：

```javascript
// 查看回放状态
console.log('Replay state:', {
  enabled: replayState.enabled,
  userScrolled: replayState.userScrolled,
  anchorIndex: replayState.anchorIndex,
  currentIndex: replayState.currentIndex
});

// 查看图表方法
console.log('Chart methods:', Object.keys(chart));

// 测试 getDrawPaneById
console.log('Candle pane:', chart.getDrawPaneById('candle_pane'));
```

## 可能的问题

### 问题 1: onScroll 事件没有触发

**症状**: 拖动K线后，控制台没有 "Anchor set to index" 输出

**原因**: 
- `onScroll` 事件名称可能不对
- 或者需要用 `onVisibleRangeChange` 代替

**解决方案**: 改用 `onVisibleRangeChange`

```javascript
chart.subscribeAction('onVisibleRangeChange', () => {
  // ... 锚点逻辑
});
```

### 问题 2: getDrawPaneById 返回 null

**症状**: 控制台显示 "Error setting anchor"

**原因**: pane ID 可能不是 'candle_pane'

**解决方案**: 查找正确的 pane ID

```javascript
// 在控制台测试
console.log('All methods:', Object.keys(chart));
```

### 问题 3: convertFromPixel 方法不存在

**症状**: 控制台显示 "convertFromPixel is not a function"

**原因**: v9 API 可能不同

**解决方案**: 使用其他方法计算可见范围

## 备选方案

如果 API 不支持，可以用简单的方法：

### 方案 A: 记录滚动前的最后可见索引

```javascript
chart.subscribeAction('onScroll', () => {
  if (!replayState.enabled) return;
  
  replayState.userScrolled = true;
  
  // 简单方案：记录当前播放索引作为锚点
  replayState.anchorIndex = replayState.currentIndex;
  console.log('Anchor set to current index:', replayState.anchorIndex);
});
```

### 方案 B: 使用固定偏移量

```javascript
// 在 updateReplayDisplay() 中
if (replayState.userScrolled) {
  // 不滚动，保持当前视口
  // 什么都不做，让新K线自然出现在左侧
} else {
  // 跟随模式
  chart.scrollToDataIndex(currentData.length - 1, 0);
  // ...
}
```

## 测试命令

在控制台执行以下命令测试功能：

```javascript
// 1. 手动设置锚点模式
replayState.userScrolled = true;
replayState.anchorIndex = 10;
console.log('Manually set anchor to index 10');

// 2. 继续播放，观察是否固定在索引10

// 3. 恢复跟随模式
replayState.userScrolled = false;
replayState.anchorIndex = null;
console.log('Reset to follow mode');

// 4. 查看当前数据
console.log('Current data length:', lastCandleData.length);
console.log('Current index:', replayState.currentIndex);
```

## 下一步

根据控制台输出，我们可以：

1. 确认 `onScroll` 是否触发
2. 确认锚点索引是否正确设置
3. 确认滚动逻辑是否执行
4. 根据问题选择合适的解决方案

请执行上述调试步骤，并告诉我控制台的输出结果。
