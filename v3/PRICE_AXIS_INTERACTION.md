# Lightweight Charts 价格轴交互行为分析

## 测试环境

- **图表库：** Lightweight Charts v4.1.3
- **测试页面：** v3/docs/kline_viewer.html
- **对比参考：** v2/docs/kline_viewer.html (KLineChart v9)

## 交互 1: 鼠标在右侧价格区滑动滚轮

### V3 (Lightweight Charts) 默认行为

**预期行为：**
- 滚轮向上：缩小价格范围（zoom in）
- 滚轮向下：放大价格范围（zoom out）

**实际测试：**
需要在浏览器中测试确认。

**代码位置：**
- V3 当前**没有自定义处理**，使用 Lightweight Charts 的默认行为
- Lightweight Charts 内置的价格轴缩放功能

### V2 (KLineChart) 自定义实现

**文件：** `v2/docs/kline_viewer.html`  
**位置：** 第 2523-2549 行

```javascript
// Wheel zoom on Y-axis area: scroll wheel on right side → vertical zoom
yAxisWheelHandler = (e) => {
  if (!chart) return;
  
  // 检查鼠标是否在 Y 轴区域
  const pane = chart.getDrawPaneById('candle_pane');
  if (!pane) return;
  const yAxisEl = pane.getYAxisWidget()?.getContainer();
  if (!yAxisEl || !yAxisEl.contains(e.target)) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // 获取当前价格范围
  const yAxis = pane.getAxisComponent();
  const range = yAxis.getRange();
  if (!range || range.realRange <= 0) return;
  
  // 计算缩放因子
  // 向上滚动 (deltaY < 0) → zoom in (缩小范围)
  // 向下滚动 (deltaY > 0) → zoom out (放大范围)
  const factor = e.deltaY > 0 ? 1.08 : 0.92;
  
  // 以当前范围中心为基准缩放
  const center = (range.from + range.to) / 2;
  const newRange = range.range * factor;
  const newFrom = center - newRange / 2;
  const newTo = center + newRange / 2;
  
  // 转换为实际价格值
  const newRealFrom = yAxis.convertToRealValue(newFrom);
  const newRealTo = yAxis.convertToRealValue(newTo);
  
  // 应用新范围
  yAxis.setRange({
    from: newFrom, 
    to: newTo, 
    range: newTo - newFrom,
    realFrom: newRealFrom, 
    realTo: newRealTo, 
    realRange: newRealTo - newRealFrom,
  });
  
  chart.adjustPaneViewport(false, true, true, true);
};

// 绑定事件（capture 阶段捕获）
container.addEventListener('wheel', yAxisWheelHandler, { capture: true });
```

**响应效果：**
- ✅ 滚轮向上：价格范围缩小 8% (factor = 0.92)
- ✅ 滚轮向下：价格范围放大 8% (factor = 1.08)
- ✅ 以当前可见范围的中心为基准缩放
- ✅ 阻止默认行为和事件冒泡

## 交互 2: 鼠标在右侧价格区按住左键并上下拖动

### V3 (Lightweight Charts) 默认行为

**预期行为：**
- 拖动：平移价格轴（上下移动可见价格范围）

**实际测试：**
需要在浏览器中测试确认。

**代码位置：**
- V3 当前**没有自定义处理**，使用 Lightweight Charts 的默认行为
- Lightweight Charts 内置的价格轴拖动功能

### V2 (KLineChart) 行为

**KLineChart v9 的默认行为：**
- 在价格轴区域拖动可以调整价格范围
- 具体实现由 KLineChart 库内部处理

**V2 没有自定义拖动处理代码**

## Lightweight Charts 默认交互

根据官方文档，Lightweight Charts 的价格轴默认支持：

### 1. 滚轮缩放
- **位置：** 价格轴区域（右侧）
- **操作：** 滚轮上下滚动
- **效果：** 垂直缩放价格范围

### 2. 拖动平移
- **位置：** 价格轴区域（右侧）
- **操作：** 按住左键拖动
- **效果：** 上下平移价格范围

### 3. 双击重置
- **位置：** 价格轴区域（右侧）
- **操作：** 双击
- **效果：** 重置价格范围到自动缩放

## 配置选项

Lightweight Charts 可以通过配置控制价格轴行为：

```javascript
chart.applyOptions({
  rightPriceScale: {
    // 是否可见
    visible: true,
    
    // 自动缩放模式
    autoScale: true,
    
    // 缩放边距
    scaleMargins: {
      top: 0.1,    // 顶部边距 10%
      bottom: 0.2, // 底部边距 20%
    },
    
    // 是否反转
    invertScale: false,
    
    // 是否对齐标签
    alignLabels: true,
    
    // 边框颜色
    borderColor: '#2a2e39',
  }
});
```

## V3 当前状态

### 已实现
```javascript
state.chart = LightweightCharts.createChart(container, {
  rightPriceScale: {
    borderColor: '#2a2e39',
  },
  // ... 其他配置
});
```

### 未实现
- ❌ 没有自定义滚轮缩放处理
- ❌ 没有自定义拖动处理
- ✅ 使用 Lightweight Charts 的默认行为

## 对比总结

| 交互 | V2 (KLineChart) | V3 (Lightweight Charts) |
|------|---------|-------------------|
| **价格轴滚轮** | 自定义实现，8% 缩放 | 默认行为 |
| **价格轴拖动** | 默认行为 | 默认行为 |
| **代码位置** | 2523-2549 行 | 无自定义代码 |
| **缩放因子** | 1.08 / 0.92 | 库内置 |
| **事件捕获** | capture: true | 库内置 |

## 测试步骤

### 1. 测试 V3 默认行为

```bash
# 访问 V3 页面
http://127.0.0.1:8000/v3/docs/kline_viewer.html

# 加载数据
开始时间: 2012-01-09 09:30
结束时间: 2012-01-09 16:00
周期: 1H
点击"加载"
```

**测试滚轮：**
1. 将鼠标移到右侧价格轴区域
2. 滚动滚轮
3. 观察价格范围变化

**测试拖动：**
1. 将鼠标移到右侧价格轴区域
2. 按住左键上下拖动
3. 观察价格范围变化

### 2. 对比 V2 行为

```bash
# 访问 V2 页面
http://127.0.0.1:8000/v2/docs/kline_viewer.html

# 执行相同的测试
```

## 是否需要自定义实现？

### 保持默认的理由
- ✅ Lightweight Charts 的默认行为已经很好
- ✅ 减少代码复杂度
- ✅ 更好的性能
- ✅ 自动适配库的更新

### 自定义实现的理由
- ✅ 精确控制缩放因子
- ✅ 自定义缩放逻辑
- ✅ 添加额外的交互反馈
- ✅ 与 V2 保持一致的体验

## 建议

### 方案 A: 保持默认（推荐）
先测试 Lightweight Charts 的默认行为，如果满足需求就不需要自定义。

### 方案 B: 参考 V2 实现
如果需要自定义，可以参考 V2 的实现，但需要适配 Lightweight Charts 的 API。

**注意：** Lightweight Charts 的 API 与 KLineChart 不同，需要查阅官方文档找到对应的方法。

## 下一步

1. **测试默认行为** - 在浏览器中实际测试
2. **记录测试结果** - 滚轮和拖动的具体效果
3. **决定是否自定义** - 根据测试结果决定
4. **查阅官方文档** - 如果需要自定义，查找 Lightweight Charts 的价格轴 API
## 相关文档

- [Lightweight Charts Price Scale API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceScaleOptions)
- [V2 实现代码](../../v2/docs/kline_viewer.html#L2523-L2549)
