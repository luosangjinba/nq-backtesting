# 图表显示控制功能计划

**分支**：`feature/chart-display-control`  
**创建时间**：2026-05-15  
**预计时长**：3-4 天

---

## 功能概述
三个核心功能方向：

1. **K 线回放（Replay）** - 按时间顺序逐步显示 K 线，模拟实时行情
2. **PDA 显示控制** - 按类型/周期分组控制 PDA 显示，支持多周期叠加
3. **标签显示控制** - 控制 PDA 标签的显示/隐藏/样式

---

## 功能 1：K 线回放（Replay）

### 目标
模拟实时行情，按时间顺序逐步显示 K 线和 PDA，用于复盘和策略验证。

### 核心功能

#### 1.1 基础回放控制
- [ ] **播放/暂停按钮** - 控制回放状态
- [ ] **停止按钮** - 重置到起始位置
- [ ] **速度控制** - 1x, 2x, 5x, 10x 速度选择
- [ ] **进度条** - 显示当前回放进度，支持拖动跳转

#### 1.2 回放逻辑
- [ ] **逐根 K 线显示** - 按时间顺序显示 K 线
- [ ] **PDA 同步显示** - K 线显示到某个时间点时，显示该时间点之前的所有 PDA
- [ ] **时间标记** - 显示当前回放到的时间点
- [ ] **自动滚动** - 图表自动滚动到最新 K 线

#### 1.3 高级功能
- [ ] **单步前进/后退** - 逐根 K 线前进或后退
- [ ] **跳转到指定时间** - 输入时间直接跳转
- [ ] **关键点标记** - 标记重要时间点（如 PDA 形成时刻）
- [ ] **回放记录** - 保存回放进度，下次继续

### UI 设计

```
┌─────────────────────────────────────────┐
│ 工具栏                                            │
│ [开始时间] [结束时间] [周期] [加载]                   │
└────────────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ 回放控制栏                                         │
│ [◀◀] [▶/⏸] [⏹] [▶▶]  速度: [1x▼]  进度: ━━━━━○━━━━━  │
│ 当前时间: 2012-01-09 14:30                           │
└────────────────────────────────────────────┘
┌─────────────────────────────────┐
│                                              │
│                    K 线图表区域                   │
│                                             │
└──────────────────────────────┘
```

### 技术方案

**数据结构**：
```javascript
const replayState = {
  isPlaying: false,        // 是否正在播放
  speed: 1,                // 播放速度（1x, 2x, 5x, 10x）
  currentIndex: 0,         // 当前显示到第几根 K 线
  totalBars: 0,        // 总 K 线数量
  allBars: [],           // 所有 K 线数据
  allPdas: [],       // 所有 PDA 数据
  intervalId: null         // 定时器 ID
};
```

**核心函数**：
```javascript
// 开始回放
function startReplay() {
  replayState.isPlaying = true;
  replayState.intervalId = setInterval(() => {
    if (replayState.currentIndex < replayState.totalBars) {
      showNextBar();
    } else {
      stopReplay();
    }
  }, 1000 / replayState.speed);
}

// 显示下一根 K 线
function showNextBar() {
  replayState.currentIndex++;
  const visibleBars = replayState.allBars.slice(0, replayState.currentIndex);
  updateChartData(visibleBars);
  
  // 显示该时间点之前的 PDA
  const currentTime = visibleBars[visibleBars.length - 1].time;
  const visiblePdas = replayState.allPdas.filter(pda => pda.anchor_time <= currentTime);
  loadPdaData(visiblePdas);
  
  updateProgress();
}

// 暂停回放
function pauseReplay() {
  replayState.isPlaying = false;
  clearInterval(replayState.intervalId);
}

// 停止回放
function stopReplay() {
  pauseReplay();
  replayState.currentIndex = 0;
  updateChartData([]);
  loadPdaData([]);
}
```

### 预计时长
**1.5 天**

---

## 功能 2：PDA 显示控制

### 目标
灵活控制 PDA 的显示，支持按类型/周期分组，多周期叠加显示。

### 核心功能

#### 2.1 PDA 类型过滤
- [ ] **按类型显示/隐藏** - 独立控制每种 PDA 类型的显示
  - BSL / SSL
  - FVG / OB
  - NWOG / NDOG
  - Daily High / Low
  - ICT Midnight High / Low
  - EQH / EQL
- [ ] **全选/全不选** - 快速切换所有类型
- [ ] **预设方案** - 保存常用的显示组合

#### 2.2 PDA 周期过滤
- [ ] **按周期显示/隐藏** - 独立控制每个周期的 PDA 显示
  - 1M / 5M / 15M / 1H / 4H / D / W
- [ ] **多周期叠加** - 同时显示多个周期的 PDA
  - 例如：在 1H 图上叠加显示 4H 和 D 的 PDA
- [ ] **周期切换时 PDA 保持** - 切换周期时保持 PDA 显示状态
  - 当前实现：切换周期后只显示新周期的 PDA
  - 改进：切换周期后保持之前选中的周期的 PDA

#### 2.3 PDA 时段过滤
- [ ] **按时间范围过滤** - 只显示指定时间范围内的 PDA
- [ ] **按日期过滤** - 只显示指定日期的 PDA
- [ ] **按会话过滤** - 只显示特定交易时段的 PDA（亚洲/伦敦/纽约）

### UI 设计

```
┌──────────────────────────────────────┐
│ 工具栏                                 │
│ [开始时间] [结束时间] [周期] [加载] [PDA 控制▼]         │
└────────────────────────────────────────┘
                                   ↓ 点击展开
┌─────────────────────────┐
│ PDA 显示控制                      │
│ ─────────────────────────── │
│ 按类型：                     │
│ ☑ BSL/SSL    ☑ FVG/OB           │
│ ☑ NWOG/NDOG  ☑ Daily H/L        │
│ ☑ ICT Mid H/L ☐ EQH/EQL         │
│ [全选] [全不选] [预设▼]          │
│ ───────────────────────── │
│ 按周期：                  │
│ ☐ 1M  ☐ 5M  ☐ 15M  ☑ 1H        │
│ ☑ 4H  ☑ D   ☐ W             │
│ ☑ 多周期叠加                     │
│ ────────────────────────── │
│ 按时段：                  │
│ 开始: [2012-01-09 00:00]        │
│ 结束: [2012-01-15 00:00]        │
│ [应用]                 │
└────────────────────────────────┘
```

### 技术方案

**数据结构**：
```javascript
const pdaDisplayState = {
  // 类型过滤
  typeFilters: {
    bsl: true,
    ssl: true,
    fvg: true,
    ob: true,
    nwog: true,
    ndog: true,
    daily_high: true,
    daily_low: true,
    ict_midnight_day_high: true,
    ict_midnight_day_low: true,
    eqh: false,
    eql: false
  },
  
  // 周期过滤
  timeframeFilters: {
    '1': false,    // 1M
    '5': false,    // 5M
    '15': false,   // 15M
    '60': true,    // 1H
    '240': true,   // 4H
    '1440': true,  // D
    '10080': false // W
  },
  
  // 多周期叠加
  multiTimeframe: true,
  
  // 时段过滤
  timeRange: {
    start: null,
    end: null
  }
};
```

**核心函数**：
```javascript
// 过滤 PDA
function filterPdas(allPdas) {
  return allPdas.filter(pda => {
    // 类型过滤
    if (!pdaDisplayState.typeFilters[pda.pda_type]) {
      return false;
    }
    
    // 周期过滤
    if (!pdaDisplayState.timeframeFilters[pda.timeframe]) {
      return false;
    }
    
    // 时段过滤
    if (pdaDisplayState.timeRange.start && pda.anchor_time < pdaDisplayState.timeRange.start) {
      return false;
    }
    if (pdaDisplayState.timeRange.end && pda.anchor_time > pdaDisplayState.timeRange.end) {
      return false;
    }
    
    return true;
  });
}

// 切换 PDA 类型显示
function togglePdaType(pdaType) {
  pdaDisplayState.typeFilters[pdaType] = !pdaDisplayState.typeFilters[pdaType];
  refreshPdaDisplay();
}

// 切换周期显示
function toggleTimeframe(timeframe) {
  pdaDisplayState.timeframeFilters[timeframe] = !pdaDisplayState.timeframeFilters[timeframe];
  refreshPdaDisplay();
}

// 刷新 PDA 显示
function refreshPdaDisplay() {
  const filteredPdas = filterPdas(state.allPdas);
  loadPdaData(filteredPdas);
}

// 周期切换时保持 PDA
function onTimeframeChange(newTimeframe) {
  // 保存当前显示的周期
  const currentTimeframes = Object.keys(pdaDisplayState.timeframeFilters)
    .filter(tf => pdaDisplayState.timeframeFilters[tf]);
  
  // 如果多周期叠加开启，添加新周期到显示列表
  if (pdaDisplayState.multiTimeframe) {
    pdaDisplayState.timeframeFilters[newTimeframe] = true;
  } else {
    // 否则只显示新周期
    Object.keys(pdaDisplayState.timeframeFilters).forEach(tf => {
      pdaDisplayState.timeframeFilters[tf] = (tf === newTimeframe);
    });
  }
  
  // 重新加载 PDA
  loadAllPdas();
}
```

### 预计时长
**1.5 天**

---

## 功能 3：标签显示控制

### 目标
灵活控制 PDA 标签的显示方式，提升图表可读性。

### 核心功能

#### 3.1 标签显示/隐藏
- [ ] **全局开关** - 一键显示/隐藏所有标签
- [ ] **按类型控制** - 独立控制每种 PDA 类型的标签显示
- [ ] **按周期控制** - 独立控制每个周期的标签显示
- [ ] **鼠标悬停显示** - 默认隐藏，鼠标悬停时显示

#### 3.2 标签位置调整
- [ ] **位置选择** - 上方/下方/左侧/右侧
- [ ] **偏移调整** - 调整标签与 PDA 的距离
- [ ] **防重叠** - 自动调整重叠标签的位置
#### 3.3 标签样式切换
- [ ] **字体大小** - 小/中/大
- [ ] **显示内容** - 完整信息/简化信息/仅类型
  - 完整：`BSL 1H 2305.50`
  - 简化：`BSL 2305.50`
  - 仅类型：`BSL`
- [ ] **颜色方案** - 跟随 PDA 颜色/固定颜色/自定义
- [ ] **背景样式** - 无背景/半透明背景/实心背景

### UI 设计

```
┌──────────────────────────────┐
│ 工具栏                             │
│ [开始时间] [结束时间] [周期] [加载] [标签控制▼]         │
└────────────────────────────────────────┘
                       ↓ 点击展开
┌──────────────────┐
│ 标签显示控制                    │
│ ───────────────────── │
│ 显示模式：              │
│ ◉ 始终显示  ○ 悬停显示  ○ 隐藏  │
│ ──────────────── │
│ 按类型：                        │
│ ☑ BSL/SSL    ☑ FVG/OB           │
│ ☑ NWOG/NDOG  ☑ Daily H/L        │
│ [全选] [全不选]                  │
│ ───────────────────────── │
│ 样式设置：                    │
│ 字体大小: ○ 小 ◉ 中 ○ 大        │
│ 显示内容: [完整信息▼]         │
│ 位置: [上方▼]                    │
│ 背景: [半透明▼]              │
│ ───────────────────── │
│ [应用] [重置]                    │
└──────────────────────────┘
```

### 技术方案

**数据结构**：
```javascript
const labelDisplayState = {
  // 显示模式
  mode: 'always', // 'always' | 'hover' | 'hidden'
  
  // 按类型控制
  typeFilters: {
    bsl: true,
    ssl: true,
    fvg: true,
    // ... 其他类型
  },
  
  // 样式设置
  style: {
    fontSize: 'medium',      // 'small' | 'medium' | 'large'
    content: 'full',         // 'full' | 'simplified' | 'type-only'
    position: 'top',         // 'top' | 'bottom' | 'left' | 'right'
    background: 'semi',      // 'none' | 'semi' | 'solid'
    colorScheme: 'follow'    // 'follow' | 'fixed' | 'custom'
  }
};
```

**核心函数**：
```javascript
// 生成标签文本
function generateLabelText(pda) {
  const { content } = labelDisplayState.style;
  
  switch (content) {
    case 'full':
      return `${pda.pda_type.toUpperCase()} ${pda.timeframe}M ${pda.price.toFixed(2)}`;
    case 'simplified':
      return `${pda.pda_type.toUpperCase()} ${pda.price.toFixed(2)}`;
    case 'type-only':
      return pda.pda_type.toUpperCase();
    default:
      return '';
  }
}

// 获取标签样式
function getLabelStyle(pda) {
  const { fontSize, background, colorScheme } = labelDisplayState.style;
  
  const fontSizeMap = {
    small: '10px',
    medium: '12px',
    large: '14px'
  };
  
  const backgroundMap = {
    none: 'transparent',
    semi: 'rgba(0, 0, 0, 0.5)',
    solid: 'rgba(0, 0, 0, 0.8)'
  };
  
  return {
    fontSize: fontSizeMap[fontSize],
    background: backgroundMap[background],
    color: colorScheme === 'follow' ? pda.color : '#ffffff'
  };
}

// 切换标签显示模式
function setLabelMode(mode) {
  labelDisplayState.mode = mode;
  refreshLabelDisplay();
}

// 刷新标签显示
function refreshLabelDisplay() {
  // 重新渲染所有 PDA 标签
  state.allPdas.forEach(pda => {
    if (shouldShowLabel(pda)) {
      updatePdaLabel(pda);
    } else {
      hidePdaLabel(pda);
    }
  });
}

// 判断是否显示标签
function shouldShowLabel(pda) {
  if (labelDisplayState.mode === 'hidden') {
    return false;
  }
  
  if (!labelDisplayState.typeFilters[pda.pda_type]) {
    return false;
  }
  
  return true;
}
```

### 预计时长
**1 天**

---

## 实施计划

### 阶段 1：K 线回放（1.5 天）

**Day 1 上午**：基础回放控制
- [ ] 创建回放控制栏 UI
- [ ] 实现播放/暂停/停止功能
- [ ] 实现速度控制

**Day 1 下午**：回放逻辑
- [ ] 实现逐根 K 线显示
- [ ] 实现 PDA 同步显示
- [ ] 实现进度条和时间标记

**Day 2 上午**：高级功能
- [ ] 实现单步前进/后退
- [ ] 实现跳转到指定时间
- [ ] 测试和优化

---

### 阶段 2：PDA 显示控制（1.5 天）

**Day 2 下午**：PDA 类型过滤
- [ ] 创建 PDA 控制面板 UI
- [ ] 实现按类型显示/隐藏
- [ ] 实现全选/全不选

**Day 3 上午**：PDA 周期过滤
- [ ] 实现按周期显示/隐藏
- [ ] 实现多周期叠加
- [ ] 实现周期切换时 PDA 保持

**Day 3 下午**：PDA 时段过滤
- [ ] 实现按时间范围过滤
- [ ] 测试和优化

---

### 阶段 3：标签显示控制（1 天）

**Day 4 上午**：标签显示/隐藏
- [ ] 创建标签控制面板 UI
- [ ] 实现全局开关
- [ ] 实现按类型控制
- [ ] 实现鼠标悬停显示

**Day 4 下午**：标签样式调整
- [ ] 实现字体大小调整
- [ ] 实现显示内容切换
- [ ] 实现位置和背景样式
- [ ] 测试和优化

---

## 技术挑战

### 1. K 线回放性能
**问题**：大量 K 线数据的逐根显示可能导致性能问题  
**解决方案**：
- 使用 `requestAnimationFrame` 而非 `setInterval`
- 批量更新图表数据（每次更新 10-20 根）
- 使用虚拟滚动技术

### 2. 多周期 PDA 叠加
**问题**：不同周期的 PDA 可能重叠，难以区分  
**解决方案**：
- 使用不同的颜色/透明度区分周期
- 添加周期标识到标签
- 实现 PDA 分层显示

### 3. 标签防重叠
**问题**：大量 PDA 标签可能重叠，影响可读性  
**解决方案**：
- 实现标签碰撞检测算法
- 自动调整重叠标签的位置
- 优先显示重要的 PDA 标签

### 4. 状态持久化
**问题**：用户的显示设置需要保存  
**解决方案**：
- 使用 `localStorage` 保存用户设置
- 实现预设方案功能
- 支持导入/导出配置

---

## 测试计划

### 功能测试
- [ ] K 线回放：播放/暂停/停止/速度控制
- [ ] PDA 过滤：类型/周期/时段过滤
- [ ] 标签控制：显示/隐藏/样式切换
- [ ] 多周期叠加：同时显示多个周期的 PDA
- [ ] 周期切换：保持 PDA 显示状态

### 性能测试
- [ ] 大数据量回放（1000+ K 线）
- [ ] 多周期叠加（3+ 周期）
- [ ] 大量 PDA 显示（100+ PDA）

### 兼容性测试
- [ ] Chrome / Firefox / Safari
- [ ] 不同屏幕分辨率

---

## 参考资料

### 现有代码
- `v3/modules/chart.js` - 图表管理
- `v3/modules/pda-renderer.js` - PDA 渲染
- `v3/modules/pda-detector.js` - PDA 检测
- `v3/docs/kline_viewer.html` - 主页面

### 技术文档
- Lightweight Charts API: https://tradingview.github.io/lightweight-charts/
- 回放功能参考：TradingView Replay 功能

---

## 后续优化

### 短期（1-2 周）
- [ ] 添加回放速度自定义输入
- [ ] 添加关键点自动标记
- [ ] 优化标签防重叠算法

### 中期（1 个月）
- [ ] 添加回放录制功能（导出视频）
- [ ] 添加 PDA 统计面板
- [ ] 添加多图表对比功能

### 长期（3 个月）
- [ ] 添加策略回测功能
- [ ] 添加实时数据接入
- [ ] 添加移动端支持
