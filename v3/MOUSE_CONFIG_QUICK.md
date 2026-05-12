# 鼠标交互配置 - 快速参考

## 一行配置解决问题

### 禁用价格轴滚轮缩放

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: { mouseWheel: false }
});
```

### 禁用价格轴拖动缩放
```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: {
    axisPressedMouseMove: { price: false }
  }
});
```

### 禁用所有价格轴交互

```javascript
const chart = LightweightCharts.createChart(container, {
  handleScale: {
    mouseWheel: false,
    axisPressedMouseMove: { price: false }
  }
});
```

## 完整配置模板

```javascript
const chart = LightweightCharts.createChart(container, {
  // ... 其他配置
  
  // 滚动配置
  handleScroll: {
    mouseWheel: true,        // 滚轮滚动
    pressedMouseMove: true,  // 拖动滚动
  },
  
  // 缩放配置
  handleScale: {
    mouseWheel: true,        // 滚轮缩放
    axisPressedMouseMove: {
      time: true,            // 时间轴拖动缩放
      price: true,       // 价格轴拖动缩放
    },
    axisDoubleClickReset: true, // 双击重置
  },
});
```

## 在 V3 中应用

修改 `v3/docs/kline_viewer.html` 的 `initChart()` 函数：

```javascript
function initChart() {
  const container = document.getElementById('chart');

  state.chart = LightweightCharts.createChart(container, {
    width: container.clientWidth,
    height: container.clientHeight,
    layout: {
      background: { color: '#131722' },
      textColor: '#d1d4dc',
    },
    grid: {
      vertLines: { color: '#1e222d' },
      horzLines: { color: '#1e222d' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#2a2e39',
    },
    timeScale: {
      borderColor: '#2a2e39',
   timeVisible: true,
      secondsVisible: false,
    },
    
  // ========== 添加这里 ==========
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
    },
    handleScale: {
      mouseWheel: true,
      axisPressedMouseMove: {
        time: true,
        price: true,
      },
      axisDoubleClickReset: true,
    },
    // ===========================
  });

  // ... 其余代码
}
```

## 测试

1. 修改配置
2. 刷新页面
3. 测试鼠标交互
4. 观察行为变化

## 参考

详细文档：`v3/MOUSE_INTERACTION_CONFIG.md`
