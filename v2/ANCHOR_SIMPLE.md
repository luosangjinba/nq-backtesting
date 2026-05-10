# 锚点模式 - 简化实现

## 实现方案

由于 KLineCharts v9 API 的限制，采用简化的锚点实现：

### 核心逻辑

**锚点 = 用户拖动时的当前播放索引**

```javascript
// 用户拖动时
replayState.anchorIndex = replayState.currentIndex;

// 播放时
if (replayState.userScrolled) {
  // 滚动到锚点索引
  chart.scrollToDataIndex(replayState.anchorIndex, 0);
} else {
  // 滚动到最新索引
  chart.scrollToDataIndex(currentData.length - 1, 0);
}
```

## 工作原理

### 场景示例

**初始状态**（跟随模式）:
```
播放到第10根: [====K线10根====]  [空白]|
                           ↑ 自动跟随
```

**用户拖动**:
```
1. 暂停播放（当前在第10根）
2. 向左拖动K线，查看第1-5根
3. 触发锚点：anchorIndex = 10
```

**继续播放**（锚点模式）:
```
播放第11根: [====K线10根====]  [空白]|
                       ↑ 固定在第10根位置

播放第12根: [====K线10根====]  [空白]|
                       ↑ 仍然固定在第10根位置

新K线出现在左侧，视口保持在第10根位置
```

## 视觉效果

### 跟随模式（默认）
```
第1根:  [K1]  [空白]|
第2根:  [K1 K2]  [空白]|
第3根:  [K1 K2 K3]  [空白]|
...
第10根: [... K8 K9 K10]  [空白]|
        ↑ 自动滚动，最新K线在右侧
```

### 锚点模式（拖动后）
```
用户拖动到第5根位置:
[K1 K2 K3 K4 K5]  [空白]|
             ↑ 锚点

继续播放:
第11根: [K1 K2 K3 K4 K5]  [空白]|  (K6-K11在左侧视野外)
                 ↑ 视口固定

第12根: [K1 K2 K3 K4 K5]  [空白]|  (K6-K12在左侧视野外)
                 ↑ 视口固定
```

## 使用方法

### 1. 激活锚点模式

```
1. 加载数据并播放
2. 播放到某个位置（如第10根）
3. 暂停播放
4. 用鼠标向左拖动K线
5. 状态栏显示 "🔒 锚点模式"
6. 继续播放
7. 新K线在当前视口位置出现
```

### 2. 恢复跟随模式

```
点击 📍 按钮
```

## 调试方法

### 打开控制台（F12）

**正常输出**:

```
# 跟随模式
Follow mode: scrolling to latest 0
Follow mode: scrolling to latest 1
Follow mode: scrolling to latest 2

# 用户拖动
User scrolled - Anchor mode activated at index: 10

# 锚点模式
Anchor mode: scrolling to index 10
Anchor mode: scrolling to index 10
Anchor mode: scrolling to index 10
```

### 手动测试

在控制台输入：

```javascript
// 查看状态
console.log({
  userScrolled: replayState.userScrolled,
  anchorIndex: replayState.anchorIndex,
  currentIndex: replayState.currentIndex
});

// 手动激活锚点模式
replayState.userScrolled = true;
replayState.anchorIndex = 5;

// 手动恢复跟随模式
replayState.userScrolled = false;
replayState.anchorIndex = null;
```

## 限制和注意事项

### 1. 锚点是播放索引，不是视口位置

- 锚点记录的是"播放到第几根K线"
- 不是"视口显示哪些K线"
- 这意味着拖动后，视口会固定在拖动时的播放进度

### 2. 适用场景

**适合**:
- 播放到某个时间点，向左查看历史，继续播放
- 固定在某个时间段，观察后续K线如何发展

**不适合**:
- 需要精确控制视口显示哪些K线
- 需要在任意位置插入新K线

### 3. 与主流软件的差异

**主流软件**（如TradingView）:
- 锚点是视口的右边缘K线
- 新K线精确出现在右边缘

**当前实现**:
- 锚点是播放进度
- 新K线出现在锚点对应的时间位置

## 测试步骤

### 完整测试流程

1. **加载数据**
   ```
   日期: 2008-02-14
   周期: 1H
   ```

2. **测试跟随模式**
   ```
   - 点击播放
   - 观察K线自动滚动
   - 控制台显示: Follow mode: scrolling to latest X
   ```

3. **激活锚点模式**
   ```
   - 播放到第10根
   - 暂停
   - 向左拖动K线
   - 控制台显示: User scrolled - Anchor mode activated at index: 10
   - 状态栏显示: 🔒 锚点模式
   ```

4. **测试锚点模式**
   ```
   - 继续播放
   - 观察视口是否固定
   - 控制台显示: Anchor mode: scrolling to index 10
   ```

5. **恢复跟随模式**
   ```
   - 点击 📍 按钮
   - 状态栏显示: 📍 跟随模式
   - 视口自动滚动到最新K线
   ```

## 如果仍然不工作

### 检查事件是否触发

在控制台输入：

```javascript
// 监听所有滚动事件
chart.subscribeAction('onScroll', () => {
  console.log('onScroll triggered!');
});

chart.subscribeAction('onVisibleRangeChange', () => {
  console.log('onVisibleRangeChange triggered!');
});
```

然后拖动K线，看哪个事件触发。

### 如果事件不触发

可能需要用鼠标拖动图表的特定区域（如K线区域，而不是Y轴）。

### 如果事件触发但锚点不生效

检查 `updateReplayDisplay()` 中的逻辑是否执行：

```javascript
// 在 updateReplayDisplay() 开头添加
console.log('Update display:', {
  userScrolled: replayState.userScrolled,
  anchorIndex: replayState.anchorIndex
});
```

## 总结

这是一个简化但实用的锚点实现：
- ✅ 用户拖动后，视口固定在拖动时的播放进度
- ✅ 新K线在锚点位置出现
- ✅ 可以一键恢复跟随模式
- ⚠️ 锚点是播放索引，不是精确的视口位置

如果需要更精确的控制，需要深入研究 KLineCharts v9 的 API，找到获取可见范围的方法。
