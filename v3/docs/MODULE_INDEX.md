# V3 模块索引

**最后更新**：2026-05-16  
**目的**：快速查找模块职责和主要导出，避免重复造轮子

---

## 核心模块（按依赖层级排序）

### 1. chart.js - 图表管理模块
**职责**：Lightweight Charts 初始化、配置、状态管理

**主要导出**：
- `state` - 全局状态对象
  - `chart` - Lightweight Charts 实例
  - `candlestickSeries` - K 线序列
  - `liquidityPrimitives` - BSL/SSL Primitives 数组
  - `fvgPrimitives` - FVG Primitives 数组
  - `pdaRecords` - PDA 原始数据（用于点击检测）
  - `barTimestamps` - K 线时间戳数组（用于日级 PDA 时间映射）
  - `candleData` - K 线完整数据（用于 PDA 识别）
  - `currentMenu` - 当前打开的右键菜单
  - `currentPopover` - 当前打开的 PDA 详情浮窗
- `API_BASE` - API 基础 URL (`http://127.0.0.1:8765`)
- `initChart()` - 初始化图表
- `clearAllPrimitives()` - 清除所有 PDA Primitives
- `updateChartData(klineData)` - 更新图表数据
- `getVisibleRange()` - 获取图表可见范围
- `setVisibleRange(from, to)` - 设置图表可见范围

**依赖**：无（基础模块）

**代码行数**：156 行

---

### 2. utils.js - 工具函数模块
**职责**：时间格式化、数据查找等通用工具函数

**主要导出**：
- `showLoading(show)` - 显示/隐藏加载状态
- `formatTimeInput(value)` - 时间格式化（支持 8/12 位输入）
- `findNearestBarTime(targetTime, barTimestamps)` - 查找最近的 K 线时间
- `calculateTolerance(tf)` - 计算时间容差（根据周期动态计算）
- `formatPdaType(pdaType)` - 格式化 PDA 类型显示名称
- `formatTimeDisplay(timeStr)` - 格式化时间显示
- `formatPrice(price)` - 格式化价格显示
**依赖**：无（基础模块）

**代码行数**：151 行

---

### 3. pda-renderer.js - PDA 渲染模块
**职责**：PDA 的 Lightweight Charts Primitive 实现（BSL/SSL/FVG/NWOG/NDOG/Daily High/Low/ICT Midnight）

**主要导出**：
- `LiquidityPrimitive` - BSL/SSL 短线 Primitive（可复用于 Swing Low/High）
- `FvgPrimitive` - FVG 矩形 Primitive（可复用于 FVG 标注）
- `NwogNdogPrimitive` - NWOG/NDOG 矩形 Primitive
- `DailyExtremePrimitive` - Daily High/Low 实线 Primitive
- `IctMidnightExtremePrimitive` - ICT Midnight High/Low 虚线 Primitive
- `loadPdaData(pdaData, timeframe)` - 加载 PDA 数据并渲染

**依赖**：`chart.js`, `utils.js`

**代码行数**：625 行（最大的模块）

**重要提示**：
- `LiquidityPrimitive` 和 `FvgPrimitive` 已被 `annotation.js` 复用
- 所有 Renderer 使用 view 引用模式（避免坐标对象快照问题）

---

### 4. annotation.js - 图表标注模块
**职责**：手动标注 Swing Low/High 和 FVG（复用 PDA Primitive）

**主要导出**：
- `annotations` - 标注存储对象
  - `swingLows` - Swing Low 数组
  - `swingHighs` - Swing High 数组
  - `fvgs` - FVG 数组
- `addSwingLow(time, price)` - 添加 Swing Low 标注（橙线 + 红色 "SL"）
- `addSwingHigh(time, price)` - 添加 Swing High 标注（蓝线 + 绿色 "SH"）
- `addFvgAnnotation(anchorTime, high, low, direction, timeframe)` - 添加 FVG 标注
- `clearAllAnnotations()` - 清除所有标注

**依赖**：`chart.js`, `pda-renderer.js`

**代码行数**：111 行

**设计原则**：薄包装，复用 `LiquidityPrimitive` 和 `FvgPrimitive`，保持与自动扫描 PDA 一致的样式

---

### 5. replay.js - K 线回放模块
**职责**：回放状态管理、播放控制、进度保存/恢复

**主要导出**：
- `replayState` - 回放状态对象
  - `isPlaying` - 是否正在播放
  - `speed` - 播放速度（1x/2x/5x）
  - `currentIndex` - 当前进度索引
  - `totalBars` - 总 K 线数
  - `allBars` - 所有 K 线数据
  - `allPdas` - 所有 PDA 数据
- `initReplay()` - 初始化回放模块
- `loadReplayData(bars, pdas, start, end, tf)` - 加载回放数据
- `togglePlay()` - 播放/暂停切换

**依赖**：`chart.js`

**代码行数**：326 行

**功能**：
- 播放/暂停/停止/单步前进后退
- 速度控制（1x/2x/5x）
- 进度条和时间标记
- 自动保存/恢复进度（localStorage）
- 空格键快捷键

---

### 6. context-menu.js - 右键菜单模块
**职责**：创建、显示、关闭右键菜单，菜单键盘导航

**主要导出**：
- `createContextMenu(x, y, items)` - 创建右键菜单
- `closeContextMenu()` - 关闭右键菜单
- `showBlankAreaMenu(x, y, chartTime, chartPrice, callback)` - 显示空白区域菜单
- `showKlineMenu(x, y, chartTime, chartPrice, callback)` - 显示 K 线菜单（用于标注）
- `showPdaMenu(x, y, pda)` - 显示 PDA 菜单
- `moveMenuSelectionUp()` - 向上移动菜单选择
- `moveMenuSelectionDown()` - 向下移动菜单选择
- `triggerMenuSelection()` - 触发当前选中的菜单项

**依赖**：`chart.js`, `pda-detail.js`

**代码行数**：372 行

**功能**：
- 边界检测（防止菜单超出屏幕）
- 键盘导航（↑↓ Enter）
- 鼠标 hover 同步选择

---

### 7. keyboard.js - 键盘导航模块
**职责**：全局快捷键和菜单键盘导航

**主要导出**：
- `initKeyboardNavigation(refreshData)` - 初始化键盘事件监听

**依赖**：`chart.js`, `context-menu.js`, `pda-detail.js`

**代码行数**：68 行

**功能**：
- F5 刷新数据
- ESC 关闭菜单和浮窗
- ↑↓ Enter 菜单导航
- 窗口 resize 时关闭菜单

---

### 8. pda-detector.js - PDA 点击检测模块
**职责**：检测用户点击位置是否命中 PDA

**主要导出**：
- `findPdaAtPosition(clientX, clientY)` - 查找点击位置的 PDA

**依赖**：`chart.js`

**代码行数**：171 行

**算法**：
- 坐标转换（视口 → 图表 → 时间/价格）
- 容差计算（时间容差 = 1 根 K 线，价格容差 = 10px）
- 距离计算（时间距离 + 价格距离）
- 返回最近的 PDA

---

### 9. pda-detail.js - PDA 详情浮窗模块
**职责**：显示 PDA 详情浮窗

**主要导出**：
- `showPdaDetail(x, y, pda)` - 显示 PDA 详情浮窗
- `closePdaDetail()` - 关闭 PDA 详情浮窗

**依赖**：`chart.js`, `utils.js`

**代码行数**：145 行

**功能**：
- 边界检测（防止浮窗超出屏幕）
- 格式化显示 PDA 信息
- 点击外部关闭

---

### 10. pda-form.js - PDA 录入表单模块
**职责**：PDA 手动录入侧边栏表单

**主要导出**：
- `showPdaForm(options)` - 显示侧边栏表单
- `hidePdaForm()` - 隐藏侧边栏表单
- `setOnSaveCallback(callback)` - 设置保存回调函数

**依赖**：`utils.js`

**代码行数**：285 行

**功能**：
- 根据 PDA 类型切换表单字段（FVG/BSL/SSL）
- 表单验证
- 自动填充识别的数据
- 时间输入框自动格式化（blur 事件）
- ESC 键关闭侧边栏

---

### 11. pda-identifier.js - PDA 自动识别模块
**职责**：根据点击位置自动识别 FVG

**主要导出**：
- `identifyFvg(candleData, clickTime)` - 识别 FVG
- `formatTimestamp(timestamp)` - 格式化时间戳

**依赖**：无

**代码行数**：133 行

**算法**：
- 检查点击位置是否是 FVG 的 K2（中间 K 线）
- 检查点击位置是否是 FVG 的 K1 或 K3
- 返回 FVG 信息（anchorTime, high, low, direction）

**FVG 定义**：
- 向上 FVG: K1.low > K3.high，缺口在 [K3.high, K1.low]
- 向下 FVG: K1.high < K3.low，缺口在 [K1.high, K3.low]
- FVG 的锚点时间是中间 K 线（K2）的时间

---

### 12. time_format_module.js - 时间格式化模块
**职责**：时间格式化工具（独立模块，可能与 utils.js 重复）

**代码行数**：197 行

**状态**：可能需要合并到 utils.js 或删除重复功能

---

## 模块依赖关系图

```
chart.js (基础)
  ├─ pda-renderer.js
  │   └─ annotation.js
  ├─ replay.js
  ├─ pda-detector.js
  ├─ pda-detail.js
  │   └─ keyboard.js
  └─ context-menu.js
      └─ keyboard.js

utils.js (基础)
  ├─ pda-renderer.js
  ├─ pda-form.js
  └─ pda-detail.js

pda-identifier.js (独立)
time_format_module.js (独立，可能重复)
```

---

## 代码规模统计

| 模块 | 行数 | 占比 |
|------|------|------|
| pda-renderer.js | 625 | 22.8% |
| context-menu.js | 372 | 13.6% |
| replay.js | 326 | 11.9% |
| pda-form.js | 285 | 10.4% |
| time_format_module.js | 197 | 7.2% |
| pda-detector.js | 171 | 6.2% |
| chart.js | 156 | 5.7% |
| utils.js | 151 | 5.5% |
| pda-detail.js | 145 | 5.3% |
| pda-identifier.js | 133 | 4.9% |
| annotation.js | 111 | 4.1% |
| keyboard.js | 68 | 2.5% |
| **总计** | **2740** | **100%** |

---

## 使用建议

### 开发新功能前，先查阅此索引：

1. **需要渲染 PDA？** → 查看 `pda-renderer.js`，复用 `LiquidityPrimitive` 或 `FvgPrimitive`
2. **需要标注功能？** → 查看 `annotation.js`，参考其薄包装设计
3. **需要时间格式化？** → 查看 `utils.js`，使用 `formatTimeInput` 或 `formatTimeDisplay`
4. **需要点击检测？** → 查看 `pda-detector.js`，使用 `findPdaAtPosition`
5. **需要右键菜单？** → 查看 `context-menu.js`，使用 `createContextMenu`
6. **需要回放控制？** → 查看 `replay.js`，使用 `loadReplayData` 和 `togglePlay`

### 避免重复造轮子的检查清单：

- [ ] 是否已有类似的 Primitive 可以复用？（`pda-renderer.js`）
- [ ] 是否已有类似的工具函数？（`utils.js`）
- [ ] 是否已有类似的 UI 组件？（`context-menu.js`, `pda-form.js`, `pda-detail.js`）
- [ ] 是否已有类似的状态管理？（`chart.js` 的 `state` 对象）

---

## 待优化项

1. **time_format_module.js** - 可能与 `utils.js` 重复，需要合并或删除
2. **pda-renderer.js** - 625 行，可以考虑拆分为多个子模块
3. **context-menu.js** - 372 行，可以考虑拆分菜单创建和键盘导航
4. **全局状态管理** - 目前分散在 `chart.js` 的 `state` 和 `replay.js` 的 `replayState`，可以考虑统一

---

**下一步**：查看 `FUNCTION_REFERENCE.md` 了解按功能分类的函数速查表
