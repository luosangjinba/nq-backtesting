# PDA 标记测试

## 测试目标

在 2012-01-09 11:00 的 K线底部添加 SSL 标记

## 测试数据

- **时间**: 2012-01-09 11:00
- **Unix 时间戳**: 1326124800
- **K线数据**:
  - Low: 2344.25
  - High: 2346.25
  - Close: 2345.25
- **SSL 价格**: 2344.25 (使用 K线的 low)

## 测试步骤

1. **启动服务**
   ```bash
   cd /home/leo/myworkspace/trading/backtesting
   bash v3/test.sh
   ```

2. **打开浏览器**
   访问 http://127.0.0.1:8000/v3/docs/kline_viewer.html

3. **加载数据**
   - 开始时间: `2012-01-09 09:30`
   - 结束时间: `2012-01-09 16:00`
   - 周期: `1H`
   - 点击"加载"按钮

4. **验证 SSL 标记**
   - ✓ 在 11:00 的 K线下方看到红色向上箭头
   - ✓ 在价格 2344.25 处看到红色水平线
   - ✓ 水平线右侧标签显示 "SSL"
   - ✓ 控制台输出: "✓ 添加 SSL 标记: time=1326124800, price=2344.25, label=SSL"

## 预期效果

### 图表上的标记

1. **Marker（标记点）**
   - 位置: 11:00 K线下方
   - 颜色: 红色 (#ef5350)
   - 形状: 向上箭头 (arrowUp)
   - 文本: "SSL"

2. **Price Line（水平线）**
   - 价格: 2344.25
   - 颜色: 红色 (#ef5350)
   - 线宽: 2px
   - 样式: 实线
   - 右侧标签: "SSL"

### 控制台输出

```
✓ 图表初始化完成
✓ 事件监听初始化完成
✓ 应用初始化完成
请求 URL: http://127.0.0.1:8765/v2/bars?start=2012-01-09%2009:30&end=2012-01-09%2016:00&tf=60
API 响应: {ok: true, result: Array(7)}
转换后的数据: [{time: 1326120600, open: 2352.25, high: 2353.25, ...}, ...]
✓ 成功加载 7 根 K线
✓ 添加 SSL 标记: time=1326124800, price=2344.25, label=SSL
✓ 测试 PDA 标记已添加
```

## 功能说明

### 已实现的函数

1. **clearPdaMarkers()** - 清除所有 PDA 标记
2. **addSslMarker(timestamp, price, label)** - 添加 SSL 标记
3. **addBslMarker(timestamp, price, label)** - 添加 BSL 标记
4. **addTestPdaMarkers()** - 测试函数，自动添加示例标记

### 使用方法

```javascript
// 在浏览器控制台手动添加标记

// 添加 SSL 标记
addSslMarker(1326124800, 2344.25, 'SSL');

// 添加 BSL 标记
addBslMarker(1326127200, 2360.50, 'BSL');

// 清除所有标记
clearPdaMarkers();
```

## 下一步

1. **验证标记显示** - 确认 SSL 标记正确显示
2. **测试 BSL 标记** - 添加买方流动性标记
3. **添加 FVG 标记** - 实现范围类型的 PDA（使用矩形）
4. **从 API 加载 PDA** - 替换硬编码的测试数据

## 已知问题

### 时区问题
- Lightweight Charts 使用 UTC 时间
- 输入的时间是 EST（美东时间）
- 需要确认时间戳转换是否正确

### 解决方案
- v2 API 返回的 timestamp 已经是正确的 Unix 时间戳
- 直接使用即可，无需转换

## 调试技巧

### 查看当前标记
```javascript
// 查看 Price Lines
console.log(state.priceLines);

// 查看 Markers
console.log(state.markers);
```

### 手动清除标记
```javascript
clearPdaMarkers();
```

### 重新加载数据
点击"加载"按钮会自动清除旧数据并重新添加测试标记
