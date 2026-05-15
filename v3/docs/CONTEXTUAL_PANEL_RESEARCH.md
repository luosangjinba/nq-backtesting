# Contextual Panel 技术预研

> **预研时间**：2026-05-12  
> **目标**：研究 PDA 工作台的实现方案，评估技术可行性

---

## 一、背景

根据 `PLAN_PDA_WORKBENCH.md`，我们需要在 `kline_viewer.html` 右侧添加一个 PDA 工作台，用于：
1. 显示当前加载的 PDA 列表
2. 选择和定位 PDA
3. 显示 PDA 详情
4. 创建/编辑/删除 Manual PDA

**关键问题：** Lightweight Charts 是否提供内置的 Contextual Panel 或 Sidebar 功能？

---

## 二、Lightweight Charts 官方调研

### 2.1 官方插件系统

根据 `v3/docs/plugins/INDEX.md`，Lightweight Charts 提供了 27+ 个官方插件，分为以下类别：

- 📊 绘图工具类 (Drawing Tools)
- 🎨 视觉增强类 (Visual Enhancement)
- 💬 交互提示类 (Interaction)
- 🔔 价格提醒类 (Price Alerts)
- 📈 自定义系列类 (Custom Series)
- 📊 指标分析类 (Indicators)
- 🎛️ 界面增强类 (UI Enhancement)

**结论：** ❌ 没有 Contextual Panel 或 Sidebar 相关的插件

### 2.2 Web 搜索结果

搜索关键词：
- "Lightweight Charts contextual panel side panel 2026"
- "Lightweight Charts sidebar panel custom UI overlay"

**发现：**
1. [qwpto/lightweight-charts-panels](https://github.com/qwpto/lightweight-charts-panels) — 一个 Lightweight Charts 的 fork，名称包含 "panels"，但 README 没有说明具体的 panel 功能
2. 其他结果主要是通用的 UI 框架（Tailwind CSS Drawer、Bootstrap Sidebar 等）

**结论：** ❌ Lightweight Charts 没有内置的 Contextual Panel 功能

---

## 三、实现方案

### 方案 A：纯 HTML/CSS 自定义侧边栏（推荐）✅

**原理：**
- Lightweight Charts 只负责图表渲染
- 侧边栏使用标准的 HTML/CSS 实现
- 通过 JavaScript 实现图表和侧边栏的交互

**优点：**
- ✅ 完全控制 UI 样式和交互
- ✅ 不依赖第三方库
- ✅ 易于维护和扩展
- ✅ 已有成功案例（`layer2_recorder_v2.html`）

**缺点：**
- ❌ 需要手动实现所有 UI 逻辑
- ❌ 响应式布局需要自己处理

**技术栈：**
- HTML: 侧边栏结构
- CSS: 样式和布局（Flexbox/Grid）
- JavaScript: 交互逻辑

**参考实现：**
`v2/docs/layer2_recorder_v2.html` 已经实现了类似的布局：
```html
<div class="container">
  <div class="main-content">
    <!-- Lightweight Charts 图表 -->
    <div id="chart"></div>
  </div>
  <div class="sidebar">
    <!-- PDA 工作台 -->
    <div class="pda-list">...</div>
    <div class="pda-details">...</div>
    <div class="pda-form">...</div>
  </div>
</div>
```

```css
.container {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.sidebar {
  width: 360px;
  background: #1e222d;
  overflow-y: auto;
}
```

### 方案 B：使用 UI 框架（不推荐）

**可选框架：**
- Tailwind CSS Drawer
- Bootstrap Offcanvas
- Material UI Drawer

**优点：**
- ✅ 开箱即用的 UI 组件
- ✅ 响应式布局自动处理

**缺点：**
- ❌ 引入额外依赖（增加包体积）
- ❌ 样式定制受限
- ❌ 与项目现有风格不一致
- ❌ 学习成本

**结论：** ❌ 不推荐，项目已经是纯 HTML/CSS/JS，引入框架得不偿失

### 方案 C：使用 qwpto/lightweight-charts-panels（待评估）

**状态：** 该项目的 README 没有说明具体的 panel 功能，需要进一步查看源码

**评估成本：** 高（需要阅读源码、理解实现、评估兼容性）

**结论：** ⏸️ 暂不评估，优先使用方案 A

---

## 四、推荐方案：纯 HTML/CSS 自定义侧边栏

### 4.1 布局结构
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: sans-serif;
      background: #0a0e27;
      color: #e0e3eb;
    }

    .app-container {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .chart-container {
   flex: 1;
      min-width: 0;
    display: flex;
      flex-direction: column;
    }

    .toolbar {
      height: 50px;
      background: #1e222d;
      border-bottom: 1px solid #2a2e39;
      display: flex;
      align-items: center;
      padding: 0 15px;
      gap: 10px;
    }

    .chart-wrapper {
      flex: 1;
      position: relative;
    }

    .sidebar {
      width: 360px;
      background: #1e222d;
      border-left: 1px solid #2a2e39;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sidebar.collapsed {
      width: 0;
      border: none;
    }

    .sidebar-header {
      height: 50px;
      border-bottom: 1px solid #2a2e39;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 15px;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 15px;
    }

    .pda-list {
      margin-bottom: 20px;
    }

    .pda-list-item {
      padding: 10px;
      background: #131722;
      border-radius: 4px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .pda-list-item:hover {
      background: #1a1e2d;
    }

    .pda-list-item.selected {
      background: #2962ff;
    }

    .pda-details {
      background: #131722;
      border-radius: 4px;
      padding: 15px;
    }
  </style>
</head>
<body>
  <div class="app-container">
    <!-- 左侧：图表区域 -->
    <div class="chart-container">
      <div class="toolbar">
     <button id="toggleSidebar">切换侧边栏</button>
        <!-- 其他工具栏按钮 -->
      </div>
      <div class="chart-wrapper">
        <div id="chart"></div>
      </div>
    </div>

    <!-- 右侧：PDA 工作台 -->
    <div class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <h3>PDA 工作台</h3>
        <button id="closeSidebar">×</button>
      </div>
      <div class="sidebar-content">
        <!-- PDA 列表 -->
        <div class="pda-list" id="pdaList">
          <!-- 动态生成 -->
        </div>

        <!-- PDA 详情 -->
        <div class="pda-details" id="pdaDetails">
          <!-- 动态生成 -->
      </div>
      </div>
    </div>
  </div>

  <script>
    // 侧边栏折叠/展开
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const closeBtn = document.getElementById('closeSidebar');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });

    closeBtn.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
    });

    // PDA 列表渲染
    function renderPdaList(pdas) {
      const listEl = document.getElementById('pdaList');
      listEl.innerHTML = pdas.map(pda => `
        <div class="pda-list-item" data-pda-id="${pda.pdaId}">
          <div><strong>${pda.pdaType.toUpperCase()}</strong> - ${pda.timeframe}</div>
       <div>${pda.anchorTime}</div>
          <div>Price: ${pda.price || `${pda.priceLow}-${pda.priceHigh}`}</div>
        </div>
      `).join('');

      // 点击列表项
      listEl.querySelectorAll('.pda-list-item').forEach(item => {
        item.addEventListener('click', () => {
          const pdaId = item.dataset.pdaId;
       selectPda(pdaId);
        });
      });
    }

    // 选择 PDA
    function selectPda(pdaId) {
      // 1. 高亮列表项
      document.querySelectorAll('.pda-list-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.pdaId === pdaId);
      });
      // 2. 显示详情
      const pda = pdas.find(p => p.pdaId === pdaId);
      renderPdaDetails(pda);

      // 3. 图表定位到该 PDA
      const timestamp = parseTimestamp(pda.anchorTime);
      chart.timeScale().scrollToPosition(0, true);
      chart.timeScale().setVisibleLogicalRange({
        from: timestamp - 3600,
        to: timestamp + 3600
      });
    }

    // 显示 PDA 详情
    function renderPdaDetails(pda) {
      const detailsEl = document.getElementById('pdaDetails');
      detailsEl.innerHTML = `
        <h4>PDA 详情</h4>
        <div><strong>ID:</strong> ${pda.pdaId}</div>
        <div><strong>类型:</strong> ${pda.pdaType}</div>
        <div><strong>周期:</strong> ${pda.timeframe}</div>
        <div><strong>时间:</strong> ${pda.anchorTime}</div>
        <div><strong>价格:</strong> ${pda.price || `${pda.priceLow}-${pda.priceHigh}`}</div>
        <div><strong>备注:</strong> ${pda.note || '无'}</div>
      `;
    }
  </script>
</body>
</html>
```

### 4.2 关键技术点

#### 1. Flexbox 布局

```css
.app-container {
  display: flex;           /* 水平布局 */
  height: 100vh;           /* 全屏高度 */
  overflow: hidden;        /* 防止滚动条 */
}

.chart-container {
  flex: 1;                 /* 占据剩余空间 */
  min-width: 0;            /* 防止 flex 子元素溢出 */
}

.sidebar {
  width: 360px;        /* 固定宽度 */
}
```

#### 2. 侧边栏折叠

```css
.sidebar.collapsed {
  width: 0;
  border: none;
}
```

```javascript
sidebar.classList.toggle('collapsed');
```

#### 3. 图表和侧边栏交互

**点击列表项 → 图表定位：**
```javascript
function selectPda(pdaId) {
  const pda = pdas.find(p => p.pdaId === pdaId);
  const timestamp = parseTimestamp(pda.anchorTime);
  
  // 滚动到 PDA 位置
  chart.timeScale().scrollToPosition(0, true);
  chart.timeScale().setVisibleLogicalRange({
    from: timestamp - 3600,
    to: timestamp + 3600
  });
}
```

**点击图表 PDA → 列表高亮：**
```javascript
chart.subscribeClick((param) => {
  const clickedPda = findClosestPda(param.point);
  if (clickedPda) {
    selectPda(clickedPda.pdaId);
  }
});
```

#### 4. 响应式处理

```css
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  }
}
```

---

## 五、实现计划

### 阶段 1：基础 UI 和 PDA 选择（0.5天）

**任务清单：**
1. ✅ 创建侧边栏 HTML 结构
2. ✅ 实现 Flexbox 布局
3. ✅ 实现侧边栏折叠/展开
4. ✅ 渲染 PDA 列表（按类型分组）
5. ✅ 点击列表项 → 图表定位
6. ✅ 点击图表 PDA → 列表高亮
7. ✅ 显示 PDA 详情（只读）

**验收标准：**
- ✅ 侧边栏正常显示，可折叠
- ✅ PDA 列表按类型分组（BSL, SSL, FVG）
- ✅ 点击列表项，图表滚动到对应位置
- ✅ 点击图表 PDA，列表项高亮
- ✅ 显示选中 PDA 的所有属性

### 阶段 2：Manual PDA 录入（0.5天）

**任务清单：**
1. ✅ 添加"新建 PDA"按钮
2. ✅ 实现 PDA 创建表单
3. ✅ 表单验证
4. ✅ 调用 `POST /v2/pda_manual_add` API
5. ✅ 刷新列表和图表

### 阶段 3：PDA 编辑和删除（0.5天）

**任务清单：**
1. ✅ 添加"编辑"和"删除"按钮
2. ✅ 实现编辑表单（复用创建表单）
3. ✅ 调用 `PUT /v2/pda_manual_update` API
4. ✅ 调用 `POST /v2/pda_delete` API
5. ✅ 权限控制（只能编辑/删除 Manual PDA）

---

## 六、技术决策

### 决策 1：不使用 Lightweight Charts 插件

**原因：**
- Lightweight Charts 没有内置的 Contextual Panel 功能
- 官方插件系统不支持侧边栏类型的 UI

**方案：** 使用纯 HTML/CSS 实现自定义侧边栏

### 决策 2：不引入 UI 框架

**原因：**
- 项目已经是纯 HTML/CSS/JS，引入框架增加复杂度
- 自定义侧边栏的实现成本不高（~300-400 行代码）
- 已有成功案例（`layer2_recorder_v2.html`）

**方案：** 使用 Flexbox 布局 + 原生 JavaScript

### 决策 3：侧边栏固定宽度 360px

**原因：**
- 参考 `demo_02_sidebar_layout.html` 的测试结果
- 360px 足够显示 PDA 列表和详情
- 固定宽度简化布局逻辑

**方案：** 使用 `width: 360px`，不支持拖拽调整（可作为未来优化）

---

## 七、参考资料

### 官方文档
- [Lightweight Charts 官方文档](https://tradingview.github.io/lightweight-charts/docs)
- [Lightweight Charts 插件示例](https://tradingview.github.io/lightweight-charts/plugin-examples/)

### 项目内参考
- `v2/docs/layer2_recorder_v2.html` — 侧边栏布局参考
- `v3/docs/demo_02_sidebar_layout.html` — 侧边栏测试 demo
- `v3/docs/PLAN_PDA_WORKBENCH.md` — PDA 工作台方案规划
- `v3/docs/TECH_RESEARCH_REPORT.md` — 技术预研报告
### Web 搜索结果
- [qwpto/lightweight-charts-panels](https://github.com/qwpto/lightweight-charts-panels) — Lightweight Charts fork（panel 功能未明确）
- [Tailwind CSS Drawer](https://flyonui.com/docs/overlays/drawer/) — UI 框架参考（不采用）

---

## 八、总结

**核心结论：**
1. ✅ Lightweight Charts **没有**内置的 Contextual Panel 功能
2. ✅ 推荐使用**纯 HTML/CSS 自定义侧边栏**
3. ✅ 已有成功案例（`layer2_recorder_v2.html`）
4. ✅ 实现成本低（~300-400 行代码）
5. ✅ 完全控制 UI 样式和交互

**下一步：**
开始阶段 1 实现：基础 UI 和 PDA 选择（0.5天）

---

**Sources:**
- [Lightweight Charts Official Docs](https://tradingview.github.io/lightweight-charts/docs)
- [qwpto/lightweight-charts-panels](https://github.com/qwpto/lightweight-charts-panels)
- [Tailwind CSS Drawer](https://flyonui.com/docs/overlays/drawer/)
