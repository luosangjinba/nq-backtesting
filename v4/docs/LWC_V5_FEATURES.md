# LightweightCharts v5.2 功能/插件清单

## 一、内置系列类型（6 种）

| 系列 | 用途 | v4 → v5 变化 |
|------|------|-------------|
| **CandlestickSeries** | K 线图 | `addCandlestickSeries()` → `addSeries(CandlestickSeries)` |
| **LineSeries** | 折线图 | 同上 |
| **AreaSeries** | 面积图 | 同上 |
| **BarSeries** | 柱状图 | 同上 |
| **BaselineSeries** | 基线图 | 同上 |
| **HistogramSeries** | 直方图 | 同上 |

**v4 项目使用**: CandlestickSeries（主图）

---

## 二、内置插件（v5 从核心提取为插件）

### 1. Series Markers（标记点）
**函数**: `createSeriesMarkers(series, markers, options)`
**用途**: 在 K 线上标记箭头/圆点/方块，带文字标签

```js
const markers = LightweightCharts.createSeriesMarkers(series, [
  { time: 1234567890, position: 'aboveBar', shape: 'arrowUp', color: '#26a69a', text: 'BSL' },
  { time: 1234567900, position: 'belowBar', shape: 'arrowDown', color: '#ef5350', text: 'SSL' },
  { time: 1234567910, position: 'atPriceMiddle', shape: 'circle', color: '#ab47bc', text: 'FVG', price: 21350 },
]);
markers.setMarkers([]);  // 清除所有
markers.markers();       // 读取当前
markers.detach();        // 从 series 分离
```

**形状**: `arrowUp`, `arrowDown`, `circle`, `square`
**位置**: `aboveBar`, `belowBar`, `inBar`, `atPriceTop`, `atPriceBottom`, `atPriceMiddle`
**zOrder**: `top`, `aboveSeries`, `normal`

**v4 项目用途**: BSL/SSL 标签可用此插件替代自定义 LiquidityPrimitive（简化代码）
FVG 标签可用 `atPriceMiddle` + `circle` 标记

---

### 2. UpDown Markers（自动方向标记）
**函数**: `createUpDownMarkers(series, options)`
**用途**: 自动根据数据变化方向显示上/下箭头

```js
const udMarkers = LightweightCharts.createUpDownMarkers(series, {
  upColor: '#26a69a', downColor: '#ef5350'
});
udMarkers.setData(data);  // 用此代替 series.setData()
udMarkers.update(bar);    // 用此代替 series.update()
udMarkers.detach();       // 分离
```

**v4 项目用途**: 不适用（我们需要手动标注，不是自动方向标记）

---

### 3. Text Watermark（文字水印）
**函数**: `createTextWatermark(pane, options)`
**用途**: 在图表上显示文字水印

```js
const watermark = LightweightCharts.createTextWatermark(chart.panes()[0], {
  horzAlign: 'center', vertAlign: 'center',
  lines: [
    { text: 'NQ', color: 'rgba(255,255,255,0.1)', fontSize: 48, fontFamily: 'sans-serif' },
    { text: '2025-01-02', color: 'rgba(255,255,255,0.05)', fontSize: 24 },
  ]
});
watermark.applyOptions({ horzAlign: 'left' });
watermark.detach();
```

**v4 项目用途**: 可用于显示当前交易日/周期信息

---

### 4. Image Watermark（图片水印）
**函数**: `createImageWatermark(pane, imageUrl, options)`
**用途**: 在图表上显示图片水印

```js
const imgWatermark = LightweightCharts.createImageWatermark(chart.panes()[0], '/logo.png', {
  alpha: 0.5, padding: 20
});
imgWatermark.applyOptions({ padding: 10 });
imgWatermark.detach();
```

**v4 项目用途**: 不适用

---

## 三、PriceLine（价格线）

**函数**: `series.createPriceLine(options)`
**用途**: 在图表上画水平价格线

```js
const priceLine = series.createPriceLine({
  price: 21350,
  color: '#26a69a',
  lineWidth: 1,
  lineStyle: LightweightCharts.LineStyle.Dashed,  // Solid/Dotted/Dashed/LargeDashed/SparseDotted
  axisLabelVisible: true,
  title: 'BSL',
});
priceLine.applyOptions({ price: 21400 });
series.removePriceLine(priceLine);
```

**v4 项目用途**: BSL/SSL 水平线可用此替代自定义 LiquidityPrimitive
**局限**: PriceLine 是水平线，不能延伸到特定时间范围（只能全宽），不能加短标签

---

## 四、Series Primitive（自定义绘图）

**接口**: `ISeriesPrimitiveBase`
**用途**: 在 series 上绘制自定义图形（矩形、线段、标签等）

```js
class MyPrimitive {
  updateAllViews() { this._view.update(); }
  paneViews() { return [this._view]; }
  priceAxisViews?() { return [this._axisView]; }  // 可选：价格轴标签
  timeAxisViews?() { return [this._timeAxisView]; }  // 可选：时间轴标签
  autoscaleInfo?(start, end) { ... }  // 可选：自动缩放范围
  attached?(param) { ... }  // 可选：附加回调，param 含 chart, series, requestUpdate
  detached?() { ... }  // 可选：分离回调
  hitTest?(x, y) { ... }  // 可选：点击检测，返回 PrimitiveHoveredItem
}

// View 接口
class MyView {
  zOrder?() { return 'normal'; }  // 'bottom' | 'normal' | 'top'
  renderer() { return new MyRenderer(this); }
}

// Renderer 接口
class MyRenderer {
  draw(target, utils) {
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      ctx.fillStyle = 'red';
      ctx.fillRect(x, y, w, h);
      // utils.setLineStyle(ctx, LineStyle.Dashed);  // 内置线样式
    });
  }
  drawBackground?(target, utils) { ... }  // 可选：背景层绘制
}
```

**附加/分离**: `series.attachPrimitive(p)` / `series.detachPrimitive(p)`
**v4 项目用途**: FVG 矩形必须用此（Markers 无法画矩形）

---

## 五、Pane Primitive（图表级绘图）

**接口**: `IPanePrimitiveBase`
**用途**: 在 pane 上绘制跨 series 的图形

```js
class MyPanePrimitive {
  updateAllViews() { ... }
  paneViews() { return [this._view]; }
  attached?(param) { ... }  // param 含 chart, requestUpdate
  detached?() { ... }
  hitTest?(x, y) { ... }
}

// 附加到 pane
chart.panes()[0].attachPrimitive(p);
chart.panes()[0].detachPrimitive(p);
```

**v4 项目用途**: 可用于画跨 series 的标注（如 session 时间范围高亮）

---

## 六、Custom Series（自定义系列类型）

**接口**: `ICustomSeriesPaneView`
**用途**: 创建全新的系列类型（如蜡烛图变体、自定义柱状图等）

```js
const series = chart.addCustomSeries(myCustomPaneView, options);
```

**v4 项目用途**: 不适用（我们只需要标准 CandlestickSeries）

---

## 七、Multi-Pane（多面板）

**API**: `chart.addPane()`, `chart.panes()`, `chart.removePane()`, `chart.swapPanes()`
**用途**: 在同一图表中创建多个独立面板（如主图 + 成交量图）

```js
const volumePane = chart.addPane();
const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {}, volumePane.paneIndex());
```

**v4 项目用途**: 可用于在下方面板显示成交量

---

## 八、图表事件

| 事件 | 函数 | 参数 |
|------|------|------|
| **点击** | `chart.subscribeClick(handler)` | `{time, point, seriesData, hoveredInfo, sourceEvent}` |
| **双击** | `chart.subscribeDblClick(handler)` | 同上 |
| **十字线移动** | `chart.subscribeCrosshairMove(handler)` | 同上 |
| **可见范围变化** | `timeScale.subscribeVisibleTimeRangeChange(handler)` | `{from, to}` |
| **逻辑范围变化** | `timeScale.subscribeVisibleLogicalRangeChange(handler)` | `{from, to}` |
| **尺寸变化** | `timeScale.subscribeSizeChange(handler)` | `{width, height}` |
| **数据变化** | `series.subscribeDataChanged(handler)` | scope enum |

**hoveredInfo 结构**:
```js
{
  type: 'series-point' | 'series-line' | 'series-range' | 'marker' | 'price-line' | 'primitive' | 'custom',
  sourceKind: 'series' | 'series-primitive' | 'pane-primitive',
  objectKind: 'series' | 'custom-object' | 'custom-price-line' | 'series-marker' | 'primitive',
  series: ISeriesApi,
  objectId: unknown,  // Primitive 的 hitTest 返回的 externalId
  paneIndex: number
}
```

**v4 项目用途**: 右键菜单需要 `subscribeClick`，PDA 点击检测需要 `hoveredInfo.objectId`

---

## 九、坐标转换

| 方法 | 说明 |
|------|------|
| `series.priceToCoordinate(price)` | 价格 → Y 像素 |
| `series.coordinateToPrice(y)` | Y 像素 → 价格 |
| `timeScale.timeToCoordinate(time)` | 时间 → X 像素 |
| `timeScale.coordinateToTime(x)` | X 像素 → 时间 |
| `timeScale.coordinateToLogical(x)` | X 像素 → 逻辑索引 |
| `timeScale.logicalToCoordinate(logical)` | 逻辑索引 → X 像素 |
| `timeScale.timeToIndex(time)` | 时间 → 索引 |

---

## 十、截图

```js
const canvas = chart.takeScreenshot(addTopLayer, includeCrosshair);
```

**v4 项目用途**: 可用于导出图表截图

---

## v4 项目功能对照表

| v4 功能 | 用什么实现 | 是否需要自定义 Primitive |
|---------|-----------|------------------------|
| K 线图 | CandlestickSeries | ❌ |
| BSL/SSL 标签 | **createSeriesMarkers** (arrowUp/arrowDown + text) | ❌ 可替代 |
| BSL/SSL 水平短线 | **createPriceLine** (全宽虚线) 或 **LiquidityPrimitive** (短延伸线) | ✅ 短线需要 |
| FVG 矩形 | **FvgPrimitive** (矩形+中线) | ✅ 必须自定义 |
| EQH/EQL 标签 | **createSeriesMarkers** (circle + text) | ❌ |
| OB 矩形 | **FvgPrimitive** 变体 | ✅ |
| 交易日水印 | **createTextWatermark** | ❌ |
| 成交量面板 | **Multi-Pane** + HistogramSeries | ❌ |
| 右键点击检测 | **subscribeClick** + **hoveredInfo** | ❌ |
| Primitive 点击检测 | **hitTest** + **externalId** | ✅ |
| 回放（逐根显示） | **series.setData()** 逐步增加 | ❌ |