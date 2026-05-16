# Session 2026-05-15 - 禁用 PDA 显示 & 启用空白区域右键菜单

**日期**：2026-05-15  
**分支**：`feature/chart-display-control`  
**状态**：✅ 已完成

---

## 会话目标

1. 回退右边缘缝隙调整的所有修改
2. 默认不显示 PDA
3. 启用空白区域右键菜单，为手动添加 PDA 功能做准备

---

## 完成内容

### 1. 回退右边缘缝隙修改 ✅

**问题**：
- 尝试修复首次加载后点击播放时右侧无缝隙的问题
- 多次尝试不同方案，但问题依然存在

**决策**：
- 放弃右边缘缝隙调整
- 回退到 commit `eed6aeb`（修复回放时图表自动缩放问题）的状态

**修改文件**：
- `v3/modules/replay.js` - 恢复到 `eed6aeb` 版本

**当前行为**：
- 首次加载时使用 `fitContent()` 自动缩放
- 回放过程中不再自动缩放，保持用户视图
- `currentIndex` 初始值为 0

### 2. 默认不显示 PDA ✅

**需求背景**：
- 用户希望默认只显示 K 线，不显示 PDA
- 为后续手动添加 PDA 功能做准备

**修改文件**：`v3/docs/kline_viewer.html`

**修改内容**：
1. 注释掉 `loadPdaData(start, end)` 调用（第 209-219 行）
2. 修改状态更新：只显示 K 线数量，不显示 PDA 数量
3. 修改回放数据加载：传入空的 PDA 列表 `[]` 而不是 `state.pdaRecords`

**代码变更**：
```javascript
// 注释掉的代码
//           // 加载 PDA 数据
//           updateStatus('加载 PDA 数据...');
//           await loadPdaData(start, end);
//           // 强制图表重绘以显示 PDA 标记
//           state.chart.timeScale().fitContent();
//
//           const pdaCount = state.pdaRecords.length;
//           updateStatus(`已加载 ${candleData.length} 根 K线 + ${pdaCount} 个 PDA`);
//
//           // 加载回放数据
//           loadReplayData(candleData, state.pdaRecords, start, end, parseInt(tf));

// 新增代码
// 默认不加载 PDA 数据
updateStatus(`已加载 ${candleData.length} 根 K线`);

// 加载回放数据（PDA 列表为空）
loadReplayData(candleData, [], start, end, parseInt(tf));
```

**效果**：
- 加载数据时不再请求 PDA 数据
- 图表上不会显示任何 PDA 标记
- 状态栏显示"已加载 X 根 K线"
- 回放功能正常工作

### 3. 启用空白区域右键菜单 ✅

**需求背景**：
- 用户计划实现手动添加 PDA 功能
- 在 K 线上右键点击，选择"手动添加 FVG/BSL/SSL"
- 系统自动标注 PDA

**修改文件**：
- `v3/modules/context-menu.js` - 新增 `showBlankAreaMenu()` 函数
- `v3/docs/kline_viewer.html` - 修改右键事件处理逻辑

#### 3.1 新增 `showBlankAreaMenu()` 函数

**位置**：`v3/modules/context-menu.js` 第 267-325 行
**功能**：显示空白区域右键菜单

**参数**：
- `x`, `y` - 菜单坐标（相对于视口）
- `chartCoordinates` - 图表坐标对象 `{ time, price, clientX, clientY }`

**菜单项**：
1. ➕ 手动添加 FVG
2. ➕ 手动添加 BSL
3. ➕ 手动添加 SSL
4. 🔄 刷新数据（F5）

**代码结构**：
```javascript
export function showBlankAreaMenu(x, y, chartCoordinates) {
  console.log('右键点击空白区域:', chartCoordinates);

  const items = [
    {
      icon: '➕',
      label: '手动添加 FVG',
      action: () => {
        console.log('[操作] 手动添加 FVG:', chartCoordinates);
        closeContextMenu();
     // TODO: 实现手动添加 FVG 的逻辑
     alert('手动添加 FVG 功能待实现');
      },
    },
    // ... 其他菜单项
  ];
  createContextMenu(x, y, items);
}
```

#### 3.2 修改右键事件处理逻辑

**位置**：`v3/docs/kline_viewer.html` 第 260-290 行

**修改内容**：
1. 导入 `showBlankAreaMenu` 函数
2. 修改 `contextmenu` 事件处理：
   - 点击到 PDA → 显示 PDA 菜单（原有逻辑）
   - 点击空白区域 → 显示手动添加 PDA 菜单（新增逻辑）
3. 获取点击位置的图表坐标（时间和价格）

**代码变更**：
```javascript
// 导入新函数
import { showPdaMenu, showBlankAreaMenu, closeContextMenu } from '../modules/context-menu.js';

// 右键事件处理
chartContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();

  const pda = findPdaAtPosition(e.clientX, e.clientY);

  if (pda) {
    // 点击到 PDA，显示 PDA 菜单
    showPdaMenu(e.clientX, e.clientY, pda, showPdaDetail, updateStatus);
  } else {
    // 空白区域，显示手动添加 PDA 菜单
    // 获取点击位置的图表坐标
    const rect = chartContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const timeScale = state.chart.timeScale();
    const timestamp = timeScale.coordinateToTime(x);
    const price = state.candlestickSeries.coordinateToPrice(y);

    const chartCoordinates = {
      time: timestamp,
      price: price,
      clientX: e.clientX,
      clientY: e.clientY,
    };

    showBlankAreaMenu(e.clientX, e.clientY, chartCoordinates);
  }
});
```

**坐标转换**：
- 使用 `timeScale.coordinateToTime(x)` 获取时间戳
- 使用 `candlestickSeries.coordinateToPrice(y)` 获取价格
- 传递给菜单回调函数，供后续手动添加 PDA 使用

---

## 技术要点

### 1. 图表坐标转换

Lightweight Charts 提供了坐标转换 API：
- `timeScale.coordinateToTime(x)` - 像素坐标 → 时间戳
- `candlestickSeries.coordinateToPrice(y)` - 像素坐标 → 价格

需要先将 `clientX/clientY`（相对于视口）转换为相对于图表容器的坐标：
```javascript
const rect = chartContainer.getBoundingClientRect();
const x = e.clientX - rect.left;
const y = e.clientY - rect.top;
```

### 2. 右键菜单架构

**通用菜单创建**：`createContextMenu(x, y, items)`
- 接收菜单项配置数组
- 处理边界检测、键盘导航、点击事件

**专用菜单函数**：
- `showPdaMenu()` - PDA 菜单（查看详情、定位、复制 ID 等）
- `showBlankAreaMenu()` - 空白区域菜单（手动添加 PDA、刷新数据）

**菜单项配置**：
```javascript
{
  icon: '➕',      // 图标
  label: '手动添加 FVG', // 标签
  shortcut: 'F5',      // 快捷键（可选）
  disabled: false,     // 是否禁用（可选）
  danger: false,       // 是否危险操作（可选）
  action: () => {}     // 点击回调
}
```

### 3. 菜单项占位符

当前手动添加 PDA 的菜单项使用 `alert()` 占位：
```javascript
action: () => {
  console.log('[操作] 手动添加 FVG:', chartCoordinates);
  closeContextMenu();
  // TODO: 实现手动添加 FVG 的逻辑
  alert('手动添加 FVG 功能待实现');
}
```

后续实现时，替换为实际的表单显示逻辑即可。

---

## 文件清单

### 修改文件
- `v3/modules/replay.js` - 回退到 `eed6aeb` 版本
- `v3/docs/kline_viewer.html` - 禁用 PDA 加载 + 修改右键事件处理
- `v3/modules/context-menu.js` - 新增 `showBlankAreaMenu()` 函数

### 新增文件
- `v3/sessions/session_20260515_pda_disable_and_contextmenu.md` - 本会话记录

---

## 测试步骤

1. 启动静态服务器（如果未启动）：
   ```bash
   python3 -m http.server 8000
   ```

2. 打开浏览器访问：
   ```
   http://127.0.0.1:8000/v3/docs/kline_viewer.html
   ```

3. 测试 PDA 禁用：
   - 输入时间范围和周期，点击"加载"
   - 观察：只显示 K 线，没有 PDA 标记
   - 状态栏显示"已加载 X 根 K线"

4. 测试右键菜单：
   - 在图表空白区域右键点击
   - 观察：显示菜单，包含"手动添加 FVG/BSL/SSL"和"刷新数据"
   - 点击菜单项，观察控制台输出和 alert 提示

5. 测试回放功能：
   - 点击播放按钮
   - 观察：K 线逐步显示，回放正常工作

---

## 下一步

### 阶段 2：PDA 标注工作流（待开始）

**核心功能**：
1. 手动添加 PDA 表单
   - 创建表单 UI（弹窗或侧边栏）
   - 表单字段：PDA 类型、时间范围、价格范围、备注等
   - 表单验证逻辑

2. PDA 数据保存
   - 调用 API：`POST /v2/pda_manual_add`
   - 保存到 `pda_registry` 表（Manual 类型）
   - 刷新图表显示新添加的 PDA

3. PDA 确认状态标记
   - 点击检测（击中已扫描 PDA）
   - 标记为"已确认"状态

**预计时长**：1 天

---

## 备注

- 右边缘缝隙问题暂时搁置，不影响核心功能
- PDA 禁用是临时方案，后续会通过手动添加功能重新启用
- 右键菜单架构已完善，易于扩展新的菜单项
- 图表坐标转换逻辑已验证，可直接用于手动添加 PDA

---

**会话结束时间**：2026-05-15 15:30
