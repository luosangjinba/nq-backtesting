# 右键菜单实现方式技术可行性报告

> **报告时间**：2026-05-12  
> **目标**：评估块状菜单和辐射菜单的技术可行性，为实现规划提供依据

---

## 📋 执行摘要

| 方案 | 可行性 | 实现时间 | 推荐度 |
|------|--------|------|--------|
| **块状菜单** | ✅ 高 | 2-4 小时 | ⭐⭐⭐ 推荐 |
| **辐射菜单** | ✅ 中 | 1-2 天 | ⭐⭐⭐ 可选 |
**结论**：
- **短期（阶段 1-3）**：采用块状菜单，快速实现基础功能
- **长期（v4 或独立优化）**：辐射菜单作为可选高级功能

---

## 方案 1：块状菜单（Contextual Panel）

### ✅ 技术可行性：高

#### 实现方式

**技术栈**：纯 HTML + CSS + JavaScript（无需第三方库）

**核心逻辑**：
1. 监听 `contextmenu` 事件（右键点击）
2. 阻止浏览器默认菜单：`event.preventDefault()`
3. 动态创建菜单 DOM 元素
4. 根据点击位置和上下文显示不同选项
5. 点击菜单项执行操作，点击外部关闭菜单

#### 代码结构

```javascript
// 1. 监听右键事件
chart.subscribeClick((param) => {
  if (param.sourceEvent.button === 2) { // 右键
    const clickedPda = findPdaAtPosition(param.point.x, param.point.y);
    showContextMenu(param.point.x, param.point.y, clickedPda);
  }
});

// 2. 显示菜单
function showContextMenu(x, y, pda) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  
  if (pda) {
    // PDA 菜单
    menu.innerHTML = `
      <div class="menu-item" data-action="view">📋 查看详情</div>
      <div class="menu-item" data-action="locate">📍 定位</div>
      ${pda.manual_added ? `
        <div class="menu-divider"></div>
        <div class="menu-item" data-action="edit">✏️ 编辑</div>
        <div class="menu-item danger" data-action="delete">🗑️ 删除</div>
      ` : ''}
    `;
  } else {
    // 空白区域菜单
    menu.innerHTML = `
      <div class="menu-item" data-action="create">➕ 新建 PDA</div>
   <div class="menu-item" data-action="refresh">🔄 刷新数据</div>
    `;
  }
  
  document.body.appendChild(menu);
  
  // 3. 绑定点击事件
  menu.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    handleMenuAction(action, pda);
    closeContextMenu();
  });
}

// 3. 关闭菜单
function closeContextMenu() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

// 点击外部关闭
document.addEventListener('click', closeContextMenu);
```

#### CSS 样式

```css
.context-menu {
  position: fixed;
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  min-width: 180px;
  z-index: 10000;
  animation: menuFadeIn 0.15s ease;
}

@keyframes menuFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #e0e3eb;
  transition: background 0.15s;
}

.menu-item:hover {
  background: #2a2e39;
}

.menu-item.danger:hover {
  background: #ef5350;
  color: #fff;
}

.menu-divider {
  height: 1px;
  background: #2a2e39;
  margin: 4px 0;
}
```

#### 优点

✅ **实现简单**：标准 DOM 操作，无需复杂计算  
✅ **调试方便**：可以用浏览器开发工具直接查看和调试  
✅ **性能好**：DOM 元素轻量，渲染快速  
✅ **易于扩展**：添加新选项、分组、图标、快捷键都很简单  
✅ **用户熟悉**：传统右键菜单，无学习成本  
✅ **响应式**：自动处理边界（菜单超出屏幕时自动调整位置）  
✅ **可访问性**：支持键盘导航（上下键、回车、ESC）

#### 缺点

⚠️ **视觉单调**：传统样式，不够炫酷  
⚠️ **鼠标移动距离**：垂直列表，选项多时需要移动较远

#### 实现时间估算

| 任务 | 时间 |
|------|------|
| 基础菜单结构（HTML + CSS） | 1 小时 |
| 右键事件监听和菜单显示 | 0.5 小时 |
| 菜单项点击处理 | 0.5 小时 |
| 边界检测和位置调整 | 0.5 小时 |
| 键盘导航支持（可选） | 0.5 小时 |
| 测试和调试 | 1 小时 |
| **总计** | **2-4 小时** |

#### 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 与 Lightweight Charts 事件冲突 | 低 | 使用 `stopPropagation()` 隔离事件 |
| 菜单位置超出屏幕 | 低 | 检测边界，自动调整位置 |
| 菜单未正确关闭 | 低 | 监听多种关闭事件（点击外部、ESC、滚动） |

#### 技术债务

无明显技术债务，标准实现方式。

---

## 方案 2：辐射菜单（Radial Menu）

### ✅ 技术可行性：中

#### 实现方式

**技术栈**：Canvas 绘制 + 数学计算（或使用第三方库）

**核心逻辑**：
1. 监听右键点击，获取鼠标位置
2. 在 Canvas 上绘制辐射菜单（扇形分布）
3. 计算每个选项的位置（极坐标 → 直角坐标）
4. 监听鼠标移动，高亮对应扇区
5. 点击或拖动选择选项

#### 代码结构（自实现）

```javascript
class RadialMenu {
  constructor(x, y, options) {
    this.x = x;
    this.y = y;
    this.options = options; // [{label, icon, action}]
    this.radius = 80;
    this.innerRadius = 20;
    this.hoveredIndex = -1;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '10000';
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.bindEvents();
    this.render();
  }
  
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const angleStep = (2 * Math.PI) / this.options.length;
    
    this.options.forEach((option, i) => {
      const startAngle = i * angleStep - Math.PI / 2;
      const endAngle = startAngle + angleStep;
      const isHovered = i === this.hoveredIndex;
   
      // 绘制扇形
      ctx.fillStyle = isHovered ? '#2962ff' : 'rgba(30, 34, 45, 0.95)';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, this.radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fill();
      
      // 绘制边框
      ctx.strokeStyle = '#2a2e39';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 绘制文字
      const midAngle = startAngle + angleStep / 2;
      const textX = this.x + Math.cos(midAngle) * (this.radius * 0.7);
      const textY = this.y + Math.sin(midAngle) * (this.radius * 0.7);
      
      ctx.fillStyle = isHovered ? '#fff' : '#e0e3eb';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(option.label, textX, textY);
    });
    
    // 绘制中心圆
    ctx.fillStyle = '#131722';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.innerRadius, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  bindEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const dx = e.clientX - this.x;
      const dy = e.clientY - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > this.innerRadius && distance < this.radius) {
        let angle = Math.atan2(dy, dx) + Math.PI / 2;
        if (angle < 0) angle += 2 * Math.PI;
        
        const angleStep = (2 * Math.PI) / this.options.length;
        this.hoveredIndex = Math.floor(angle / angleStep);
      } else {
        this.hoveredIndex = -1;
      }
      
      this.render();
    });
    
    this.canvas.addEventListener('click', (e) => {
      if (this.hoveredIndex >= 0) {
        this.options[this.hoveredIndex].action();
      }
    this.close();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  }
  
  close() {
    this.canvas.remove();
  }
}

// 使用
function showRadialMenu(x, y, pda) {
  const options = pda ? [
    { label: '查看', action: () => viewPda(pda) },
    { label: '定位', action: () => locatePda(pda) },
    { label: '编辑', action: () => editPda(pda) },
    { label: '删除', action: () => deletePda(pda) },
  ] : [
    { label: '新建', action: () => createPda() },
    { label: '刷新', action: () => refreshData() },
  ];
  
  new RadialMenu(x, y, options);
}
```

#### 使用第三方库

**推荐库**：[wheelnav.js](http://wheelnavjs.softwaretailoring.net/)

```javascript
// 使用 wheelnav.js（更简单）
function showRadialMenu(x, y, pda) {
  const wheel = new wheelnav('radial-menu-container');
  wheel.navAngle = 0;
  wheel.slicePathFunction = slicePath().DonutSlice;
  wheel.slicePathCustom = slicePath().DonutSliceCustomization();
  wheel.sliceSelectedPathCustom = wheel.slicePathCustom;
  wheel.sliceInitPathCustom = wheel.slicePathCustom;
  
  wheel.createWheel(pda ? 
    ['查看', '定位', '编辑', '删除'] : 
    ['新建', '刷新']
  );
  
  wheel.navItems.forEach((item, i) => {
    item.navigateFunction = () => {
      handleAction(i, pda);
      wheel.removeWheel();
    };
  });
}
```

#### 优点

✅ **视觉炫酷**：现代、新颖，提升用户体验  
✅ **鼠标移动距离短**：所有选项距离相等（等距）  
✅ **触摸屏友好**：适合触摸操作  
✅ **肌肉记忆**：熟练后可以快速选择（方向感）

#### 缺点

⚠️ **实现复杂**：需要数学计算（极坐标、角度、扇形绘制）  
⚠️ **调试困难**：Canvas 绘制，无法用浏览器开发工具直接查看  
⚠️ **选项数量限制**：选项过多时（>8个）扇形太小，难以点击  
⚠️ **学习成本**：用户需要适应新的交互方式  
⚠️ **子菜单复杂**：嵌套辐射菜单实现困难  
⚠️ **文字显示**：扇形内文字排版困难（可能需要旋转或缩写）

#### 实现时间估算

**自实现：**

| 任务 | 时间 |
|------|------|
| 基础辐射菜单结构（Canvas 绘制） | 4 小时 |
| 扇形计算和绘制 | 2 小时 |
| 鼠标交互（悬停、点击） | 2 小时 |
| 动画效果（展开/收起） | 2 小时 |
| 图标和文字排版 | 2 小时 |
| 边界处理（菜单超出屏幕） | 1 小时 |
| 测试和调试 | 3 小时 |
| **总计** | **1-2 天** |

**使用第三方库（wheelnav.js）：**

| 任务 | 时间 |
|------|------|
| 集成 wheelnav.js | 1 小时 |
| 配置和样式定制 | 2 小时 |
| 事件绑定和操作处理 | 1 小时 |
| 测试和调试 | 1 小时 |
| **总计** | **4-6 小时** |

#### 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 数学计算错误 | 中 | 充分测试，使用成熟的库 |
| 性能问题（Canvas 重绘） | 中 | 优化绘制逻辑，使用 requestAnimationFrame |
| 选项过多时难以点击 | 高 | 限制选项数量（≤8个），或使用分层菜单 |
| 与 Lightweight Charts 冲突 | 中 | 使用独立的 Canvas 层，z-index 隔离 |
| 用户不习惯 | 中 | 提供传统菜单作为备选，或添加教程提示 |

#### 技术债务

⚠️ **维护成本高**：自实现需要维护复杂的数学逻辑  
⚠️ **扩展困难**：添加新功能（子菜单、动画）需要大量工作  
⚠️ **第三方库依赖**：使用库会增加依赖，库更新或停止维护会有风险

---

## 📊 对比总结

| 维度 | 块状菜单 | 辐射菜单 |
|------|---------|---------|
| **实现时间** | 2-4 小时 | 1-2 天（自实现）<br>4-6 小时（用库） |
| **实现难度** | ⭐ 简单 | ⭐⭐⭐⭐ 复杂 |
| **调试难度** | ⭐ 简单 | ⭐⭐⭐⭐ 困难 |
| **维护成本** | ⭐ 低 | ⭐⭐⭐⭐ 高 |
| **用户学习成本** | ⭐ 无 | ⭐⭐⭐ 中 |
| **视觉吸引力** | ⭐⭐ 传统 | ⭐⭐⭐⭐⭐ 炫酷 |
| **操作效率** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐ 高（熟练后） |
| **扩展性** | ⭐⭐⭐⭐⭐ 优秀 | ⭐⭐ 困难 |
| **选项数量** | 无限制 | ≤8 个 |
| **子菜单支持** | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐ 复杂 |
| **触摸屏友好** | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 优秀 |

---

## 🎯 实施建议

### 阶段 1-3：采用块状菜单 ✅

**理由：**
1. **快速交付**：2-4 小时即可完成，不影响主线开发
2. **稳定可靠**：标准实现，风险低
3. **易于迭代**：后续添加功能简单
4. **用户熟悉**：无学习成本，立即可用

**实施步骤：**
1. 在 `kline_viewer.html` 中添加菜单 HTML 模板
2. 在 `chart-viewer.css` 中添加菜单样式
3. 监听右键事件，显示菜单
4. 绑定菜单项点击事件
5. 测试和优化

---

### V4 或独立优化：辐射菜单作为可选项 ⭐

**前置条件：**
- 阶段 1-3 完成
- 块状菜单已稳定运行
- 用户反馈需要更高效的交互

**实施建议：**
1. **使用 wheelnav.js 库**（不要自实现）
   - 成熟稳定，文档完善
   - 节省开发时间（4-6 小时 vs 1-2 天）
   - 降低维护成本

2. **提供配置选项**
   ```javascript
   // 在设置中添加
   settings.contextMenuStyle = 'block'; // 'block' | 'radial'
   ```

3. **渐进式推出**
   - 先作为实验性功能（Beta 标签）
   - 收集用户反馈
   - 根据反馈决定是否正式启用

4. **保留块状菜单**
   - 作为默认选项
   - 辐射菜单作为高级选项
   - 用户可以随时切换

---

## 💰 成本效益分析

### 块状菜单

**投入**：2-4 小时  
**收益**：
- ✅ 立即可用的右键菜单功能
- ✅ 稳定可靠，无技术债务
- ✅ 易于维护和扩展

**ROI**：⭐⭐⭐⭐⭐ 非常高

---

### 辐射菜单

**投入**：4-6 小时（用库）或 1-2 天（自实现）  
**收益**：
- ✅ 提升用户体验（视觉和效率）
- ✅ 差异化功能，增加产品吸引力
- ⚠️ 需要用户适应，可能有学习成本

**ROI**：⭐⭐⭐ 中等（取决于用户反馈）

---

## 📋 实施路线图

```
阶段 1-3（当前）
  └─ 块状菜单 ✅
      ├─ 实现时间：2-4 小时
      ├─ 风险：低
      └─ 优先级：高

V4 或独立优化（未来）
  └─ 辐射菜单 ⭐
      ├─ 实现时间：4-6 小时（用 wheelnav.js）
      ├─ 风险：中
      ├─ 优先级：中
      └─ 前置条件：块状菜单已稳定
```

---

## ✅ 最终建议

1. **立即实施**：块状菜单（阶段 1）
2. **记录技术债务**：辐射菜单作为未来优化项
3. **收集反馈**：在块状菜单使用一段时间后，询问用户是否需要辐射菜单
4. **按需实施**：如果用户强烈需要，再投入时间实现辐射菜单

**预计总投入**：
- 短期：2-4 小时（块状菜单）
- 长期：4-6 小时（辐射菜单，可选）

**风险**：低  
**收益**：高  
**推荐度**：⭐⭐⭐⭐⭐
