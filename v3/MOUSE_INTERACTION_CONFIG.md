# Lightweight Charts 鼠标交互配置选项

## 概述

Lightweight Charts 提供了丰富的配置选项来控制鼠标交互行为，**无需编写代码，只需调整参数**。

## 配置位置

在创建图表时通过 `handleScroll` 和 `handleScale` 选项配置：

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScroll: {
    // 滚动相关配置
  },
  handleScale: {
    // 缩放相关配置
  },
});
```

## 1. 滚动配置 (handleScroll)

控制图表的滚动行为。

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `mouseWheel` | boolean | `true` | 鼠标滚轮滚动 |
| `pressedMouseMove` | boolean | `true` | 按住左键拖动滚动 |
| `horzTouchDrag` | boolean | `true` | 水平触摸拖动 |
| `vertTouchDrag` | boolean | `true` | 垂直触摸拖动 |

### 示例

```javascript
// 禁用所有滚动
handleScroll: {
  mouseWheel: false,
  pressedMouseMove: false,
  horzTouchDrag: false,
  vertTouchDrag: false,
}

// 只允许鼠标滚轮滚动
handleScroll: {
  mouseWheel: true,
  pressedMouseMove: false,
  horzTouchDrag: false,
  vertTouchDrag: false,
}
```

## 2. 缩放配置 (handleScale)

控制图表的缩放行为。

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|------|------|
| `mouseWheel` | boolean | `true` | 鼠标滚轮缩放 |
| `pinch` | boolean | `true` | 捏合手势缩放 |
| `axisPressedMouseMove` | boolean \| object | - | 按住左键拖动缩放轴 |
| `axisDoubleClickReset` | boolean \| object | - | 双击重置轴 |

### axisPressedMouseMove 详细配置

控制在价格轴或时间轴区域按住左键拖动时的缩放行为。

**简单配置（boolean）：**
```javascript
handleScale: {
  axisPressedMouseMove: true,  // 启用
  axisPressedMouseMove: false, // 禁用
}
```

**详细配置（object）：**
```javascript
handleScale: {
  axisPressedMouseMove: {
    time: true,   // 时间轴拖动缩放
    price: true,  // 价格轴拖动缩放
  }
}
```

### 示例

```javascript
// 禁用所有缩放
handleScale: {
  mouseWheel: false,
  pinch: false,
  axisPressedMouseMove: false,
  axisDoubleClickReset: false,
}

// 只允许价格轴拖动缩放
handleScale: {
  mouseWheel: false,
  pinch: false,
  axisPressedMouseMove: {
    time: false,
    price: true,
  },
  axisDoubleClickReset: true,
}
```

## 3. 针对价格轴的配置

### 场景 1: 禁用价格轴滚轮缩放

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: {
    mouseWheel: false,  // 禁用滚轮缩放
  },
});
```

### 场景 2: 禁用价格轴拖动缩放

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: {
    axisPressedMouseMove: {
      time: true,   // 保留时间轴拖动
   price: false, // 禁用价格轴拖动
    },
  },
});
```

### 场景 3: 只允许双击重置

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: {
    mouseWheel: false,
    axisPressedMouseMove: false,
    axisDoubleClickReset: true,  // 只允许双击重置
  },
});
```

## 4. 完整配置示例

### 默认配置（全部启用）

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: {
    time: true,
      price: true,
    },
    axisDoubleClickReset: true,
  },
});
```

### 保守配置（限制交互）

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScroll: {
    mouseWheel: true,          // 允许滚轮滚动
    pressedMouseMove: false,   // 禁用拖动滚动
    horzTouchDrag: false,
    vertTouchDrag: false,
  },
  handleScale: {
    mouseWheel: false,         // 禁用滚轮缩放
    pinch: false,
    axisPressedMouseMove: false, // 禁用拖动缩放
    axisDoubleClickReset: true,  // 允许双击重置
  },
});
```

### 只读模式（禁用所有交互）

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScroll: {
    mouseWheel: false,
    pressedMouseMove: false,
    horzTouchDrag: false,
    vertTouchDrag: false,
  },
  handleScale: {
    mouseWheel: false,
    pinch: false,
    axisPressedMouseMove: false,
    axisDoubleClickReset: false,
  },
});
```

## 5. V3 当前配置

### 当前状态

```javascript
// v3/docs/kline_viewer.html
state.chart = LightweightCharts.createChart(container, {
  // 没有配置 handleScroll 和 handleScale
  // 使用默认值（全部启用）
});
```

### 建议配置

根据 V2 的行为，建议配置：

```javascript
state.chart = LightweightCharts.createChart(container, {
  handleScroll: {
    mouseWheel: true,          // 主图区滚轮滚动
    pressedMouseMove: true,    // 主图区拖动滚动
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,          // 价格轴滚轮缩放
    pinch: true,
    axisPressedMouseMove: {
      time: true,            // 时间轴拖动缩放
      price: true,           // 价格轴拖动缩放
    },
    axisDoubleClickReset: true, // 双击重置
  },
});
```

## 6. 动态修改配置

可以在运行时修改配置：

```javascript
// 创建图表后修改
chart.applyOptions({
  handleScale: {
    mouseWheel: false,  // 禁用滚轮缩放
  },
});

// 根据条件切换
function togglePriceAxisZoom(enabled) {
  chart.applyOptions({
    handleScale: {
      axisPressedMouseMove: {
        price: enabled,
      },
    },
  });
}
```

## 7. 常见场景配置

### 场景 A: 演示模式（只看不动）

```javascript
handleScroll: { mouseWheel: false, pressedMouseMove: false },
handleScale: { mouseWheel: false, axisPressedMouseMove: false },
```

### 场景 B: 分析模式（允许所有交互）

```javascript
handleScroll: { mouseWheel: true, pressedMouseMove: true },
handleScale: { mouseWheel: true, axisPressedMouseMove: true },
```

### 场景 C: 移动端优化

```javascript
handleScroll: {
  mouseWheel: false,
  pressedMouseMove: false,
  horzTouchDrag: true,  // 启用触摸
  vertTouchDrag: true,
},
handleScale: {
  mouseWheel: false,
  pinch: true,          // 启用捏合缩放
  axisPressedMouseMove: false,
},
```

## 8. 测试配置

### 测试步骤

1. 修改 `v3/docs/kline_viewer.html` 的图表配置
2. 刷新页面
3. 测试各种鼠标交互
4. 观察行为变化

### 测试代码

```javascript
// 在浏览器控制台测试
chart.applyOptions({
  handleScale: {
    mouseWheel: false,  // 禁用滚轮缩放
  },
});

// 恢复默认
chart.applyOptions({
  handleScale: {
    mouseWheel: true,
  },
});
```

## 9. 参考文档

- [HandleScaleOptions API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScaleOptions)
- [HandleScrollOptions API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions)
- [AxisPressedMouseMoveOptions API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/AxisPressedMouseMoveOptions)
- [ChartOptions API](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ChartOptions)

## 总结

✅ **可以通过配置参数控制所有鼠标交互**  
✅ **无需编写自定义代码**  
✅ **支持运行时动态修改**  
✅ **配置简单直观**

只需在创建图表时添加 `handleScroll` 和 `handleScale` 配置即可完全控制鼠标行为。
