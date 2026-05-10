# TradingView 风格的回放逻辑

## 🎯 核心逻辑

实现了 TradingView 的经典回放行为：

### 1. 右侧"墙"
- 右侧空出约10根K线的空白区域
- 这个空白区域就是"墙"

### 2. 用户拖动
- 用户可以向左拖动K线查看历史
- 拖动时设置"视口锚点"

### 3. 新K线出现
- **未碰到墙**: 视口保持固定，新K线在左侧（视野外）出现
- **碰到墙**: 视口开始向左推动，保持最新K线距离墙的距离

---

## 📊 工作原理

### 状态管理

```javascript
replayState = {
  viewportAnchor: null  // 视口锚点索引
}
```

- `null`: 无锚点，自动跟随最新K线
- `数字`: 有锚点，视口固定在该索引

### 逻辑流程

```javascript
if (viewportAnchor === null) {
  // 初始状态：跟随最新K线
  滚动到最新K线 + 10根边距
} else {
  // 有锚点：检查是否碰到墙
  const wallPosition = viewportAnchor + 10;
  
  if (latestIndex >= wallPosition) {
    // 碰到墙：向左推
    viewportAnchor += (latestIndex - wallPosition + 1);
    滚动到新的锚点位置
  } else {
    // 未碰到墙：保持固定
    滚动到锚点位置
  }
}
```

---

## 🎮 使用场景

### 场景 1: 初始播放（无锚点）

```
第1根: [K1]                    [10根空白]|
第2根: [K1 K2]                 [10根空白]|
第3根: [K1 K2 K3]              [10根空白]|
...
自动跟随，最新K线距右边缘10根
```

### 场景 2: 用户向左拖动（设置锚点）

```
播放到第20根时，用户向左拖动到第10根：

视口: [K1...K10]               [10根空白]|
锚点: 第10根
墙位置: 第10根 + 10 = 第20根
```

### 场景 3: 继续播放（未碰到墙）

```
第21根: [K1...K10]             [10根空白]|
        ↑ 视口不动，K21在左侧视野外

第22根: [K1...K10]             [10根空白]|
        ↑ 视口不动，K22在左侧视野外

...直到第30根
```

### 场景 4: 碰到墙（开始推动）

```
第30根: [K1...K10]             [10根空白]|
        ↑ K30到达墙位置（第20根）

第31根: [K2...K11]             [10根空白]|
        ↑ 视口向左推1根

第32根: [K3...K12]             [10根空白]|
        ↑ 视口向左推1根
```

---

## 🔧 技术实现

### 1. 监听用户拖动

```javascript
chart.subscribeAction('onScroll', () => {
  // 用户拖动时，设置锚点为当前播放索引
  replayState.viewportAnchor = replayState.currentIndex;
});
```

### 2. 更新显示逻辑

```javascript
function updateReplayDisplay() {
  if (viewportAnchor === null) {
    // 无锚点：跟随最新
    chart.scrollToDataIndex(latestIndex, 0);
    chart.scrollByDistance(-marginPixels, 0);
  } else {
    // 有锚点：检查墙
    const wallPosition = viewportAnchor + RIGHT_MARGIN_BARS;
    
    if (latestIndex >= wallPosition) {
      // 碰到墙：推动
      const pushAmount = latestIndex - wallPosition + 1;
      viewportAnchor += pushAmount;
    }
    
    // 滚动到锚点位置
    chart.scrollToDataIndex(viewportAnchor, 0);
    chart.scrollByDistance(-marginPixels, 0);
  }
}
```

---

## 📈 视觉效果对比

### 传统方式（改进前）

```
每次新K线都自动滚动到最新位置
用户无法固定视口观察
```

### TradingView 方式（改进后）

```
用户拖动后，视口固定
新K线静默出现在左侧
直到碰到墙才开始推动
给用户完全的控制权
```

---

## 🧪 测试步骤

### 1. 初始播放测试

```
1. 加载数据（2008-02-14, 1H）
2. 点击播放
3. 观察：最新K线自动跟随，右侧保持10根空白
```

### 2. 拖动锚点测试

```
1. 播放到第20根
2. 暂停
3. 向左拖动K线到第10根
4. 控制台应显示: "User scrolled - viewport anchored at index: 20"
5. 继续播放
6. 观察：视口固定在第10根，新K线在左侧出现
```

### 3. 碰到墙测试

```
1. 继续播放到第30根（墙位置 = 20 + 10）
2. 观察：视口开始向左推动
3. 第31根时，视口推到第11根
4. 第32根时，视口推到第12根
```

---

## 🎯 关键参数

```javascript
const RIGHT_MARGIN_BARS = 10;  // 墙的宽度（10根K线）
```

调整这个值可以改变墙的宽度：
- `5`: 墙更窄，更快碰到
- `10`: 推荐值
- `15`: 墙更宽，更晚碰到

---

## 💡 优势

1. **用户控制**: 用户可以自由拖动查看历史
2. **视口稳定**: 拖动后视口不会乱跳
3. **自然推动**: 碰到墙时才推动，符合直觉
4. **专业体验**: 与 TradingView 一致的交互

---

## 📝 总结

这个实现完全模拟了 TradingView 的回放逻辑：

- ✅ 右侧10根K线的墙
- ✅ 用户拖动设置锚点
- ✅ 未碰到墙时视口固定
- ✅ 碰到墙时逐根推动
- ✅ 专业的交易软件体验

现在K线回放的交互体验与 TradingView 完全一致！
