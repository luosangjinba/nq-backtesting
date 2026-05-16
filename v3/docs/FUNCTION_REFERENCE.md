# V3 功能速查表

**最后更新**：2026-05-16  
**目的**：按功能分类快速查找可用函数和类

---

## 📊 图表管理

### 初始化和配置
```javascript
import { initChart, state, API_BASE } from './modules/chart.js';

// 初始化图表
initChart();

// 访问图表实例
state.chart
state.candlestickSeries

// API 基础 URL
API_BASE // 'http://127.0.0.1:8765'
```

### 数据更新
```javascript
import { updateChartData, clearAllPrimitives } from './modules/chart.js';

// 更新 K 线数据
updateChartData(klineData);

// 清除所有 PDA Primitives
clearAllPrimitives();
```

### 视图控制
```javascript
import { getVisibleRange, setVisibleRange } from './modules/chart.js';

// 获取可见范围
const range = getVisibleRange(); // { from, to }
// 设置可见范围
setVisibleRange(fromTimestamp, toTimestamp);

// 自动缩放到合适视图
state.chart.timeScale().fitContent();
```

---

## 🎨 PDA 渲染

### 复用现有 Primitive（推荐）
```javascript
import { LiquidityPrimitive, FvgPrimitive } from './modules/pda-renderer.js';

// BSL/SSL 短线（也可用于 Swing Low/High）
const primitive = new LiquidityPrimitive(
  chart,
  series,
  time,        // 时间戳（秒）
  price,       // 价格
  lineColor,   // 线颜色（如 '#ffb74d'）
  textColor,   // 文字颜色（如 '#ef5350'）
  label,       // 标签文字（如 'SL'）
  position     // 'above' 或 'below'
);
state.candlestickSeries.attachPrimitive(primitive);

// FVG 矩形
const fvgPrimitive = new FvgPrimitive(
  chart,
  series,
  startTime,   // 起始时间（秒）
  endTime,     // 结束时间（秒）
  high,        // 上边界价格
  low,         // 下边界价格
  color        // 填充颜色（如 '#26a69a33'）
);
state.candlestickSeries.attachPrimitive(fvgPrimitive);
```

### 批量加载 PDA
```javascript
import { loadPdaData } from './modules/pda-renderer.js';

// 加载并渲染 PDA 数据
loadPdaData(pdaData, timeframe);
```

### 手动触发重绘
```javascript
// 交互式 attachPrimitive 后需要手动触发重绘
state.chart.applyOptions({});
```

---

## ✏️ 图表标注

### 添加标注
```javascript
import { 
  addSwingLow, 
  addSwingHigh, 
  addFvgAnnotation,
  clearAllAnnotations 
} from './modules/annotation.js';

// 添加 Swing Low（橙线 + 红色 "SL"）
const id = addSwingLow(time, price);

// 添加 Swing High（蓝线 + 绿色 "SH"）
const id = addSwingHigh(time, price);

// 添加 FVG 标注
const id = addFvgAnnotation(
  anchorTime,  // 锚点时间（K2）
  high,        // 上边界
  low,         // 下边界
  direction,   // 'bullish' 或 'bearish'
  timeframe    // 周期（分钟）
);

// 清除所有标注
clearAllAnnotations();
```

---

## ▶️ K 线回放

### 初始化和加载
```javascript
import { initReplay, loadReplayData, togglePlay, replayState } from './modules/replay.js';

// 初始化回放模块
initReplay();

// 加载回放数据
loadReplayData(
  bars,        // K 线数据数组
  pdas,        // PDA 数据数组
  startTime,   // 开始时间字符串
  endTime,     // 结束时间字符串
  timeframe    // 周期（分钟）
);

// 播放/暂停切换
togglePlay();

// 访问回放状态
replayState.isPlaying
replayState.speed
replayState.currentIndex
```

---

## 🖱️ 右键菜单

### 创建菜单
```javascript
import { createContextMenu, closeContextMenu } from './modules/context-menu.js';

// 创建右键菜单
createContextMenu(x, y, [
  {
    icon: '📊',
    label: '菜单项 1',
    action: () => { /* 点击回调 */ },
    shortcut: 'F5',  // 可选
    danger: false,   // 可选，红色危险样式
    disabled: false  // 可选，禁用状态
  },
  { type: 'divider' },  // 分隔线
  {
    icon: '🗑️',
    label: '删除',
    action: () => { /* ... */ },
    danger: true
  }
]);

// 关闭菜单
closeContextMenu();
```

### 预定义菜单
```javascript
import { 
  showBlankAreaMenu, 
  showKlineMenu, 
  showPdaMenu 
} from './modules/context-menu.js';

// 空白区域菜单（手动添加 PDA）
showBlankAreaMenu(x, y, chartTime, chartPrice, callback);

// K 线菜单（标注 Swing/FVG）
showKlineMenu(x, y, chartTime, chartPrice, callback);

// PDA 菜单（查看详情/删除）
showPdaMenu(x, y, pdaRecord);
```

---

## ⌨️ 键盘导航

### 初始化
```javascript
import { initKeyboardNavigation } from './modules/keyboard.js';

// 初始化键盘事件监听
initKeyboardNavigation(refreshDataCallback);
```

### 支持的快捷键
- **F5** - 刷新数据
- **ESC** - 关闭菜单和浮窗
- **↑↓** - 菜单导航
- **Enter** - 触发菜单项
- **Space** - 播放/暂停回放（在 replay.js 中绑定）

---

## 🔍 PDA 点击检测

### 查找 PDA
```javascript
import { findPdaAtPosition } from './modules/pda-detector.js';

// 查找点击位置的 PDA
const pda = findPdaAtPosition(clientX, clientY);

if (pda) {
  console.log('找到 PDA:', pda.pdaType, pda.anchorTime, pda.price);
}
```

---

## 🔎 PDA 自动识别

### 识别 FVG
```javascript
import { identifyFvg, formatTimestamp } from './modules/pda-identifier.js';

// 识别 FVG
const result = identifyFvg(candleData, clickTime);

if (result) {
  console.log('识别到 FVG:', {
    anchorTime: result.anchorTime,
    high: result.high,
    low: result.low,
    direction: result.direction  // 'bullish' 或 'bearish'
  });
}

// 格式化时间戳
const timeStr = formatTimestamp(timestamp); // "YYYY-MM-DD HH:MM"
```

---

## 💬 PDA 详情浮窗

### 显示浮窗
```javascript
import { showPdaDetail, closePdaDetail } from './modules/pda-detail.js';

// 显示 PDA 详情浮窗
showPdaDetail(x, y, pdaRecord);

// 关闭浮窗
closePdaDetail();
```

---

## 📝 PDA 录入表单

### 显示表单
```javascript
import { showPdaForm, hidePdaForm, setOnSaveCallback } from './modules/pda-form.js';

// 设置保存回调
setOnSaveCallback(async (formData) => {
  // 处理保存逻辑
  console.log('保存 PDA:', formData);
});

// 显示侧边栏表单
showPdaForm({
  pdaType: 'fvg',      // 'fvg', 'bsl', 'ssl'
  timeframe: 60,       // 周期（分钟）
  autoFill: {          // 自动填充的数据（可选）
    startTime: '2012-01-09 10:00',
    endTime: '2012-01-09 12:00',
    high: 1234.56,
    low: 1230.00,
    direction: 'bullish'
  }
});

// 隐藏表单
hidePdaForm();
```

---

## 🛠️ 工具函数

### 时间格式化
```javascript
import { 
  formatTimeInput, 
  formatTimeDisplay 
} from './modules/utils.js';

// 时间输入格式化（8 位或 12 位）
const formatted = formatTimeInput('20120109');     // "2012-01-09 00:00"
const formatted = formatTimeInput('201201091030'); // "2012-01-09 10:30"

// 时间显示格式化
const display = formatTimeDisplay('2012-01-09T10:30:00Z'); // "2012-01-09 10:30"
```

### 数据查找
```javascript
import { 
  findNearestBarTime, 
  calculateTolerance 
} from './modules/utils.js';

// 查找最近的 K 线时间
const nearestTime = findNearestBarTime(targetTime, state.barTimestamps);

// 计算时间容差
const tolerance = calculateTolerance(timeframe); // 秒
```

### 格式化显示
```javascript
import { 
  formatPdaType, 
  formatPrice 
} from './modules/utils.js';

// 格式化 PDA 类型
const typeName = formatPdaType('bsl'); // "BSL"

// 格式化价格
const priceStr = formatPrice(1234.567); // "1234.57"
```

### 加载状态
```javascript
import { showLoading } from './modules/utils.js';

// 显示加载状态
showLoading(true);

// 隐藏加载状态
showLoading(false);
```

---

## 🎯 常见场景示例

### 场景 1：添加自定义标注
```javascript
// 1. 导入标注模块
import { addSwingLow, addSwingHigh } from './modules/annotation.js';

// 2. 右键点击 K 线时，获取时间和价格
const time = /* 从图表坐标转换 */;
const price = /* 从图表坐标转换 */;

// 3. 添加标注
addSwingLow(time, price);
```

### 场景 2：复用 PDA Primitive 渲染自定义图形
```javascript
// 1. 导入 Primitive
import { LiquidityPrimitive } from './modules/pda-renderer.js';
import { state } from './modules/chart.js';

// 2. 创建 Primitive
const primitive = new LiquidityPrimitive(
  state.chart,
  state.candlestickSeries,
  time,
  price,
  '#ffb74d',  // 线颜色
  '#ef5350',  // 文字颜色
  'MY',       // 标签
  'below'   // 位置
);

// 3. 附加到图表
state.candlestickSeries.attachPrimitive(primitive);

// 4. 手动触发重绘
state.chart.applyOptions({});
```

### 场景 3：实现右键菜单交互
```javascript
// 1. 导入菜单模块
import { createContextMenu } from './modules/context-menu.js';

// 2. 监听右键事件
chartContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  
  // 3. 创建菜单
  createContextMenu(e.clientX, e.clientY, [
    {
      icon: '✏️',
    label: '添加标注',
      action: () => {
        // 处理添加标注逻辑
      }
    }
  ]);
});
```

### 场景 4：自动识别并填充 FVG
```javascript
// 1. 导入识别模块
import { identifyFvg } from './modules/pda-identifier.js';
import { showPdaForm } from './modules/pda-form.js';
import { state } from './modules/chart.js';

// 2. 识别 FVG
const result = identifyFvg(state.candleData, clickTime);

// 3. 显示表单并自动填充
if (result) {
  showPdaForm({
    pdaType: 'fvg',
    timeframe: 60,
    autoFill: {
      startTime: formatTimestamp(result.anchorTime - 3600),
      endTime: formatTimestamp(result.anchorTime + 3600),
      high: result.high,
      low: result.low,
      direction: result.direction
    }
  });
}
```

---

## ⚠️ 重要提示

### Primitive 渲染注意事项
1. **使用 view 引用模式**：Renderer 应持有 view 引用，而非坐标对象快照
2. **交互式 attach 后手动 redraw**：`state.chart.applyOptions({})`
3. **FVG 时间必须 bar-aligned**：使用 `anchor ± tfSec` 而非 `anchor ± halfBar`

### 避免重复造轮子
1. **渲染 PDA 前**：先查看 `pda-renderer.js` 是否有可复用的 Primitive
2. **添加工具函数前**：先查看 `utils.js` 是否已有类似功能
3. **创建 UI 组件前**：先查看 `context-menu.js`, `pda-form.js`, `pda-detail.js`

### 状态管理
- **图表状态**：使用 `chart.js` 的 `state` 对象
- **回放状态**：使用 `replay.js` 的 `replayState` 对象
- **避免全局变量**：优先使用模块导出的状态对象

---

**下一步**：查看 `MODULE_INDEX.md` 了解模块职责和依赖关系
