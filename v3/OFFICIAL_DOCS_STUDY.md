# Lightweight Charts 官方文档学习总结

## 核心原则

**只使用官方提供的标注工具，不自创标注**（除非用户不满意某个标注的形状）

## 可用的标注工具

### 1. Series Markers（系列标记）✅

**官方文档：** [Series Markers Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/series-markers)

**可用形状：**
- `circle` - 圆形
- `square` - 方形
- `arrowUp` - 向上箭头
- `arrowDown` - 向下箭头

**位置选项：**
- `aboveBar` - K线上方
- `belowBar` - K线下方
- `inBar` - K线内部

**使用方法：**
```javascript
const markers = [
  {
    time: 1326124800,
    position: 'belowBar',
    color: '#ef5350',
    shape: 'circle',
    text: 'SSL',
  }
];

// 方式 1: 直接设置（v4.x）
candlestickSeries.setMarkers(markers);

// 方式 2: 使用插件（推荐）
import { createSeriesMarkers } from 'lightweight-charts';
createSeriesMarkers(candlestickSeries, markers);
```

**特点：**
- ✓ 简单易用
- ✓ 自动定位（基于 K线的 high/low）
- ✓ 支持文本标签
- ✗ 只有 4 种形状

### 2. Price Lines（价格线）✅

**官方文档：** [PriceLineOptions API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/PriceLineOptions)

**配置选项：**
```javascript
const priceLine = candlestickSeries.createPriceLine({
  price: 2344.25,              // 必需：价格位置
  color: '#ef5350',            // 线条颜色
  lineWidth: 2,        // 线宽（像素）
  lineStyle: LineStyle.Solid,  // 线型
  axisLabelVisible: true,      // 显示价格标签
  axisLabelColor: '#ef5350',   // 标签背景色
  axisLabelTextColor: '#fff',  // 标签文字色
  title: 'SSL',                // 图表上的标题
  lineVisible: true,           // 显示线条
});

// 移除 Price Line
candlestickSeries.removePriceLine(priceLine);
```

**可用线型（LineStyle）：**
- `LineStyle.Solid` (0) - 实线
- `LineStyle.Dotted` (1) - 点线
- `LineStyle.Dashed` (2) - 虚线
- `LineStyle.LargeDashed` (3) - 大虚线
- `LineStyle.SparseDotted` (4) - 稀疏点线

**特点：**
- ✓ 水平线，固定价格
- ✓ 多种线型可选
- ✓ 可显示价格标签和标题
- ✗ 只能绘制水平线

### 3. Custom Primitives（自定义图元）✅

**官方文档：** [Plugins Introduction](https://tradingview.github.io/lightweight-charts/docs/plugins/intro)

**两种类型：**

#### Series Primitives（系列图元）
- 附加到特定系列
- 可渲染在主面板、价格轴、时间轴
- 用于绘制与数据相关的图形

```javascript
class MyCustomPrimitive {
  // 实现 ISeriesPrimitive 接口
  draw(target) {
    // 自定义绘制逻辑
  }
}

const primitive = new MyCustomPrimitive();
candlestickSeries.attachPrimitive(primitive);
```

#### Pane Primitives（面板图元）
- 附加到图表面板
- 只能渲染在主面板
- 用于绘制图表级别的注释（如水印）

```javascript
class MyPanePrimitive {
  // 实现 IPanePrimitive 接口
}

const primitive = new MyPanePrimitive();
const mainPane = chart.panes()[0];
mainPane.attachPrimitive(primitive);
```

**特点：**
- ✓ 完全自定义
- ✓ 可绘制任意图形
- ✗ 需要手动实现绘制逻辑
- ✗ 复杂度较高

### 4. 官方插件示例 ✅

**插件示例页面：** [Plugin Examples](https://tradingview.github.io/lightweight-charts/plugin-examples/)

**可用的官方插件：**

#### Rectangle Drawing Tool（矩形绘图工具）
- **示例：** [Rectangle Drawing Tool](https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/rectangle-drawing-tool/example/)
- **用途：** 绘制矩形区域（适合 FVG、OB、NWOG 等）
- **使用：** 点击激活，在图表上点击两次定义矩形

#### 其他官方插件
- Heatmap（热力图）
- Alerts（警报）
- Watermarks（水印）
- Tooltips（工具提示）

### 5. 第三方绘图工具库 ✅

**deepentropy/lightweight-charts-drawing**
- **GitHub：** [lightweight-charts-drawing](https://github.com/deepentropy/lightweight-charts-drawing)
- **功能：** 68 种绘图工具
  - 趋势线
  - 斐波那契
  - 甘恩工具
  - 通道
  - 音叉
  - 形状
  - 注释
  - 预测工具

**特点：**
- ✓ 功能丰富
- ✓ 开源免费
- ✗ 第三方库，需要额外集成

## 我们的实现策略

### Phase 1: 点类型 PDA（使用官方工具）✅

| PDA 类型 | 工具 | 形状 | 位置 | 颜色 |
|---------|------|------|------|---|
| SSL | Marker + Price Line | circle | belowBar | #ef5350 |
| BSL | Marker + Price Line | circle | aboveBar | #26a69a |
| Daily Low | Marker + Price Line | circle | belowBar | #ef5350 |
| Daily High | Marker + Price Line | circle | aboveBar | #26a69a |

**代码示例：**
```javascript
// SSL 标记
function addSslMarker(timestamp, price, label = 'SSL') {
  // Price Line
  const priceLine = candlestickSeries.createPriceLine({
    price: price,
    color: '#ef5350',
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Solid,
    axisLabelVisible: true,
    title: label,
  });

  // Marker
  const marker = {
    time: timestamp,
    position: 'belowBar',
    color: '#ef5350',
    shape: 'circle',
    text: label,
  };
  candlestickSeries.setMarkers([...existingMarkers, marker]);
}
```

### Phase 2: 范围类型 PDA（使用官方插件）⏳

| PDA 类型 | 工具 | 颜色 |
|---------|------|------|
| FVG | Rectangle Drawing Tool | #ab47bc |
| NWOG | Rectangle Drawing Tool | #ffa726 |
| NDOG | Rectangle Drawing Tool | #42a5f5 |
| OB | Rectangle Drawing Tool | #7e57c2 |

**实现方案：**
1. 使用官方 Rectangle Drawing Tool 插件
2. 或使用 Custom Primitives 手动实现矩形绘制
3. 或集成 lightweight-charts-drawing 第三方库

### Phase 3: 复合类型 PDA ⏳

| PDA 类型 | 工具 | 实现方式 |
|---------|------|---------|
| EQH | Price Line + Marker | 多个 Price Line 连接 |
| EQL | Price Line + Marker | 多个 Price Line 连接 |

## 当前代码状态

### 已实现 ✅
```javascript
// v3/docs/kline_viewer.html
// 1. 状态管理
const state = {
  priceLines: [],  // 存储 Price Lines
  markers: [],     // 存储 Markers
};

// 2. SSL 标记（使用官方工具）
function addSslMarker(timestamp, price, label) {
  // Price Line（官方 API）
  const priceLine = candlestickSeries.createPriceLine({...});
  
  // Marker（官方 API）
  const marker = { time, position: 'belowBar', shape: 'circle', ... };
  candlestickSeries.setMarkers([...state.markers, marker]);
}

// 3. BSL 标记（使用官方工具）
function addBslMarker(timestamp, price, label) {
  // 同上，position: 'aboveBar'
}

// 4. 清除标记
function clearPdaMarkers() {
  state.priceLines.forEach(line => 
    candlestickSeries.removePriceLine(line)
  );
  candlestickSeries.setMarkers([]);
}
```

### 待实现 ⏳

#### 方案 A: 使用官方 Rectangle Plugin
```javascript
// 需要研究官方插件的集成方法
import { RectangleDrawingTool } from 'lightweight-charts-plugins';

function addFvgMarker(startTime, endTime, lowPrice, highPrice) {
  // 使用官方矩形插件
}
```

#### 方案 B: 使用 Custom Primitives
```javascript
class FvgPrimitive {
  constructor(startTime, endTime, lowPrice, highPrice, color) {
    this._data = { startTime, endTime, lowPrice, highPrice, color };
  }

  draw(target) {
    // 手动绘制矩形
    const ctx = target.context;
    ctx.fillStyle = this._data.color + '33'; // 半透明
    ctx.fillRect(x1, y1, width, height);
  }
}

function addFvgMarker(startTime, endTime, lowPrice, highPrice) {
  const primitive = new FvgPrimitive(startTime, endTime, lowPrice, highPrice, '#ab47bc');
  candlestickSeries.attachPrimitive(primitive);
}
```

#### 方案 C: 使用第三方库
```javascript
import { RectangleTool } from 'lightweight-charts-drawing';

function addFvgMarker(startTime, endTime, lowPrice, highPrice) {
  const rectangle = new RectangleTool({
    startTime, endTime, lowPrice, highPrice,
    fillColor: '#ab47bc33',
    borderColor: '#ab47bc',
  });
  chart.addDrawing(rectangle);
}
```

## 下一步行动

1. **测试当前实现** ✅
   - 验证 SSL 标记显示正确
   - 测试 Price Line 和 Marker 的组合效果

2. **研究矩形绘制**
   - 选项 A: 研究官方 Rectangle Drawing Tool 的源码
   - 选项 B: 学习 Custom Primitives 的实现方法
   - 选项 C: 评估 lightweight-charts-drawing 库

3. **实现 FVG 标记**
   - 选择最合适的方案
   - 实现矩形绘制功能
   - 测试效果

## 参考资料

### 官方文档
- [API Documentation](https://tradingview.github.io/lightweight-charts/docs/api)
- [Series Markers Tutorial](https://tradingview.github.io/lightweight-charts/tutorials/how_to/series-markers)
- [Plugins Introduction](https://tradingview.github.io/lightweight-charts/docs/plugins/intro)
- [Plugin Examples](https://tradingview.github.io/lightweight-charts/plugin-examples/)

### 第三方资源
- [lightweight-charts-drawing](https://github.com/deepentropy/lightweight-charts-drawing) - 68 种绘图工具
- [Rectangle Drawing Tool Example](https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/rectangle-drawing-tool/example/)

### GitHub Issues
- [Rectangle plugin #1548](https://github.com/tradingview/lightweight-charts/issues/1548)
- [Add ability to draw a rectangle #1914](https://github.com/tradingview/lightweight-charts/discussions/1914)

## 总结

Lightweight Charts 提供了完整的标注工具集：
- ✅ **Series Markers** - 4 种形状，简单易用
- ✅ **Price Lines** - 5 种线型，功能完善
- ✅ **Custom Primitives** - 完全自定义，灵活强大
- ✅ **官方插件** - Rectangle Drawing Tool 等
- ✅ **第三方库** - 68 种绘图工具

**原则：优先使用官方工具，避免重复造轮子。**
