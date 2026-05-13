# Context Menu 集成记录

> **集成时间**：2026-05-13  
> **分支**：`feature/context-menu-research`  
> **状态**：✅ 阶段 1 完成，测试通过

---

## 一、集成目标

将右键菜单集成到 `kline_viewer.html`，实现最小可用版本（MVP）。

---

## 二、实现内容

### 2.1 阶段 1：基础设施（已完成）

**实现范围**：
- ✅ Context Menu CSS 样式
- ✅ 右键菜单核心函数
- ✅ 图表区域右键事件监听
- ✅ 空白区域菜单
- ✅ 基础交互（悬停、点击、关闭）
- ✅ 边界检测

**代码变更**：
- 文件：`v3/docs/kline_viewer.html`
- 新增代码：~240 行
- 提交：`a93e625`

### 2.2 CSS 样式

```css
/* Context Menu Styles */
.context-menu {
  position: fixed;
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  padding: 4px 0;
  min-width: 200px;
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
  padding: 10px 14px;
  cursor: pointer;
  font-size: 13px;
  color: #e0e3eb;
  transition: background 0.15s;
  user-select: none;
}

.menu-item:hover {
  background: #2a2e39;
}

.menu-item.disabled {
  color: #5d606b;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background: transparent;
}

.menu-item.danger:hover {
  background: #ef5350;
  color: #fff;
}
```

### 2.3 核心函数

#### 1. createContextMenu(x, y, items)
创建并显示右键菜单。

**功能**：
- 移除已存在的菜单
- 创建菜单 DOM 元素
- 边界检测（防止超出屏幕）
- 构建菜单项（支持图标、标签、快捷键、禁用状态、分隔线）
- 绑定点击事件

**边界检测逻辑**：
```javascript
const menuWidth = 200;
const menuHeight = items.length * 40;
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;

let adjustedX = x;
let adjustedY = y;

if (x + menuWidth > viewportWidth) {
  adjustedX = viewportWidth - menuWidth - 10;
}

if (y + menuHeight > viewportHeight) {
  adjustedY = viewportHeight - menuHeight - 10;
}
```

#### 2. closeContextMenu()
关闭当前打开的右键菜单。

**功能**：
- 移除菜单 DOM 元素
- 清空 `state.currentMenu`

#### 3. showBlankMenu(x, y)
显示空白区域菜单。

**菜单项**：
- 🔄 刷新数据（可用）
- ➕ 新建 Manual PDA（禁用）
- 📥 导入 YAML（禁用）
- 📸 导出图表为图片（禁用）
- ⚙️ 设置（禁用）

**刷新数据实现**：
```javascript
action: () => {
  console.log('[操作] 刷新数据');
  const start = document.getElementById('startInput').value.trim();
  const end = document.getElementById('endInput').value.trim();
  if (start && end) {
    loadKlineData();
  } else {
    updateStatus('请先输入时间范围', true);
  }
}
```

### 2.4 事件监听

#### 1. 右键事件
```javascript
document.addEventListener('contextmenu', (e) => {
  const chartContainer = document.getElementById('chart');
  if (chartContainer && chartContainer.contains(e.target)) {
    e.preventDefault();
    showBlankMenu(e.clientX, e.clientY);
  }
});
```

#### 2. 点击外部关闭
```javascript
document.addEventListener('click', (e) => {
  if (state.currentMenu && !e.target.closest('.context-menu')) {
    closeContextMenu();
  }
});
```

#### 3. ESC 键关闭
```javascript
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.currentMenu) {
    closeContextMenu();
    console.log('✓ 菜单已关闭 (ESC)');
  }
});
```

---

## 三、测试结果

### 3.1 测试环境
- 浏览器：Chrome/Firefox/Safari
- 服务器：`python3 -m http.server 8000`
- URL：http://127.0.0.1:8000/v3/docs/kline_viewer.html

### 3.2 测试清单

| 测试项 | 结果 | 备注 |
|------|------|------|
| 右键显示菜单 | ✅ 通过 | 在图表区域右键，菜单正确显示 |
| 菜单项悬停高亮 | ✅ 通过 | 鼠标悬停背景变灰色 |
| 刷新数据功能 | ✅ 通过 | 点击"刷新数据"，重新加载数据 |
| 禁用状态显示 | ✅ 通过 | 禁用项灰色显示，不可点击 |
| 点击外部关闭 | ✅ 通过 | 点击菜单外部，菜单关闭 |
| ESC 键关闭 | ✅ 通过 | 按 ESC 键，菜单关闭 |
| 边界检测（右下角） | ✅ 通过 | 菜单自动向左上调整 |
| 淡入动画 | ✅ 通过 | 菜单打开有 0.15s 淡入效果 |
| 分隔线显示 | ✅ 通过 | 菜单项分组清晰 |
| 快捷键提示 | ✅ 通过 | 右侧显示快捷键（灰色小字） |

**测试结论**：✅ **全部通过，功能完美**

---

## 四、技术亮点

### 4.1 边界检测
自动调整菜单位置，防止超出屏幕边界。

### 4.2 多种关闭方式
- 点击外部
- ESC 键
- 点击菜单项后自动关闭

### 4.3 禁用状态
菜单项支持禁用状态，灰色显示，不可点击。

### 4.4 淡入动画
菜单打开时有 0.15s 淡入动画，提升用户体验。

### 4.5 快捷键提示
菜单项右侧显示快捷键提示（如 F5、Ctrl+,）。

---

## 五、下一步计划

### 阶段 2：PDA 点击检测和菜单（待实现）

**目标**：
- 实现 PDA 点击检测逻辑
- 显示 PDA 右键菜单
- 实现菜单项操作（查看详情、定位、复制 ID）

**技术挑战**：
1. **PDA 点击检测**：
   - Lightweight Charts 的 Primitive 不支持原生点击事件
   - 需要通过鼠标坐标反向计算点击的 PDA
   - 需要考虑重叠 PDA 的选择策略

2. **菜单项操作**：
   - 查看详情：显示 PDA 所有属性
   - 定位：滚动图表到 PDA 位置
   - 复制 ID：复制到剪贴板

**预计时间**：2-3 小时

### 阶段 3：高级功能（可选）

**功能列表**：
- 编辑 Manual PDA
- 删除 Manual PDA
- 导出 YAML
- 新建 Manual PDA
- 键盘导航（上下键选择菜单项）
- 子菜单支持

---

## 六、相关文档

### 6.1 预研文档
- `v3/docs/CONTEXT_MENU_DESIGN.md` — 右键菜单设计探讨
- `v3/docs/CONTEXT_MENU_FEASIBILITY.md` — 技术可行性报告
- `v3/docs/CONTEXT_MENU_RESEARCH_SUMMARY.md` — 预研总结

### 6.2 Demo 文件
- `v3/docs/demo_context_menu.html` — Context Menu 技术验证 Demo

### 6.3 集成文件
- `v3/docs/kline_viewer.html` — 主应用（已集成右键菜单）

---

## 七、总结

### 7.1 核心成果

✅ **右键菜单基础设施已完成**  
✅ **空白区域菜单可用（刷新数据功能）**  
✅ **所有交互测试通过**  
✅ **代码质量良好，易于扩展**

### 7.2 技术验证

- ✅ 纯 HTML/CSS/JS 实现可行
- ✅ 性能优秀，无卡顿
- ✅ 用户体验良好
- ✅ 边界检测准确
- ✅ 与现有功能兼容

### 7.3 下一步行动
1. ✅ 完成阶段 1：基础设施（已完成）
2. ⏳ 实现阶段 2：PDA 点击检测和菜单（下一步）
3. ⏳ 实现阶段 3：高级功能（可选）

---

**集成完成时间**：2026-05-13  
**集成结论**：✅ **阶段 1 完成，测试完美，可以继续下一阶段**
