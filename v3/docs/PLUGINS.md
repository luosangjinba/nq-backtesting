# Lightweight Charts 官方插件使用指南

## 概述

Lightweight Charts 提供了 27+ 个官方插件，涵盖绘图工具、指标、交互等功能。

**官方插件库：** https://tradingview.github.io/lightweight-charts/plugin-examples/

## 我们需要的插件

### 1. Rectangle Drawing Tool（矩形绘制）

**用途：** 绘制 FVG、OB 等价格区间

**示例：** https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/rectangle-drawing-tool/example/

**源码：** https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins/rectangle-drawing-tool
**使用方式：**
```javascript
// 简化版实现（见 test_rectangle.html）
class RectanglePrimitive {
  constructor(chart, series, startTime, topPrice, endTime, bottomPrice, color) {
    // ...
  }
  
  updateAllViews() {
    this._view.update();
  }
  
  paneViews() {
    return [this._view];
  }
}

// 使用
const rectangle = new RectanglePrimitive(
  chart,
  series,
  startTime,
  topPrice,
  endTime,
  bottomPrice,
  '#ab47bc33'
);
series.attachPrimitive(rectangle);
```

### 2. Vertical Line（垂直线）

**用途：** 标记重要时间点（如 ICT Midnight、NY Open）

**示例：** https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/vertical-line/example/

### 3. Session Highlighting（时段高亮）

**用途：** 高亮显示特定时段（如 9:30-10:30 NY Open 窗口）

**示例：** https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/session-highlighting/example/

### 4. Anchored Text（锚定文本）

**用途：** 在图表上添加文本标签（如 PDA 类型标签）

**示例：** https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/anchored-text/example/

### 5. Tooltip（提示框）

**用途：** 鼠标悬停显示详细信息

**示例：** https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/tooltip/example/

## Custom Primitives 核心接口

基于官方插件的实现，Custom Primitives 需要实现以下接口：

### 1. Primitive（主类）

```javascript
class MyPrimitive {
  updateAllViews() {
    // 更新所有视图
    this._view.update();
  }
  
  paneViews() {
    // 返回视图数组
    return [this._view];
  }
  
  // 可选：时间轴视图
  timeAxisViews() {
    return [];
  }
  
  // 可选：价格轴视图
  priceAxisViews() {
    return [];
  }
}
```

### 2. View（视图）

```javascript
class MyView {
  update() {
    // 坐标转换：时间/价格 → 像素坐标
    const timeScale = this._source._chart.timeScale();
    const series = this._source._series;
    
    this._x = timeScale.timeToCoordinate(this._source._time);
    this._y = series.priceToCoordinate(this._source._price);
  }
  
  render() {
    // 返回渲染器
    return new MyRenderer(this._x, this._y);
  }
}
```

### 3. Renderer（渲染器）

```javascript
class MyRenderer {
  draw(target) {
    // 关键：使用 useBitmapCoordinateSpace 处理高 DPI
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const x = this._x * scope.horizontalPixelRatio;
      const y = this._y * scope.verticalPixelRatio;
      
      // Canvas 绘制
      ctx.fillStyle = '#ab47bc';
      ctx.fillRect(x, y, 100, 50);
    });
  }
}
```

## 关键点

1. **`useBitmapCoordinateSpace`**：必须使用这个方法获取 Canvas 上下文，才能正确处理高 DPI 屏幕
2. **`horizontalPixelRatio` 和 `verticalPixelRatio`**：坐标需要乘以这些比例
3. **`update()` 在 `updateAllViews()` 中调用**：确保坐标转换在绘制前完成
4. **`paneViews()` 返回视图对象数组**：不是返回 `this`

## 测试文件

- `v3/docs/test_rectangle.html` - 简化版矩形实现
- 打开方式：http://127.0.0.1:8000/v3/docs/test_rectangle.html

## 下一步

1. 在 `kline_viewer.html` 中实现正确的 `FvgPrimitive`
2. 参考 `test_rectangle.html` 的实现
3. 添加其他 PDA 类型的渲染（NWOG/NDOG 等）
4. 考虑使用 Session Highlighting 插件高亮 NY Open 窗口

## 参考资料

- [Lightweight Charts 插件文档](https://tradingview.github.io/lightweight-charts/docs/plugins/intro)
- [插件示例](https://tradingview.github.io/lightweight-charts/plugin-examples/)
- [GitHub 源码](https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples/src/plugins)
