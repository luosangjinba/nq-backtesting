# V3 开发会话 - 2026-05-15 PDA 表单侧边栏实现

## 会话信息

- **日期：** 2026-05-15 下午
- **时长：** ~2 小时
- **主要目标：** 参考 demo_02_sidebar_layout.html 实现 PDA 录入表单侧边栏
- **模型：** Claude Opus 4.7
- **分支：** `feature/chart-display-control`

---

## 一、背景

### 1.1 起点状态

**提交：** `aa2d7e0` - 禁用 PDA 显示 & 启用空白区域右键菜单

**已完成功能：**
- K 线回放基础功能
- 空白区域右键菜单（占位符 alert）
- 获取点击位置的图表坐标

**待实现：**
- PDA 录入表单 UI
- 表单验证和自动填充
- 与右键菜单集成

### 1.2 用户需求

> "参考 demo_02_sidebar_layout.html 的方式添加侧边栏"

**关键要求：**
- 使用 flex 布局，避免遮挡价格刻度
- 侧边栏使用 margin-right 负值折叠（而非 transform）
- 图表自动调整大小

---

## 二、实施过程

### 2.1 回退到干净状态

**问题：** 之前的实现（侧边栏 + 弹窗模式）过于复杂，且有模块导入错误

**操作：**
```bash
git reset --hard aa2d7e0
```

**结果：** 回退到添加侧边栏前的版本，只保留右键菜单基础功能

### 2.2 参考 demo 实现侧边栏

**参考文件：** `v3/docs/demo_02_sidebar_layout.html`

**关键设计：**
1. **Flex 布局：** `.main-content { display: flex; }`
2. **侧边栏折叠：** `margin-right: calc(-1 * var(--sidebar-width))`
3. **图表自适应：** `#chart { flex: 1; min-width: 0; }`
4. **ResizeObserver：** 监听容器大小变化

### 2.3 HTML 结构修改

**修改文件：** `v3/docs/kline_viewer.html`

**变更：**
```html
<!-- 修改前 -->
<div id="chart"></div>
<div id="replayControls">...</div>

<!-- 修改后 -->
<div class="main-content">
  <div id="chart"></div>
  
  <div class="sidebar collapsed" id="pdaFormSidebar">
    <div class="sidebar-header">...</div>
    <div class="sidebar-body">
      <!-- FVG 字段 -->
      <div id="fvgFields">...</div>
      <!-- BSL/SSL 字段 -->
      <div id="bslSslFields">...</div>
      <!-- 备注 -->
      <textarea id="formNotes">...</textarea>
      <!-- 操作按钮 -->
    <div class="form-actions">...</div>
    </div>
  </div>
</div>

<div id="replayControls">...</div>
```

**关键点：**
- 侧边栏默认折叠（`.collapsed` 类）
- 表单字段根据 PDA 类型动态显示/隐藏
- 错误提示元素（`.form-error`）

### 2.4 CSS 样式添加

**修改文件：** `v3/styles/kline_viewer.css`

**新增样式：**
```css
:root {
  --sidebar-width: 400px;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

#chart {
  flex: 1;
  min-width: 0;
  position: relative;
}

.sidebar {
  width: var(--sidebar-width);
  margin-right: 0;
  transition: margin-right 0.3s ease;
}

.sidebar.collapsed {
  margin-right: calc(-1 * var(--sidebar-width));
}
```

**表单样式：**
- `.form-group` - 表单字段容器
- `.form-input` - 输入框样式
- `.form-error` - 错误提示（默认隐藏，`.visible` 时显示）
- `.form-btn` - 操作按钮

### 2.5 JS 模块创建

**新建文件：** `v3/modules/pda-form.js`

**核心功能：**

1. **显示/隐藏侧边栏**
```javascript
export function showPdaForm(options) {
  const { pdaType, timeframe, autoFill = {} } = options;
  // 设置标题、切换字段、填充数据
  sidebar.classList.remove('collapsed');
}

export function hidePdaForm() {
  sidebar.classList.add('collapsed');
}
```

2. **表单验证**
```javascript
function validateForm() {
  clearErrors();
  // 验证必填字段
  // 验证价格范围（FVG）
  // 返回表单数据或 null
}
```

3. **自动填充**
```javascript
function fillBslSslFields(autoFill) {
  formBslSslTime.value = autoFill.time || '';
  formBslSslPrice.value = autoFill.price || '';
}
```

4. **时间格式化**
```javascript
const timeInputs = [formFvgStartTime, formFvgEndTime, formBslSslTime];
timeInputs.forEach((input) => {
  input.addEventListener('blur', (e) => {
    const formatted = formatTimeInput(e.target.value);
    if (formatted !== e.target.value) {
      e.target.value = formatted;
    }
  });
});
```

### 2.6 右键菜单集成

**修改文件：** `v3/modules/context-menu.js`

**变更：** 添加回调参数
```javascript
// 修改前
export function showBlankAreaMenu(x, y, chartCoordinates) {
  // ...
  alert('手动添加 FVG 功能待实现');
}

// 修改后
export function showBlankAreaMenu(x, y, chartCoordinates, onAddPda) {
  // ...
  if (onAddPda) onAddPda('fvg', chartCoordinates);
}
```

**修改文件：** `v3/docs/kline_viewer.html`

**新增函数：**
```javascript
function handleAddPda(pdaType, chartCoordinates) {
  const tfSelect = document.getElementById('tfSelect');
  const timeframe = parseInt(tfSelect.value);
  
  const autoFill = {};
  if (pdaType === 'bsl' || pdaType === 'ssl') {
    const time = new Date(chartCoordinates.time * 1000);
    autoFill.time = time.toISOString().slice(0, 16).replace('T', ' ');
    autoFill.price = chartCoordinates.price.toFixed(2);
  }
  
  showPdaForm({ pdaType, timeframe, autoFill });
}

function savePda(formData) {
  console.log('[保存 PDA]', formData);
  alert('保存功能待实现:\n' + JSON.stringify(formData, null, 2));
  hidePdaForm();
}

setOnSaveCallback(savePda);
```

**调用修改：**
```javascript
showBlankAreaMenu(e.clientX, e.clientY, chartCoordinates, handleAddPda);
```

---

## 三、问题修复

### 3.1 问题：侧边栏遮挡价格刻度

**现象：**
- 侧边栏展开时，图表不会自动缩小
- 价格刻度被侧边栏遮挡

**原因：**
- 只监听了 `window.resize`
- 未监听图表容器本身的大小变化
- 侧边栏展开/折叠时，window 大小不变，图表不会调整

**修复：** 添加 ResizeObserver

**修改文件：** `v3/modules/chart.js`

```javascript
// 监听容器大小变化（侧边栏展开/折叠时）
const resizeObserver = new ResizeObserver(() => {
  state.chart.applyOptions({
    width: container.clientWidth,
    height: container.clientHeight,
  });
});
resizeObserver.observe(container);
```

**效果：**
- 侧边栏展开时，图表自动缩小
- 侧边栏折叠时，图表自动扩大
- 价格刻度始终可见

---

## 四、提交记录

### 4.1 主要提交

**提交 1：** `eff7c78` - feat(pda-form): 参考 demo 添加 PDA 表单侧边栏

**变更文件：**
- `v3/docs/kline_viewer.html` - HTML 结构（+130 行）
- `v3/styles/kline_viewer.css` - 侧边栏样式（+186 行）
- `v3/modules/pda-form.js` - 表单模块（新建，285 行）
- `v3/modules/context-menu.js` - 添加回调参数（+3 行）

**功能：**
- Flex 布局侧边栏
- 表单字段切换（FVG/BSL/SSL）
- 表单验证
- 自动填充
- 时间格式化
- 右键菜单集成

**提交 2：** `f63af9b` - fix(chart): 添加 ResizeObserver 监听容器大小变化

**变更文件：**
- `v3/modules/chart.js` - 添加 ResizeObserver（+9 行）

**修复：**
- 侧边栏展开/折叠时图表自动调整大小
- 价格刻度不被遮挡

---

## 五、功能验证

### 5.1 测试步骤

1. **打开页面**
   - URL: `http://127.0.0.1:8000/v3/docs/kline_viewer.html?start=2012-01-09%2000:00&end=2012-01-15%2000:00&tf=60`
   - 强制刷新：`Ctrl+Shift+R`

2. **测试右键菜单**
   - 右键点击图表空白区域
   - 应显示菜单：手动添加 FVG/BSL/SSL

3. **测试侧边栏展开**
   - 点击"手动添加 BSL"
   - 侧边栏从右侧滑入
   - 图表自动缩小，价格刻度可见

4. **测试自动填充**
   - 时间字段：自动填充点击位置的时间
   - 价格字段：自动填充点击位置的价格

5. **测试时间格式化**
   - 在时间输入框中输入 `20120109`
   - 点击其他地方（触发 blur 事件）
   - 应自动格式化为 `2012-01-09 00:00`

6. **测试侧边栏折叠**
   - 点击关闭按钮（×）或按 ESC 键
   - 侧边栏滑出
   - 图表自动扩大

7. **测试表单验证**
   - 清空必填字段，点击"保存"
   - 应显示错误提示

### 5.2 验证结果

✅ **侧边栏展开/折叠动画流畅**  
✅ **图表自动调整大小，价格刻度不被遮挡**  
✅ **自动填充功能正常**  
✅ **时间格式化功能正常**  
✅ **表单验证功能正常**  
✅ **ESC 键关闭侧边栏**

---

## 六、技术总结

### 6.1 Flex 布局侧边栏的关键点

1. **容器设置**
   ```css
   .main-content {
     display: flex;
     flex: 1;
     overflow: hidden;
   }
   ```

2. **图表自适应**
   ```css
   #chart {
     flex: 1;
     min-width: 0;  /* 关键：允许 flex 子元素缩小到内容宽度以下 */
   }
   ```

3. **侧边栏折叠**
   ```css
   .sidebar {
     margin-right: 0;
     transition: margin-right 0.3s ease;
   }
   
   .sidebar.collapsed {
   margin-right: calc(-1 * var(--sidebar-width));
   }
   ```

4. **图表 resize**
   ```javascript
   const resizeObserver = new ResizeObserver(() => {
     chart.applyOptions({
    width: container.clientWidth,
       height: container.clientHeight,
     });
   });
   resizeObserver.observe(container);
   ```

### 6.2 为什么使用 margin-right 而非 transform

**transform 方案的问题：**
- 侧边栏视觉上移出，但仍占据布局空间
- 图表容器宽度不变，无法触发 resize
- 需要手动计算并调整图表宽度

**margin-right 方案的优势：**
- 侧边栏真正移出布局流
- 图表容器自动扩大/缩小
- ResizeObserver 自动触发，无需手动计算

### 6.3 时间格式化的实现

**工具函数：** `formatTimeInput(value)` in `utils.js`

**支持格式：**
- 8 位数字 → `YYYY-MM-DD 00:00`
- 12 位数字 → `YYYY-MM-DD HH:mm`

**触发时机：** `blur` 事件（失焦时）

**优势：**
- 用户输入简洁（只需输入数字）
- 自动补全标准格式
- 后端 API 可直接识别

---
## 七、待完成工作

### 7.1 阶段 2 剩余任务

**任务 #2：FVG 自动识别逻辑** - ⏸ 待开始
- [ ] 获取点击位置的 K 线索引
- [ ] 检查前后 3 根 K 线是否形成 FVG
- [ ] 自动填充起始时间、结束时间、上边界、下边界
- [ ] 识别失败时提示用户手动输入

**任务 #3：验证 API 端点** - ⏸ 待开始
- [ ] 检查 `POST /v2/pda_manual_add` 端点是否存在
- [ ] 验证请求参数格式
- [ ] 测试保存功能

**任务 #4：刷新图表显示新 PDA** - ⏸ 待开始
- [ ] 保存成功后重新加载 PDA 数据
- [ ] 或直接在前端添加新 PDA 到 `state.pdaRecords`
- [ ] 调用 PDA 渲染函数显示新标记

### 7.2 后续优化

- [ ] 添加加载状态（保存时显示 spinner）
- [ ] 添加成功/失败提示（toast 通知）
- [ ] 支持编辑已有 PDA（右键点击 PDA 标记）
- [ ] 支持删除 PDA

---

## 八、文件清单

### 8.1 新增文件

- `v3/modules/pda-form.js` - PDA 表单模块（285 行）
- `v3/sessions/session_20260515_pda_form_sidebar.md` - 本会话记录

### 8.2 修改文件

- `v3/docs/kline_viewer.html` - HTML 结构 + 回调函数（+130 行）
- `v3/styles/kline_viewer.css` - 侧边栏样式（+186 行）
- `v3/modules/context-menu.js` - 添加回调参数（+3 行）
- `v3/modules/chart.js` - 添加 ResizeObserver（+9 行）

---

## 九、参考资料

- [demo_02_sidebar_layout.html](../docs/demo_02_sidebar_layout.html) - 侧边栏布局 demo
- [PLAN_PDA_WORKBENCH.md](../docs/PLAN_PDA_WORKBENCH.md) - PDA 工作台方案规划
- [HANDOFF_20260515.md](./HANDOFF_20260515.md) - 工作交接文档

---

**会话完成时间：** 2026-05-15 下午
