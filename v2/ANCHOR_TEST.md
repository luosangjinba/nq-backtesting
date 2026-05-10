# 锚点模式测试指南

## 🎯 测试目标

验证锚点模式是否正常工作。

---

## 📋 测试步骤

### 步骤 1: 强制刷新浏览器

```
Ctrl + Shift + R
```

### 步骤 2: 打开控制台

```
F12 或 Ctrl + Shift + I
```

### 步骤 3: 加载数据

```
日期: 2008-02-14
周期: 1H
点击 "结束" 按钮
```

### 步骤 4: 测试手动锁定按钮

这是最直接的测试方法：

1. **播放到第10根左右**
   - 点击播放 ▶
   - 等待播放到第10根
   - 暂停 ⏸

2. **点击 🔒 按钮**（新增的锁定按钮）
   - 观察控制台输出：
     ```
     手动激活锚点模式 at index: 10
     ```
   - 观察状态栏显示：`🔒 锚点模式`

3. **继续播放**
   - 点击播放 ▶
   - 观察控制台输出：
     ```
     Anchor mode: scrolling to index 10
     Anchor mode: scrolling to index 10
     Anchor mode: scrolling to index 10
     ```
   - **关键观察**: 视口是否固定在第10根位置？

4. **点击 📍 按钮恢复跟随**
   - 观察控制台输出：
     ```
     手动切换到跟随模式
     Follow mode: scrolling to latest X
     ```
   - 观察状态栏显示：`📍 跟随模式`
   - 视口应该自动滚动到最新K线

---

## ✅ 预期结果

### 锚点模式激活后

**视觉效果**:
- 视口固定在第10根K线位置
- 新K线出现在左侧（视野外）
- 图表不自动滚动

**控制台输出**:
```
手动激活锚点模式 at index: 10
Anchor mode: scrolling to index 10
Anchor mode: scrolling to index 10
Anchor mode: scrolling to index 10
```

**状态栏**:
```
🔒 锚点模式
```

### 恢复跟随模式后

**视觉效果**:
- 视口自动滚动到最新K线
- 最新K线在右侧（带约2根K线的空白）

**控制台输出**:
```
手动切换到跟随模式
Follow mode: scrolling to latest 15
Follow mode: scrolling to latest 16
```

**状态栏**:
```
📍 跟随模式
```

---

## 🔍 如果锚点模式不工作

### 问题 1: 点击 🔒 后视口仍然滚动

**检查**:
```javascript
// 在控制台输入
console.log({
  userScrolled: replayState.userScrolled,
  anchorIndex: replayState.anchorIndex,
  currentIndex: replayState.currentIndex
});
```

**预期输出**:
```javascript
{
  userScrolled: true,
  anchorIndex: 10,
  currentIndex: 15  // 当前播放到第15根
}
```

如果 `userScrolled` 是 `false` 或 `anchorIndex` 是 `null`，说明状态没有正确设置。

### 问题 2: 控制台没有 "Anchor mode" 输出

**检查 updateReplayDisplay 是否执行**:
```javascript
// 在控制台输入
console.log('Testing updateReplayDisplay');
updateReplayDisplay();
```

应该看到 "Anchor mode" 或 "Follow mode" 输出。

### 问题 3: 视口滚动到错误的位置

**检查锚点索引**:
```javascript
// 在控制台输入
console.log('Anchor index:', replayState.anchorIndex);
console.log('Current index:', replayState.currentIndex);
console.log('Data length:', lastCandleData.length);
```

锚点索引应该是一个合理的数字（0 到数据长度之间）。

---

## 🧪 高级测试

### 测试 1: 不同位置的锚点

```
1. 播放到第5根，点击 🔒
2. 继续播放到第15根
3. 观察视口是否固定在第5根

4. 点击 📍 恢复跟随
5. 播放到第20根，点击 🔒
6. 继续播放到第30根
7. 观察视口是否固定在第20根
```

### 测试 2: 快速切换模式

```
1. 播放中点击 🔒（锁定）
2. 立即点击 📍（跟随）
3. 再次点击 🔒（锁定）
4. 观察模式是否正确切换
```

### 测试 3: 锚点模式下的其他操作

```
1. 激活锚点模式
2. 尝试：
   - 前进/后退按钮
   - 拖动进度条
   - 改变播放速度
3. 观察锚点是否保持
```

---

## 🐛 调试命令

### 查看完整状态

```javascript
console.log('=== Replay State ===');
console.log('Enabled:', replayState.enabled);
console.log('User scrolled:', replayState.userScrolled);
console.log('Anchor index:', replayState.anchorIndex);
console.log('Current index:', replayState.currentIndex);
console.log('Total bars:', replayState.totalBars);
console.log('Is playing:', replayState.isPlaying);
```

### 手动设置锚点

```javascript
// 激活锚点模式在索引 5
replayState.userScrolled = true;
replayState.anchorIndex = 5;
updateReplayUI();
console.log('Manually set anchor to index 5');
```

### 手动恢复跟随

```javascript
// 恢复跟随模式
replayState.userScrolled = false;
replayState.anchorIndex = null;
updateReplayUI();
console.log('Manually reset to follow mode');
```

### 测试滚动逻辑

```javascript
// 测试滚动到特定索引
chart.scrollToDataIndex(10, 0);
console.log('Scrolled to index 10');

// 测试滚动偏移
const barSpace = chart.getBarSpace();
console.log('Bar space:', barSpace);
chart.scrollByDistance(-barSpace * 2, 0);
console.log('Scrolled back by 2 bars');
```

---

## 📊 成功标准

锚点模式成功实现的标志：

1. ✅ 点击 🔒 按钮后，状态栏显示 "🔒 锚点模式"
2. ✅ 控制台输出 "Anchor mode: scrolling to index X"
3. ✅ 继续播放时，视口固定不动
4. ✅ 新K线出现在左侧（视野外）
5. ✅ 点击 📍 按钮后，恢复自动跟随
6. ✅ 状态栏显示 "📍 跟随模式"

---

## 📝 测试报告模板

请按照以下格式反馈测试结果：

```
### 测试环境
- 浏览器: Chrome/Firefox/Safari
- 版本: 
- 日期: 2008-02-14
- 周期: 1H

### 测试结果

#### 1. 手动锁定按钮测试
- [ ] 点击 🔒 后状态栏显示 "🔒 锚点模式"
- [ ] 控制台输出 "手动激活锚点模式"
- [ ] 继续播放时视口固定
- [ ] 控制台输出 "Anchor mode: scrolling to index X"

#### 2. 恢复跟随测试
- [ ] 点击 📍 后状态栏显示 "📍 跟随模式"
- [ ] 控制台输出 "手动切换到跟随模式"
- [ ] 视口自动滚动到最新K线
- [ ] 控制台输出 "Follow mode: scrolling to latest X"

#### 3. 问题描述
（如果有问题，请详细描述）

#### 4. 控制台输出
（粘贴相关的控制台输出）
```

---

## 🎉 下一步

如果手动锁定按钮测试成功，说明核心逻辑是正确的。

接下来可以：
1. 测试鼠标拖动是否触发锚点（使用事件测试页面）
2. 如果拖动不触发，可以保留手动按钮作为功能入口
3. 或者研究如何正确监听拖动事件

---

现在请按照上述步骤测试，并告诉我结果！
