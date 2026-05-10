# 多 PDA 标注同时显示方案研究

## 当前实现分析

### 现状
- **单一预览变量**：`manualPreviewPda = null`（第 1143 行）
- **互斥显示**：`const overlayPda = manualPreviewPda || currentPda`（第 2034 行）
- **覆盖逻辑**：每次预览会覆盖之前的预览

### 限制
1. 只能预览一个 Manual PDA
2. Manual PDA 预览会覆盖 PDA List 选中的 Auto PDA
3. 无法对比多个 PDA 的位置关系

---

## 方案对比

### 方案 A：预览列表（推荐）

**核心思路**：将 `manualPreviewPda` 改为数组，支持多个预览

#### 数据结构
```javascript
// 当前
let manualPreviewPda = null;

// 改为
let manualPreviewPdas = [];  // 预览列表
```

#### 实现要点

**1. 添加到预览列表**
```javascript
function previewManualOverlay() {
  try {
    if (!chart || !lastCandleData?.length) throw new Error('请先加载图表数据');
    const newPda = buildPreviewPdaFromManualForm();
    
    // 检查是否已存在（基于时间和类型）
    const existingIndex = manualPreviewPdas.findIndex(p => 
      p.anchorTime === newPda.anchorTime && 
      p.pdaType === newPda.pdaType
    );
    
    if (existingIndex >= 0) {
      // 更新已存在的预览
      manualPreviewPdas[existingIndex] = newPda;
      toast('已更新预览', 'info');
    } else {
      // 添加新预览
      manualPreviewPdas.push(newPda);
      toast(`已添加预览（${manualPreviewPdas.length} 个）`, 'success');
    }
    
    renderPdaBadge(newPda);
    drawAllOverlays();
    updatePreviewButtonState();
  } catch (err) {
    toast(`预览失败: ${err.message}`, 'error');
  }
}
```

**2. 清除预览**
```javascript
function clearManualPreview() {
  if (manualPreviewPdas.length === 0) return;
  
  // 清除当前表单对应的预览
  const currentFormPda = buildPreviewPdaFromManualForm();
  const index = manualPreviewPdas.findIndex(p => 
    p.anchorTime === currentFormPda.anchorTime && 
    p.pdaType === currentFormPda.pdaType
  );
  
  if (index >= 0) {
    manualPreviewPdas.splice(index, 1);
    toast(`已清除预览（剩余 ${manualPreviewPdas.length} 个）`, 'info');
  }
  
  if (currentPda) renderPdaBadge(currentPda);
  else if (manualPreviewPdas.length > 0) renderPdaBadge(manualPreviewPdas[manualPreviewPdas.length - 1]);
  else renderPdaBadge(null);
  
  drawAllOverlays();
  updatePreviewButtonState();
}
```

**3. 清除所有预览**
```javascript
function clearAllManualPreviews() {
  if (manualPreviewPdas.length === 0) return;
  manualPreviewPdas = [];
  if (currentPda) renderPdaBadge(currentPda);
  else renderPdaBadge(null);
  drawAllOverlays();
  updatePreviewButtonState();
  toast('已清除所有预览', 'info');
}
```

**4. 绘制所有 Overlay**
```javascript
function drawAllOverlays() {
  if (!chart || !lastCandleData?.length) return;
  chart.removeOverlay({ groupId: OVERLAY_GROUP });

  const overlays = [];
  overlays.push(...buildSEOverlays(lastCandleData));
  
  // 绘制 Auto PDA（来自 PDA List）
  if (currentPda) {
    overlays.push(...buildPdaOverlays(currentPda, lastCandleData));
  }
  
  // 绘制所有 Manual PDA 预览
  for (const pda of manualPreviewPdas) {
    overlays.push(...buildPdaOverlays(pda, lastCandleData));
  }

  for (const ov of overlays) {
    ov.groupId = OVERLAY_GROUP;
    chart.createOverlay(ov);
  }
}
```

**5. 按钮状态更新**
```javascript
function updatePreviewButtonState() {
  const btn = document.getElementById('manualPreviewOverlayBtn');
  if (!btn) return;
  
  const currentFormPda = buildPreviewPdaFromManualForm();
  const isCurrentPreviewed = manualPreviewPdas.some(p => 
    p.anchorTime === currentFormPda.anchorTime && 
    p.pdaType === currentFormPda.pdaType
  );
  
  if (isCurrentPreviewed) {
    btn.textContent = '清除标注';
    btn.classList.add('btn-danger');
  } else {
    btn.textContent = '预览标注';
    btn.classList.remove('btn-danger');
  }
}
```

#### UI 增强

**1. 添加"清除所有预览"按钮**
```html
<div class="btn-row wrap">
  <button class="btn-sm" id="manualLocateChartBtn">按时间定位图表</button>
  <button class="btn-sm" id="manualPreviewOverlayBtn">预览标注</button>
  <button class="btn-sm" id="clearAllPreviewsBtn">清除所有预览</button>
  <button class="btn-sm primary" id="manualSaveBtn">保存 Manual PDA</button>
  <button class="btn-sm" id="manualResetBtn">重置</button>
</div>
```

**2. 显示预览计数**
```html
<div class="preview-status">
  <span id="previewCount">预览: 0 个</span>
</div>
```

**3. 预览列表（可选）**
```html
<details class="panel-section">
  <summary>预览列表 (<span id="previewListCount">0</span>)</summary>
  <div class="section-content">
    <div id="previewList" class="preview-list">
      <!-- 动态生成预览项 -->
  </div>
  </div>
</details>
```

#### 优点
- ✅ 支持多个 PDA 同时预览
- ✅ 可以对比不同 PDA 的位置关系
- ✅ 不影响 Auto PDA 显示（currentPda）
- ✅ 可以单独清除或全部清除
- ✅ 实现相对简单

#### 缺点
- ⚠️ 预览过多时图表可能拥挤
- ⚠️ 需要管理预览列表的状态
- ⚠️ 按钮状态判断稍复杂

---

### 方案 B：图层管理

**核心思路**：引入图层概念，每个 PDA 独立管理

#### 数据结构
```javascript
const pdaLayers = {
  auto: null,           // Auto PDA (from PDA List)
  manual: [],           // Manual PDA previews
  temporary: null       // Temporary preview (e.g., hover)
};
```

#### 实现要点

**1. 图层绘制**
```javascript
function drawAllOverlays() {
  if (!chart || !lastCandleData?.length) return;
  chart.removeOverlay({ groupId: OVERLAY_GROUP });

  const overlays = [];
  overlays.push(...buildSEOverlays(lastCandleData));
  
  // Layer 1: Auto PDA
  if (pdaLayers.auto) {
    overlays.push(...buildPdaOverlays(pdaLayers.auto, lastCandleData));
  }
  
  // Layer 2: Manual PDAs
  for (const pda of pdaLayers.manual) {
    overlays.push(...buildPdaOverlays(pda, lastCandleData));
  }
  
  // Layer 3: Temporary
  if (pdaLayers.temporary) {
    overlays.push(...buildPdaOverlays(pdaLayers.temporary, lastCandleData));
  }

  for (const ov of overlays) {
    ov.groupId = OVERLAY_GROUP;
    chart.createOverlay(ov);
  }
}
```

**2. 图层控制面板**
```html
<div class="layer-controls">
  <label><input type="checkbox" id="showAutoLayer" checked> Auto PDA</label>
  <label><input type="checkbox" id="showManualLayer" checked> Manual PDA</label>
  <label><input type="checkbox" id="showTempLayer"> Temporary</label>
</div>
```

#### 优点
- ✅ 清晰的图层概念
- ✅ 可以独立控制每个图层的显示/隐藏
- ✅ 扩展性好，可以添加更多图层类型

#### 缺点
- ⚠️ 实现复杂度较高
- ⚠️ 需要重构现有代码
- ⚠️ 可能过度设计（对当前需求）

---

### 方案 C：临时标注模式

**核心思路**：引入"标注模式"，在该模式下可以连续标注多个 PDA

#### 实现要点

**1. 模式切换**
```javascript
let annotationMode = false;
let annotations = [];

function toggleAnnotationMode() {
  annotationMode = !annotationMode;
  if (annotationMode) {
    toast('进入标注模式，右键标记 PDA 将自动添加到图表', 'info');
  } else {
    toast('退出标注模式', 'info');
  }
  updateAnnotationModeUI();
}
```

**2. 标注模式下的右键标记**
```javascript
function markPdaFromChart(pdaType) {
  // ... 现有逻辑 ...
  
  if (annotationMode) {
    // 标注模式：添加到列表，不填充表单
    const pda = buildPdaFromBar(bar, pdaType);
    annotations.push(pda);
    drawAllOverlays();
    toast(`已添加 ${pdaType.toUpperCase()}（${annotations.length} 个）`, 'success');
  } else {
    // 普通模式：填充表单并预览
    // ... 现有逻辑 ...
  }
}
```

**3. UI 控制**
```html
<div class="annotation-mode-controls">
  <button class="btn-sm" id="toggleAnnotationModeBtn">进入标注模式</button>
  <button class="btn-sm" id="clearAnnotationsBtn">清除所有标注</button>
  <span id="annotationCount">标注: 0 个</span>
</div>
```

#### 优点
- ✅ 适合连续标注多个 PDA
- ✅ 不干扰正常的表单编辑流程
- ✅ 模式切换清晰

#### 缺点
- ⚠️ 需要用户理解"模式"概念
- ⚠️ 增加了交互复杂度
- ⚠️ 标注模式下无法编辑 PDA 属性

---

## 推荐方案：方案 A（预览列表）

### 理由
1. **实现简单**：只需将单一变量改为数组
2. **向后兼容**：不破坏现有功能
3. **用户友好**：符合直觉，无需学习新概念
4. **灵活性好**：支持单独清除或全部清除

### 实施步骤

#### 阶段 1：核心功能（必须）
1. ✅ 将 `manualPreviewPda` 改为 `manualPreviewPdas = []`
2. ✅ 修改 `previewManualOverlay()` 支持添加到列表
3. ✅ 修改 `clearManualPreview()` 支持从列表移除
4. ✅ 修改 `drawAllOverlays()` 绘制所有预览
5. ✅ 添加 `clearAllManualPreviews()` 函数
6. ✅ 更新按钮状态判断逻辑

#### 阶段 2：UI 增强（推荐）
1. ✅ 添加"清除所有预览"按钮
2. ✅ 显示预览计数
3. ✅ 在 toast 消息中显示当前预览数量

#### 阶段 3：高级功能（可选）
1. ⏳ 预览列表面板（显示所有预览的 PDA）
2. ⏳ 单独删除预览列表中的某个 PDA
3. ⏳ 预览 PDA 的视觉区分（不同透明度或边框样式）
4. ⏳ 预览列表持久化（保存到 localStorage）

---

## 技术细节

### 去重逻辑
```javascript
function getPdaKey(pda) {
  // 基于时间和类型生成唯一键
  const time = pda.anchorTime || pda.extraFields?.start_time || '';
  const type = pda.pdaType || '';
  return `${type}_${time}`;
}

function isDuplicate(newPda, existingPdas) {
  const newKey = getPdaKey(newPda);
  return existingPdas.some(p => getPdaKey(p) === newKey);
}
```

### 性能优化
```javascript
// 限制最大预览数量
const MAX_PREVIEW_COUNT = 10;

function previewManualOverlay() {
  if (manualPreviewPdas.length >= MAX_PREVIEW_COUNT) {
    toast(`最多预览 ${MAX_PREVIEW_COUNT} 个 PDA`, 'warning');
    return;
  }
  // ... 添加预览逻辑 ...
}
```

### 视觉区分
```javascript
function buildPdaOverlays(pda, candleData, options = {}) {
  // ... 现有逻辑 ...
  
  // 为预览 PDA 添加视觉标识
  if (options.isPreview) {
    overlay.styles = {
      ...overlay.styles,
      opacity: 0.6,  // 半透明
      borderStyle: 'dashed'  // 虚线边框
    };
  }
  
  return overlays;
}
```

---

## 兼容性考虑

### 与现有功能的协调

**1. 与 PDA List 的关系**
- PDA List 选择 Auto PDA → 设置 `currentPda`
- Manual 预览 → 添加到 `manualPreviewPdas[]`
- 两者独立显示，互不干扰

**2. 与重置表单的关系**
```javascript
function resetManualForm() {
  panelEditingPdaId = null;
  // 不清除预览列表，只清除当前表单对应的预览
  clearManualPreview();
  // ... 其他重置逻辑 ...
}
```

**3. 与保存 Manual PDA 的关系**
```javascript
function saveManualPda() {
  // ... 保存逻辑 ...
  
  // 保存后清除当前预览
  clearManualPreview();
  
  // 或者：保存后保留预览
  // toast('已保存，预览保留', 'success');
}
```

---

## 测试场景

### 基础功能测试
1. ✅ 预览单个 PDA
2. ✅ 预览多个不同类型的 PDA（BSL + FVG + OB）
3. ✅ 预览多个相同类型的 PDA（多个 BSL）
4. ✅ 清除单个预览
5. ✅ 清除所有预览
6. ✅ 重置表单后预览状态

### 交互测试
1. ✅ 右键标记 → 自动预览 → 继续标记 → 多个预览
2. ✅ 修改表单 → 重新预览 → 更新已有预览
3. ✅ 切换 PDA 类型 → 预览 → 不同类型同时显示
4. ✅ 与 PDA List 交互 → Auto PDA + Manual PDA 同时显示

### 边界测试
1. ✅ 预览数量达到上限
2. ✅ 预览相同时间和类型的 PDA（去重）
3. ✅ 图表数据未加载时预览
4. ✅ 切换时间周期后预览状态

---

## 未来扩展

### 预览组管理
```javascript
const previewGroups = {
  'group1': [pda1, pda2, pda3],
  'group2': [pda4, pda5]
};

function savePreviewGroup(name) {
  previewGroups[name] = [...manualPreviewPdas];
  toast(`已保存预览组: ${name}`, 'success');
}

function loadPreviewGroup(name) {
  manualPreviewPdas = [...previewGroups[name]];
  drawAllOverlays();
  toast(`已加载预览组: ${name}`, 'success');
}
```

### 预览快照
```javascript
function takePreviewSnapshot() {
  const snapshot = {
    timestamp: Date.now(),
    pdas: [...manualPreviewPdas],
    chartState: {
      timeframe: document.getElementById('tfSelect').value,
    dateRange: { from: ..., to: ... }
    }
  };
  localStorage.setItem('preview_snapshot', JSON.stringify(snapshot));
}
```

---

**更新时间**: 2026-05-09  
**状态**: 方案研究完成，待实施
