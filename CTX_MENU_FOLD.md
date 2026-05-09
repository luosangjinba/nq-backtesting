# 右键菜单悬浮子菜单功能

## 功能说明
将图表右键菜单中的4个"标记"类型菜单项（BSL、SSL、FVG、OB）折叠到一个悬浮子菜单中，鼠标悬停在"标记 PDA"上时在右侧显示子菜单。

## 实现方案

### 1. UI结构
```
右键菜单
├── 复制当前时间
└── 标记 PDA ▶  ───→  [悬浮子菜单]
                      ├── BSL
                      ├── SSL
                      ├── FVG
                      └── OB
```

### 2. CSS样式
- **父菜单项标识**：`.has-submenu` 类，右侧显示 `▶` 箭头
- **子菜单容器**：`.ctx-submenu` 类
  - 绝对定位：`position: absolute`
  - 位置：`left: 100%`（父菜单右侧），`top: -5px`（与父菜单顶部对齐）
  - 默认 `display: none` 隐藏
  - 父菜单悬停时显示：`.has-submenu:hover .ctx-submenu { display: block; }`
  - 独立的背景和边框，视觉上是独立的浮动面板

### 3. 交互逻辑
- **鼠标悬停父菜单项**：自动在右侧显示子菜单
- **鼠标移出父菜单项**：子菜单自动隐藏
- **点击子菜单项**：执行标记操作，关闭整个菜单
- **点击菜单外部**：关闭整个菜单
- **按ESC键**：关闭整个菜单

### 4. 代码修改

#### HTML结构（第793-804行）
```html
<div class="ctx-menu" id="ctxMenu">
  <div class="ctx-menu-item" id="ctxCopyTime">复制当前时间</div>
  <div class="ctx-menu-item has-submenu" id="ctxMarkPda">
    标记 PDA
    <div class="ctx-submenu" id="ctxMarkSubmenu">
      <div class="ctx-menu-item" id="ctxMarkBsl">BSL</div>
      <div class="ctx-menu-item" id="ctxMarkSsl">SSL</div>
      <div class="ctx-menu-item" id="ctxMarkFvg">FVG</div>
      <div class="ctx-menu-item" id="ctxMarkOb">OB</div>
    </div>
  </div>
</div>
```

**关键点**：子菜单容器嵌套在父菜单项内部，这样CSS的 `:hover` 选择器才能生效。

#### CSS样式（第714-756行）
```css
.ctx-menu-item.has-submenu::after {
  content: '▶';
  position: absolute;
  right: 10px;
  font-size: 0.7rem;
}
.ctx-submenu {
  position: absolute;
  left: 100%;
  top: -5px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  display: none;
  z-index: 101;
}
.ctx-menu-item.has-submenu:hover .ctx-submenu {
  display: block;
}
.ctx-submenu .ctx-menu-item {
  padding: 5px 14px;
  font-size: 0.8rem;
}
```

**关键点**：
- 子菜单使用绝对定位，相对于父菜单项定位
- `left: 100%` 使子菜单出现在父菜单右侧
- `top: -5px` 微调垂直位置，使子菜单顶部与父菜单项对齐
- `:hover` 伪类自动控制显示/隐藏，无需JavaScript

#### JavaScript逻辑（第3279-3297行）
```javascript
function hideCtxMenu() {
  ctxMenu.style.display = 'none';
}

document.getElementById('chartContainer').addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (!chart || crosshairBarIndex < 0) return;
  
  if (e.shiftKey && obSelectionState) {
    completeObSelection();
    return;
  }
  
  showCtxMenu(e.clientX, e.clientY);
});

document.addEventListener('click', hideCtxMenu);
```

**简化说明**：移除了之前的点击展开逻辑，完全依赖CSS的hover效果。

## 测试步骤

1. 打开浏览器访问 http://127.0.0.1:8000/v2/docs/kline_viewer.html

2. 加载数据并在图表上右键点击

3. 验证菜单结构：
   - 应该看到"复制当前时间"和"标记 PDA ▶"两个菜单项
   - 子菜单默认不可见

4. 鼠标悬停在"标记 PDA"上：
   - 子菜单应该立即在右侧弹出
   - 子菜单应该显示BSL、SSL、FVG、OB四个选项
   - 子菜单应该有独立的背景和边框

5. 鼠标移出"标记 PDA"：
   - 子菜单应该立即隐藏

6. 悬停并点击子菜单中的"BSL"：
   - 应该执行标记操作
   - 整个菜单应该关闭
   - Manual PDA面板应该自动填充数据

7. 点击菜单外部或按ESC键：
   - 整个菜单应该关闭

## 优势

1. **直观性**：符合传统桌面应用的菜单交互习惯
2. **响应速度**：纯CSS实现，无JavaScript延迟
3. **简洁性**：减少菜单项数量，避免菜单过长
4. **空间利用**：子菜单悬浮显示，不占用主菜单空间
5. **可扩展性**：未来可以继续添加更多子菜单层级

## 技术细节

### CSS定位
- **父菜单项**：`position: relative`（隐式，因为是菜单项）
- **子菜单**：`position: absolute`，相对于父菜单项定位
- **z-index**：子菜单(101) > 主菜单(100)，确保子菜单在上层

### 悬停区域
- 子菜单嵌套在父菜单项内部，鼠标移到子菜单上时仍然保持父菜单的 `:hover` 状态
- 这样可以在子菜单上移动鼠标而不会导致子菜单消失

### 位置微调
- `top: -5px`：向上偏移5px，使子菜单顶部与父菜单项顶部对齐
- 如果子菜单超出屏幕右侧，可以添加JavaScript动态调整位置（当前未实现）

### 性能
- 纯CSS实现，无JavaScript事件监听开销
- 浏览器原生的 `:hover` 处理，性能最优

## 与之前实现的对比

| 特性 | 之前（下拉展开） | 现在（右侧悬浮） |
|------|-----------------|-----------------|
| 触发方式 | 点击 | 悬停 |
| 显示位置 | 父菜单下方 | 父菜单右侧 |
| 动画效果 | 高度展开动画 | 立即显示 |
| 实现方式 | JavaScript + CSS | 纯CSS |
| 空间占用 | 占用主菜单空间 | 独立悬浮 |
| 交互习惯 | 移动端风格 | 桌面端风格 |

现在的实现更符合传统桌面应用的菜单交互模式，用户体验更直观。
