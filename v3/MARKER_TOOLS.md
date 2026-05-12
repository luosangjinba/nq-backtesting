# Lightweight Charts vs TradingView 标记工具对比

## 核心区别

**Lightweight Charts** 是 TradingView 的开源轻量版本，功能是 TradingView 完整版的子集。

## 标记功能对比

### TradingView 完整版
- ✓ 20+ 种绘图工具（趋势线、通道、斐波那契等）
- ✓ 文本标注、箭头、形状
- ✓ 测量工具
- ✓ 自定义绘图
- ✓ 保存和分享绘图

### Lightweight Charts
- ✓ **Series Markers** - 4 种形状
- ✓ **Price Lines** - 水平线
- ✓ **Custom Primitives** - 自定义绘图（需要手动实现）
- ✗ 没有内置的绘图工具栏
- ✗ 没有内置的趋势线、通道等工具

## Lightweight Charts 可用的标记类型

### 1. Series Markers（系列标记）

**可用形状：**
- `circle` - 圆形
- `square` - 方形
- `arrowUp` - 向上箭头
- `arrowDown` - 向下箭头

**位置：**
- `aboveBar` - K线上方
- `belowBar` - K线下方
- `inBar` - K线内部

**示例：**
```javascript
const markers = [
  {
    time: 1326124800,
    position: 'belowBar',
    color: '#ef5350',
    shape: 'arrowUp',
    text: 'SSL',
  },
  {
    time: 1326127200,
    position: 'aboveBar',
    color: '#26a69a',
    shape: 'arrowDown',
    text: 'BSL',
  },
];

candlestickSeries.setMarkers(markers);
```

### 2. Price Lines（价格线）

**特性：**
- 水平线，固定价格
- 可设置颜色、线宽、线型
- 可显示价格标签
- 可设置标题

**示例：**
```javascript
const priceLine = candlestickSeries.createPriceLine({
  price: 2344.25,
  color: '#ef5350',
  lineWidth: 2,
  lineStyle: LightweightCharts.LineStyle.Solid, // Solid, Dotted, Dashed, LargeDashed, SparseDotted
  axisLabelVisible: true,
  title: 'SSL',
});
```

### 3. Custom Primitives（自定义图元）

**用途：**
- 绘制任意形状（矩形、多边形、文本等）
- 实现复杂的标记（FVG 区域、OB 区域等）
- 需要手动实现绘制逻辑

**示例：**
```javascript
// 需要实现 ISeriesPrimitive 接口
class FvgPrimitive {
  draw(target) {
  // 自定义绘制逻辑
  }
  
  update(data) {
    // 更新数据
  }
}

const fvgPrimitive = new FvgPrimitive();
candlestickSeries.attachPrimitive(fvgPrimitive);
```

## 我们的实现策略

### Phase 1: 基础标记 ✅
- [x] SSL/BSL - 使用 Price Lines + Markers
- [x] 4 种形状：circle, square, arrowUp, arrowDown

### Phase 2: 范围标记 ⏳
- [ ] FVG - 使用 Custom Primitives 绘制矩形
- [ ] NWOG/NDOG - 使用 Custom Primitives 绘制矩形
- [ ] OB - 使用 Custom Primitives 绘制矩形

### Phase 3: 复合标记 ⏳
- [ ] EQH/EQL - 使用 Price Lines + Custom Primitives
- [ ] Daily High/Low - 使用 Price Lines

## 当前 V3 实现

### 已实现
```javascript
// SSL 标记（点类型）
addSslMarker(timestamp, price, label)
  - Price Line: 红色水平线
  - Marker: 红色向上箭头，K线下方

// BSL 标记（点类型）
addBslMarker(timestamp, price, label)
  - Price Line: 绿色水平线
  - Marker: 绿色向下箭头，K线上方
```

### 待实现
```javascript
// FVG 标记（范围类型）
addFvgMarker(startTime, endTime, lowPrice, highPrice, label)
  - Custom Primitive: 半透明矩形区域

// NWOG 标记（范围类型）
addNwogMarker(startTime, endTime, lowPrice, highPrice, label)
  - Custom Primitive: 半透明矩形区域
```

## 标记形状建议

### 点类型 PDA
| PDA 类型 | 形状 | 位置 | 颜色 |
|---------|------|------|------|
| SSL | arrowUp | belowBar | #ef5350 (红) |
| BSL | arrowDown | aboveBar | #26a69a (绿) |
| Daily Low | circle | belowBar | #ef5350 (红) |
| Daily High | circle | aboveBar | #26a69a (绿) |

### 范围类型 PDA
| PDA 类型 | 实现方式 | 颜色 |
|---------|---------|------|
| FVG | Custom Primitive (矩形) | #ab47bc (紫) |
| NWOG | Custom Primitive (矩形) | #ffa726 (橙) |
| NDOG | Custom Primitive (矩形) | #42a5f5 (蓝) |
| OB | Custom Primitive (矩形) | #7e57c2 (深紫) |

## 限制和解决方案

### 限制 1: 只有 4 种形状
**解决方案：** 使用颜色和位置区分不同类型的 PDA

### 限制 2: 没有内置矩形工具
**解决方案：** 使用 Custom Primitives 手动绘制

### 限制 3: 没有文本标注工具
**解决方案：** 使用 Marker 的 `text` 属性

### 限制 4: 没有趋势线工具
**解决方案：** 使用 Custom Primitives 绘制线段

## 参考资料

- [Series Markers Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/series-markers)
- [SeriesMarkerShape API](https://tradingview.github.io/lightweight-charts/docs/api/type-aliases/SeriesMarkerShape)
- [Price Lines API](https://tradingview.github.io/lightweight-charts/docs/api)
- [Custom Primitives](https://tradingview.github.io/lightweight-charts/docs/plugins/intro)

## 总结
Lightweight Charts 不是 TradingView 的完整克隆，而是一个轻量级的图表库：

**优势：**
- ✓ 轻量（50KB）
- ✓ 性能好
- ✓ 开源免费
- ✓ 可自定义扩展

**劣势：**
- ✗ 标记工具简单（只有 4 种形状）
- ✗ 需要手动实现复杂图形
- ✗ 没有内置绘图工具栏

**适用场景：**
- ✓ 需要嵌入网页的轻量级图表
- ✓ 需要自定义标记和绘图
- ✓ 性能优先的场景
- ✗ 需要完整绘图工具的场景（应使用 TradingView Widget）
