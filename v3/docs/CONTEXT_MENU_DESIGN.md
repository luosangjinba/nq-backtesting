# 右键菜单设计探讨

> **时间**：2026-05-12  
> **背景**：用户提到更喜欢辐射菜单（Blender）或块状菜单（Photoshop）的交互方式

---

## 💡 用户偏好

**辐射菜单（Radial Menu）**：
- 参考：Blender 的右键菜单
- 特点：选项围绕鼠标位置呈圆形分布
- 优点：
  - 鼠标移动距离短（所有选项距离相等）
  - 视觉上更直观（方向感强）
  - 适合触摸屏操作
  - 美观、现代

**块状菜单（Contextual Panel）**：
- 参考：Photoshop 的右键菜单
- 特点：分组的块状面板，带图标和描述
- 优点：
  - 信息密度高（可显示图标、标题、描述）
  - 分组清晰（相关功能聚合）
  - 易于扫描（视觉层次分明）

---

## 🎯 应用场景

### 场景 1：PDA 右键菜单

**当前需求**：点击 PDA 后的操作菜单

**可能的选项：**
- 查看详情
- 编辑（仅 Manual PDA）
- 删除（仅 Manual PDA）
- 定位到此 PDA
- 复制 PDA ID
- 导出为 YAML

**辐射菜单布局示意：**
```
        查看详情
        |
   编辑 -- [PDA] -- 删除
           |
        定位
```

**块状菜单布局示意：**
```
┌───────────────────┐
│ 📋 查看详情          │
│ 📍 定位到此 PDA      │
├─────────────────────┤
│ ✏️  编辑 (Manual)    │
│ 🗑️  删除 (Manual)    │
├───────────────┤
│ 📄 复制 ID           │
│ 💾 导出 YAML         │
└───────────────────┘
```
---

### 场景 2：图表空白区域右键菜单

**可能的选项：**
- 新建 Manual PDA
- 刷新数据
- 导出图表
- 设置

**辐射菜单布局示意：**
```
      新建 PDA
          |
  刷新 -- [·] -- 导出
          |
        设置
```

---

## 🛠️ 实现复杂度评估

### 辐射菜单（Radial Menu）

**复杂度：中高**

**技术要点：**
1. **布局计算**：
   - 根据选项数量计算角度（360° / n）
   - 计算每个选项的坐标（极坐标转直角坐标）
   - 处理选项过多时的分层（内圈 + 外圈）

2. **交互逻辑**：
   - 鼠标移动时高亮对应扇区
   - 点击或拖动选择
   - 支持子菜单（嵌套辐射菜单）

3. **视觉效果**：
   - 扇形高亮
   - 动画过渡（展开/收起）
   - 图标 + 文字标签

**参考库：**
- [radial-menu](https://github.com/victorqribeiro/radialMenu) — 纯 JS 实现
- [wheelnav.js](http://wheelnavjs.softwaretailoring.net/) — 可定制的辐射菜单

**代码示例（简化版）：**
```javascript
class RadialMenu {
  constructor(x, y, options) {
    this.x = x;
    this.y = y;
    this.options = options; // [{label, icon, action}]
    this.radius = 80;
  }

  render(ctx) {
    const angleStep = (2 * Math.PI) / this.options.length;
    
    this.options.forEach((option, i) => {
      const angle = i * angleStep - Math.PI / 2; // 从顶部开始
      const x = this.x + Math.cos(angle) * this.radius;
    const y = this.y + Math.sin(angle) * this.radius;
      
    // 绘制扇形背景
      ctx.fillStyle = option.hovered ? '#2962ff' : '#1e222d';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, this.radius, angle - angleStep/2, angle + angleStep/2);
      ctx.fill();
      
      // 绘制图标和文字
      ctx.fillStyle = '#e0e3eb';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(option.label, x, y);
    });
  }

  handleClick(mouseX, mouseY) {
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const index = Math.floor((angle + Math.PI) / (2 * Math.PI) * this.options.length);
    
    if (index >= 0 && index < this.options.length) {
      this.options[index].action();
    }
  }
}
```

---

### 块状菜单（Contextual Panel）

**复杂度：中**

**技术要点：**
1. **布局**：
   - 固定宽度，自动高度
   - 分组（分隔线）
   - 图标 + 文字 + 描述（可选）

2. **交互逻辑**：
   - 鼠标悬停高亮
   - 点击执行
   - 禁用状态（灰色）

3. **视觉效果**：
   - 阴影和边框
   - 悬停动画
   - 图标对齐

**参考库：**
- [context-menu](https://github.com/callmenick/Custom-Context-Menu) — 纯 JS 实现
- 或直接用 HTML + CSS 实现（更简单）

**代码示例（HTML + CSS）：**
```html
<div class="context-menu" style="left: 100px; top: 200px;">
  <div class="menu-group">
    <div class="menu-item" onclick="viewDetails()">
      <span class="icon">📋</span>
      <span class="label">查看详情</span>
    </div>
    <div class="menu-item" onclick="locate()">
    <span class="icon">📍</span>
      <span class="label">定位到此 PDA</span>
    </div>
  </div>
  <div class="menu-divider"></div>
  <div class="menu-group">
    <div class="menu-item" onclick="edit()">
      <span class="icon">✏️</span>
      <span class="label">编辑</span>
    </div>
    <div class="menu-item danger" onclick="deletePda()">
      <span class="icon">🗑️</span>
      <span class="label">删除</span>
    </div>
  </div>
</div>
```

```css
.context-menu {
  position: absolute;
  background: #1e222d;
  border: 1px solid #2a2e39;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 200px;
  z-index: 1000;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #2a2e39;
}

.menu-item .icon {
  margin-right: 8px;
  font-size: 16px;
}

.menu-item .label {
  font-size: 13px;
  color: #e0e3eb;
}

.menu-item.danger:hover {
  background: #ef5350;
}

.menu-divider {
  height: 1px;
  background: #2a2e39;
  margin: 4px 0;
}
```

---

## 📊 对比总结

| 特性 | 辐射菜单 | 块状菜单 |
|------|---------|---------|
| 实现复杂度 | 中高 | 中 |
| 鼠标移动距离 | 短（等距） | 中（垂直列表） |
| 信息密度 | 低（只有图标+标签） | 高（图标+标题+描述） |
| 视觉吸引力 | 高（新颖、现代） | 中（传统、熟悉） |
| 学习成本 | 中（需要适应） | 低（用户熟悉） |
| 适合场景 | 选项少（4-8个） | 选项多（可分组） |
| 触摸屏友好 | 高 | 中 |
| 子菜单支持 | 复杂（嵌套辐射） | 简单（侧边展开） |

---

## 🎯 建议
### 短期（阶段 1-3）

**采用块状菜单（HTML + CSS）**

**理由：**
1. **实现简单**：HTML + CSS 即可，无需复杂计算
2. **用户熟悉**：传统右键菜单，学习成本低
3. **信息丰富**：可显示图标、标题、描述、快捷键
4. **易于扩展**：添加新选项、分组、子菜单都很简单
5. **维护成本低**：标准 DOM 元素，调试方便

**实现方式：**
- 监听 `contextmenu` 事件（右键）
- 动态创建菜单 DOM 元素
- 根据点击位置（PDA / 空白区域）显示不同选项
- 点击菜单项执行对应操作
- 点击菜单外或按 ESC 关闭菜单

---

### 长期（v4 或独立优化）

**考虑辐射菜单作为可选交互方式**

**理由：**
1. **差异化体验**：提供更现代、更炫酷的交互
2. **效率提升**：对于熟练用户，辐射菜单更快
3. **可选配置**：在设置中提供"右键菜单样式"选项
   - 传统菜单（默认）
   - 辐射菜单（高级）

**实现建议：**
- 使用成熟的库（如 wheelnav.js）
- 或自己实现一个轻量版本
- 提供配置项让用户选择

---

## 📝 记录到技术债务

**标题**：探索辐射菜单（Radial Menu）作为右键菜单的替代方案

**优先级**：低（Nice to have）

**前置条件**：
- 阶段 1-3 完成
- 块状菜单已稳定运行
- 用户反馈需要更高效的交互方式

**预计工作量**：2-3 天

**参考资源**：
- Blender 辐射菜单交互设计
- wheelnav.js 库
- 本文档的实现示例

---
## 💬 用户反馈

> "我个人更喜欢右键弹出辐射菜单（类似 Blender）或块状菜单（类似 Photoshop）的那种。"

**记录时间**：2026-05-12  
**决策**：短期采用块状菜单，长期考虑辐射菜单作为可选项
