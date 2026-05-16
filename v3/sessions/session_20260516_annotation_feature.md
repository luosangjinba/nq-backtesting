# 会话记录 - 图表标注功能实现

**日期**：2026-05-16  
**时长**：~2 小时  
**分支**：`main`  
**状态**：✅ 完成

---

## 需求背景

用户希望在图表上快速标注重要的价格点和 FVG，方便后续整理结构时使用。

**核心需求**：
1. **Swing Low 标注**：右键点击 K 线 → 在低点绘制水平线段（3 根 K 线长度）+ "SL"文字
2. **Swing High 标注**：右键点击 K 线 → 在高点绘制水平线段（3 根 K 线长度）+ "SH"文字
3. **FVG 标注**：右键点击 FVG 的 K 线 → 绘制矩形 + 周期文字（如"1H"）

**关键要求**：
- 直接在图表上绘制，不涉及数据库存储
- 支持所有周期（1M, 15M, 1H, 4H, D, W）
- 只是临时标注，方便后续整理结构

---
## 实施过程

### 1. 创建标注渲染模块

**新建文件**：`v3/modules/annotation.js`

**核心类**：

1. **SwingPrimitive**：
   - 绘制水平线段（起点到起点+3根K线）
   - 绘制文字标签（SL/SH）
   - 颜色：Swing Low=蓝色，Swing High=橙色

2. **FvgAnnotationPrimitive**：
   - 绘制半透明矩形（覆盖 FVG 区域）
   - 绘制周期文字（中央位置）
   - 颜色：向上FVG=蓝色，向下FVG=橙色

**导出函数**：
- `addSwingLow(time, price, timeframe)` - 添加 Swing Low 标注
- `addSwingHigh(time, price, timeframe)` - 添加 Swing High 标注
- `addFvgAnnotation(anchorTime, high, low, direction, timeframe)` - 添加 FVG 标注
- `clearAllAnnotations()` - 清除所有标注

**技术要点**：
- 使用 Lightweight Charts 的 `attachPrimitive()` API
- 自定义 `draw()` 方法绘制 Canvas 图形
- 坐标转换：时间戳 → 屏幕 X 坐标，价格 → 屏幕 Y 坐标
---

### 2. 扩展右键菜单

**修改文件**：`v3/modules/context-menu.js`

**新增函数**：`showKlineMenu(x, y, barData, timeframe, onAnnotate)`

**菜单项**：
```
📍 标注 Swing Low
📍 标注 Swing High
📍 标注 FVG
───────────────
🔄 刷新数据 (F5)
```

**触发条件**：右键点击 K 线（不是空白区域）

---

### 3. 修改主页面逻辑

**修改文件**：`v3/docs/kline_viewer.html`

**新增函数**：

1. **findBarAtTime(timestamp)**：
   - 根据时间戳查找 K 线数据
   - 容差：半根 K 线（避免点击偏差）
   - 返回：K 线数据或 null

2. **handleAnnotate(annotationType, barData, timeframe)**：
   - 处理标注请求
   - 调用对应的标注函数
   - 更新状态栏提示

**修改右键事件处理**：
```javascript
chartContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const pda = findPdaAtPosition(e.clientX, e.clientY);

  if (pda) {
    // 点击到 PDA，显示 PDA 菜单
    showPdaMenu(...);
  } else {
    // 获取点击位置的时间戳
    const timestamp = timeScale.coordinateToTime(x);
    
    // 检测是否点击在 K 线上
    const barData = findBarAtTime(timestamp);

    if (barData) {
      // 点击在 K 线上，显示标注菜单
      showKlineMenu(e.clientX, e.clientY, barData, timeframe, handleAnnotate);
    } else {
      // 空白区域，显示手动添加 PDA 菜单
      showBlankAreaMenu(...);
    }
  }
});
```

**导入模块**：
```javascript
import { showKlineMenu } from '../modules/context-menu.js';
import { addSwingLow, addSwingHigh, addFvgAnnotation } from '../modules/annotation.js';
```

---

## 技术细节

### 1. 坐标转换

**时间 → 屏幕 X 坐标**：
```javascript
const timeScale = target.chart.timeScale();
const x = timeScale.timeToCoordinate(time);
const screenX = x * target.horizontalPixelRatio;
```

**价格 → 屏幕 Y 坐标**：
```javascript
const y = series.priceToCoordinate(price);
const screenY = y * target.verticalPixelRatio;
```

### 2. 绘制水平线段

```javascript
// 计算起始和结束时间（向右 3 根 K 线）
const startTime = this._time;
const endTime = this._time + 3 * this._timeframe * 60; // 秒

// 转换为屏幕坐标
const x1 = timeScale.timeToCoordinate(startTime);
const x2 = timeScale.timeToCoordinate(endTime);

// 绘制线段
ctx.strokeStyle = '#2196F3';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(screenX1, screenY);
ctx.lineTo(screenX2, screenY);
ctx.stroke();
```

### 3. 绘制文字标签

```javascript
ctx.fillStyle = '#2196F3';
ctx.font = '12px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'top';
ctx.fillText('SL', (screenX1 + screenX2) / 2, textY);
```

### 4. FVG 识别

复用现有的 `identifyFvg()` 函数：
```javascript
const fvgResult = identifyFvg(state.candleData, barData.time);

if (fvgResult) {
  addFvgAnnotation(
    fvgResult.anchorTime,
    fvgResult.high,
    fvgResult.low,
    fvgResult.direction,
    timeframe
  );
}
```

---

## 文件清单

### 新增文件
- `v3/modules/annotation.js` - 标注渲染模块（230 行）
- `v3/docs/ANNOTATION_TEST_GUIDE.md` - 测试指南
- `v3/docs/ANNOTATION_PLAN.md` - 实施计划（已完成）

### 修改文件
- `v3/modules/context-menu.js` - 添加 `showKlineMenu()` 函数（+55 行）
- `v3/docs/kline_viewer.html` - 添加标注处理逻辑（+70 行）
- `v3/TODO.md` - 更新状态

---

## 测试指南

详见：`v3/docs/ANNOTATION_TEST_GUIDE.md`

**快速测试**：
1. 打开页面：`http://127.0.0.1:8000/docs/kline_viewer.html`
2. 加载数据：`2012-01-09 02:00` ~ `2012-01-09 16:00`，周期 `1H`
3. 右键点击任意 K 线
4. 选择"标注 Swing Low"或"标注 Swing High"
5. 观察是否绘制水平线段和文字标签

---

## 已知限制

1. **标注不持久化**：
   - 标注只存在于当前会话
   - 刷新页面后标注会消失
   - 后续可以添加 localStorage 存储

2. **无法编辑/删除标注**：
   - 当前版本只能添加标注
   - 如需清除标注，需要刷新页面
   - 后续可以添加右键删除功能

3. **FVG 识别限制**：
   - 只能识别标准的 3 根 K 线 FVG
   - 如果 FVG 被部分填充，可能无法识别

---

## 下一步优化

1. **数据持久化**：
   - 保存标注到 localStorage
   - 页面加载时恢复标注
   - 导出标注到 YAML 文件

2. **标注管理**：
   - 右键点击标注，显示"删除"选项
   - 添加"清除所有标注"按钮
   - 支持编辑标注（修改颜色、长度等）

3. **标注样式**：
   - 支持自定义颜色
   - 支持自定义线段长度
   - 支持自定义文字内容

4. **标注关联**：
   - 将标注与 PDA 关联
   - 用于后续结构分析

---

## 技术总结

### 成功经验

1. **自定义 Primitive**：
   - Lightweight Charts 的 Primitive API 非常灵活
   - 可以绘制任意 Canvas 图形
   - 坐标转换需要注意 `horizontalPixelRatio` 和 `verticalPixelRatio`

2. **右键菜单扩展**：
   - 通过检测点击位置，动态显示不同菜单
   - `findBarAtTime()` 函数使用容差避免点击偏差

3. **模块化设计**：
   - 标注逻辑独立于主页面
   - 易于维护和扩展

### 遇到的问题
1. **坐标转换**：
   - 初始版本忘记乘以 `horizontalPixelRatio`，导致线段位置错误
   - 解决：参考 `pda-render.js` 中的实现

2. **文字定位**：
   - Swing Low 的文字应该在线段下方，Swing High 在上方
   - 解决：根据类型调整 `textY` 偏移量

3. **FVG 矩形范围**：
   - 初始版本矩形太宽，覆盖多根 K 线
   - 解决：使用锚点时间 ± 半根 K 线作为矩形范围

---

## 用户反馈

**用户问题 1**：v3 无法制作子菜单吗？

**回答**：
- v3 当前的右键菜单实现不支持子菜单
- 为了快速实现功能，采用了扁平菜单结构
- 如果需要子菜单，可以参考 v2 的实现，添加 CSS 样式和 JS 逻辑

**用户问题 2**：该是哪个周期的就是哪个周期的，甚至 1m 周期也能绘制

**回答**：
- 已实现：标注功能支持所有周期（1M, 15M, 1H, 4H, D, W）
- 线段长度和 FVG 矩形范围会根据周期自动调整
- 周期文字会正确显示（如"1M", "15M", "1H"）

---

**会话完成时间**：2026-05-16 11:30
