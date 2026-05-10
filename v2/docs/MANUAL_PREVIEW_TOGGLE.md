# Manual PDA 预览标注功能更新

## 更新时间
2026-05-09

## 功能说明

Manual PDA 工作台的"预览标注"按钮现在支持**状态切换**，可以在预览和清除之间切换。

## 交互方式

### 初始状态
- 按钮显示：**预览标注**
- 按钮样式：默认样式（灰色背景）
- 图表状态：无 Manual PDA 标注

### 点击预览
1. 按钮文字变为：**清除标注**
2. 按钮样式变为：红色边框和文字（danger 样式）
3. 图表上显示：Manual PDA 的标注（BSL/SSL 点或 FVG/OB 矩形）
4. 图表位置：**保持不变**（不自动定位到 PDA）
5. 提示消息：`已预览 Manual overlay`

### 点击清除
1. 按钮文字恢复为：**预览标注**
2. 按钮样式恢复为：默认样式
3. 图表上移除：Manual PDA 标注
4. 提示消息：`已清除预览标注`

## 使用场景

### 场景 1：验证 Manual PDA 数据
```
1. 填写 Manual PDA 表单（类型、时间、价格等）
2. 点击"预览标注" → 在图表上查看标注位置
3. 如果位置正确 → 点击"保存 Manual PDA"
4. 如果位置不对 → 点击"清除标注"，修改表单，重新预览
```

### 场景 2：对比多个 PDA
```
1. 预览第一个 Manual PDA
2. 点击"清除标注"
3. 修改表单为第二个 PDA
4. 点击"预览标注"
5. 对比两个位置，选择合适的
```

### 场景 3：与 Auto PDA 对比
```
1. 在 PDA List 中选择一个 Auto PDA（图表上显示）
2. 填写 Manual PDA 表单
3. 点击"预览标注" → Manual PDA 叠加显示
4. 对比 Auto 和 Manual 的位置差异
5. 点击"清除标注"恢复到只显示 Auto PDA
```

## 自动清除

以下操作会自动清除预览标注并恢复按钮状态：

1. **点击"重置"按钮** - 清空表单并清除预览
2. **切换 PDA 类型** - 更新字段状态时清除预览（如果实现）
3. **保存 Manual PDA** - 保存后清除预览（如果实现）

## 技术实现

### 核心函数

```javascript
// 切换预览状态（主入口）
function toggleManualPreview() {
  if (manualPreviewPda) {
    clearManualPreview();
  } else {
    previewManualOverlay();
  }
}

// 显示预览
function previewManualOverlay() {
  // 构建预览 PDA 对象
  // 渲染到图表
  // 不自动定位图表（保持当前视图）
  // 更新按钮状态
  updatePreviewButtonState();
}

// 清除预览
function clearManualPreview() {
  // 清除 manualPreviewPda 变量
  // 重绘图表
  // 更新按钮状态
  updatePreviewButtonState();
}

// 更新按钮状态
function updatePreviewButtonState() {
  const btn = document.getElementById('manualPreviewOverlayBtn');
  if (manualPreviewPda) {
    btn.textContent = '清除标注';
    btn.classList.add('btn-danger');
  } else {
    btn.textContent = '预览标注';
    btn.classList.remove('btn-danger');
  }
}
```

### 状态变量

- `manualPreviewPda` - 存储当前预览的 Manual PDA 对象
  - `null` = 无预览
  - `object` = 有预览

### CSS 样式

```css
.btn-danger {
  border-color: #8b3a3a;
  color: #e07070;
}
.btn-danger:hover {
  background: #8b3a3a;
  color: #fff;
}
```

## 与其他功能的协调

### 与 PDA List 的关系
- PDA List 选择 Auto PDA → 设置 `currentPda`
- Manual 预览 → 设置 `manualPreviewPda`
- 两者可以同时存在，叠加显示

### 与匹配合并的关系
- 预览 Manual PDA 后，可以点击"生成预览"进行匹配
- 匹配结果不影响预览状态
- 清除预览不影响匹配结果

### 与图表定位的关系
- "按时间定位图表" - 定位到指定时间，不预览标注
- "预览标注" - 在当前视图显示标注，**不改变图表位置**
- 如需定位 + 预览：先点击"按时间定位图表"，再点击"预览标注"

## 未来增强（可选）

1. **批量清除** - 在 Manual PDA List 顶部增加"清除所有预览"按钮
2. **预览列表** - 支持同时预览多个 Manual PDA
3. **预览样式** - 区分 Manual 预览和 Auto PDA 的视觉样式
4. **快捷键** - 支持键盘快捷键切换预览（如 `P` 键）

## 测试检查清单

- [ ] 初始状态：按钮显示"预览标注"
- [ ] 点击预览：按钮变为"清除标注"（红色）
- [ ] 点击清除：按钮恢复"预览标注"（默认）
- [ ] BSL/SSL 预览：显示点标注
- [ ] FVG/OB 预览：显示矩形标注
- [ ] 重置表单：自动清除预览
- [ ] 与 Auto PDA 叠加：两者同时显示
- [ ] 错误处理：表单数据不完整时提示错误

---

**实现方案**：方案 B（单按钮状态切换）  
**优势**：节省空间、状态清晰、符合交互直觉  
**状态**：✅ 已实现
