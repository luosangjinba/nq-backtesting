# PDA 标记更新说明

## 修改内容

### 1. 移除水平线 ✅
- 删除 `state.priceLines`
- 删除 `createPriceLine()` 调用
- 只保留 Marker 标记

### 2. 更换标记形状 ✅
- SSL: `circle` → `arrowUp` (向上箭头)
- BSL: `circle` → `arrowDown` (向下箭头)

### 3. 时间戳说明 ✅
- 时间戳 `1326124800` 是正确的
- UTC 时间: 2012-01-09 16:00
- 美东时间 (EST): 2012-01-09 11:00
- Lightweight Charts 会正确显示为 11:00

## 当前实现

```javascript
// 状态
const state = {
  markers: [], // 只存储 Markers
};

// SSL 标记 - 红色向上箭头，K线下方
function addSslMarker(timestamp, price, label = 'SSL') {
  const marker = {
    time: timestamp,
    position: 'belowBar',
    color: '#ef5350',
    shape: 'arrowUp',
    text: label
  };
  state.markers.push(marker);
  state.candlestickSeries.setMarkers(state.markers);
}

// BSL 标记 - 绿色向下箭头，K线上方
function addBslMarker(timestamp, price, label = 'BSL') {
  const marker = {
    time: timestamp,
    position: 'aboveBar',
    color: '#26a69a',
    shape: 'arrowDown',
    text: label
  };
  state.markers.push(marker);
  state.candlestickSeries.setMarkers(state.markers);
}

// 测试：在 11:00 添加 SSL 标记
function addTestPdaMarkers() {
  addSslMarker(1326124800, 2344.25, 'SSL');
}
```

## 测试方法

```bash
cd /home/leo/myworkspace/trading/backtesting
bash v3/test.sh

# 浏览器访问 http://127.0.0.1:8000/v3/docs/kline_viewer.html
# 输入时间: 2012-01-09 09:30 至 16:00, 周期 1H
# 点击"加载"按钮
```

## 预期效果

- ✅ 11:00 K线下方显示**红色向上箭头**
- ✅ 箭头上方显示文本 "SSL"
- ✅ **没有水平线**

## 可用的标记形状

根据官方文档，Lightweight Charts 只提供 4 种形状：
1. `circle` - 圆形
2. `square` - 方形
3. `arrowUp` - 向上箭头 ✅ (当前使用)
4. `arrowDown` - 向下箭头 ✅ (当前使用)

如果需要其他形状，需要使用 Custom Primitives 自定义绘制。

## 标记位置

- `belowBar` - K线下方 (SSL 使用)
- `aboveBar` - K线上方 (BSL 使用)
- `inBar` - K线内部

## 下一步

如果对当前的箭头形状不满意，可以：
1. 换成 `square` 方形
2. 使用 Custom Primitives 自定义形状（如三角形、菱形等）
