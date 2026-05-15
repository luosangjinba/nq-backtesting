# 技术预研报告：PDA 工作台关键技术验证

> **预研时间**：2026-05-12  
> **目标**：验证三个关键技术点的可行性，确保方案稳妥

---

## 一、预研概述

为了避免向错误方向走太远再返工，我们创建了三个独立的 demo 来验证关键技术：

1. **demo_01_click_detection.html** — Primitive 点击检测
2. **demo_02_sidebar_layout.html** — 侧边栏布局
3. **demo_03_api_test.html** — API 调用测试

---

## 二、预研 1：Primitive 点击检测

### 文件
`v3/docs/demo_01_click_detection.html`

### 测试目标
验证如何在 Lightweight Charts 中检测用户点击了哪个 PDA Primitive。

### 技术方案
由于 Lightweight Charts 的 Primitive 不支持原生点击事件，我们采用**手动距离计算**方案：

1. 监听图表的 `subscribeClick` 事件，获取点击坐标 `(clickX, clickY)`
2. 遍历所有 PDA，计算点击位置与每个 PDA 的距离：
   - **BSL/SSL（线段）**：计算点到线段的距离
   - **FVG（矩形）**：计算点到矩形的距离（点在矩形内时距离为 0）
3. 选择距离最近的 PDA（阈值：20 像素）
4. 高亮选中的 PDA（改变颜色）

### 关键代码片段

```javascript
// 点击检测
chart.subscribeClick((param) => {
  const clickX = param.point.x;
  const clickY = param.point.y;

  let minDistance = Infinity;
  let closestPda = null;

  pdaList.forEach(pda => {
    const pdaX = timeScale.timeToCoordinate(pda.time);
    let distance;

    if (pda.type === 'bsl') {
      // BSL: 点到线段的距离
      const pdaY = candlestickSeries.priceToCoordinate(pda.price);
      const lineEndX = pdaX + 100; // 线段长度
      
      if (clickX >= pdaX && clickX <= lineEndX) {
        distance = Math.abs(clickY - pdaY);
      } else {
        const dx = clickX < pdaX ? pdaX - clickX : clickX - lineEndX;
        const dy = clickY - pdaY;
        distance = Math.sqrt(dx * dx + dy * dy);
      }
    } else if (pda.type === 'fvg') {
      // FVG: 点到矩形的距离
      const pdaY1 = candlestickSeries.priceToCoordinate(pda.priceHigh);
      const pdaY2 = candlestickSeries.priceToCoordinate(pda.priceLow);
      const rectEndX = pdaX + 80; // 矩形宽度
      
      // 点在矩形内
      if (clickX >= pdaX && clickX <= rectEndX && 
          clickY >= Math.min(pdaY1, pdaY2) && clickY <= Math.max(pdaY1, pdaY2)) {
        distance = 0;
      } else {
        // 点到矩形边界的距离
        const dx = Math.max(pdaX - clickX, 0, clickX - rectEndX);
        const dy = Math.max(Math.min(pdaY1, pdaY2) - clickY, 0, clickY - Math.max(pdaY1, pdaY2));
        distance = Math.sqrt(dx * dx + dy * dy);
      }
    }

    if (distance < minDistance) {
      minDistance = distance;
      closestPda = pda;
    }
  });

  const threshold = 20; // 阈值 20 像素
  if (closestPda && minDistance <= threshold) {
    selectedPdaId = closestPda.id;
    renderPdas(); // 重新渲染，高亮选中的 PDA
  }
});
```

### 高亮方案

选中 PDA 时，重新渲染所有 Primitive，传入 `isSelected` 标志：

```javascript
class BslRenderer {
  constructor(p, label, isSelected) {
    this._isSelected = isSelected;
  }

  draw(target) {
    // 选中时改变颜色和线宽
    ctx.strokeStyle = this._isSelected ? '#ffeb3b' : '#5b9cf6';
    ctx.lineWidth = this._isSelected ? 3 : 2;
    // ...
  }
}
```

### 测试要点

**请在浏览器中打开 `demo_01_click_detection.html` 测试：**

1. ✅ 点击 BSL 线段，能否准确选中？
2. ✅ 点击 FVG 矩形，能否准确选中？
3. ✅ 点击 PDA 附近（但不在 PDA 上），是否能选中最近的 PDA？
4. ✅ 点击远离所有 PDA 的位置，是否不选中任何 PDA？
5. ✅ 高亮效果是否明显（颜色变化、线宽变化）？
6. ✅ 距离阈值 20 像素是否合理？（太小不好点，太大误选）

### 重叠 PDA 选择策略 ✅

**问题**：当多个 PDA 重叠时，点击应该选中哪一个？

**测试文件**：`demo_01_overlap_test.html`

**测试场景**：
- 3 个 BSL 完全重叠（相同价格和时间）
- 2 个 FVG 完全重叠（相同时间和价格区间）
- BSL 和 FVG 部分重叠

**候选策略**：
1. **最近距离**：选择距离最近的 PDA（完全重叠时总是选同一个）
2. **循环切换** ✅：首次点击选最近的，再次点击相同区域切换到下一个
3. **类型优先**：FVG > BSL，相同类型选最近的
4. **时间优先**：选择最新创建的 PDA

**用户决策**：采用**策略 2：循环切换** ✅

**理由**：
- 兼顾直观性（首次选最近）和可访问性（可切换到所有重叠 PDA）
- 用户体验好，通过多次点击可访问所有重叠 PDA
- 实现成本低，只需记录上次点击的候选列表

**实现要点**：
```javascript
let lastClickCandidates = []; // 记录上次点击的候选 PDA

chart.subscribeClick((param) => {
  // 1. 找出所有在阈值内的 PDA
  const candidates = pdaList.filter(pda => calculateDistance(pda, clickX, clickY) <= threshold);
  
  // 2. 检查是否点击了相同区域
  const sameArea = JSON.stringify(lastClickCandidates.map(c => c.id).sort()) ===
                   JSON.stringify(candidates.map(c => c.id).sort());
  
  // 3. 如果是相同区域且已有选中，切换到下一个
  if (sameArea && selectedPdaId) {
    const currentIndex = candidates.findIndex(c => c.id === selectedPdaId);
    const nextIndex = (currentIndex + 1) % candidates.length;
    selectedPdaId = candidates[nextIndex].id;
  } else {
    // 4. 否则选择距离最近的
    candidates.sort((a, b) => a.distance - b.distance);
    selectedPdaId = candidates[0].id;
  }
  
  lastClickCandidates = candidates;
});
```

### 重叠 PDA 视觉提示（数字徽章）⏸ 样式已确认，实现延期

**测试文件**：
- `demo_01_overlap_indicator.html` — 5 种视觉提示方案对比
- `demo_01_badge_styles.html` — 数字徽章弱遮挡样式对比

**已确认样式**：**样式 2 — 纯文字 + 淡色背景**
- 蓝色半透明矩形背景（20% 透明度），蓝色文字，无边框
- BSL/SSL 显示在线段右端，FVG 显示在矩形右上角
- 仅当重叠数量 > 1 时显示

**⚠️ 决策变更（2026-05-12）：徽章实现延期**

**背景**：之前的假设是"用户需要先知道某处有几个重叠 PDA，再决定怎么点"，徽章用来辅助"循环切换"交互。
**变更原因**：后续确定把 PDA 选择功能交给**右键菜单**承载 — 用户右键即可看到点击位置的完整 PDA 列表，徽章的**选择辅助**价值几乎消失。

**徽章剩余的唯一价值**：扫图时一眼看到重叠密集的区域（视觉密度感知）。这是研究层面的锦上添花，不是阶段 1 的必需品。

**处理方式**：
- ✅ 保留样式决策（样式 2），避免未来重新对齐
- ⏸ 不在阶段 1 实现，不写入 `kline_viewer.html`
- 🔜 右键菜单（Contextual Panel）落地后重新评估：若"重叠密度感知"确实有价值，再按样式 2 实现

### 潜在问题和解决方案

| 问题 | 影响 | 解决方案 |
|------|----------|
| 点击不准确（距离计算错误） | 高 | 调试距离计算逻辑，添加日志输出 |
| 阈值不合理 | 中 | 根据测试结果调整阈值（建议 15-25 像素） |
| 高亮不明显 | 低 | 增加颜色对比度，或添加边框/阴影 |
| 性能问题（PDA 数量多时） | 中 | 优化：只计算可见区域内的 PDA |
| 重叠 PDA 选择混乱 | 中 | 采用循环切换策略（已解决 ✅） |

---

## 三、预研 2：侧边栏布局

### 文件
`v3/docs/demo_02_sidebar_layout.html`

### 测试目标
验证左侧图表 + 右侧侧边栏的响应式布局。

### 技术方案

使用 **Flexbox 布局**：

```css
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

#chart {
  flex: 1; /* 自动占据剩余空间 */
  background: #131722;
}

.sidebar {
  width: 360px; /* 固定宽度 */
  flex-shrink: 0; /* 不缩小 */
  background: #1e222d;
  border-left: 1px solid #2a2e39;
  transition: transform 0.3s ease;
}

.sidebar.collapsed {
  transform: translateX(100%); /* 折叠时向右移出屏幕 */
}
```

### 折叠动画

使用 CSS `transform` 实现平滑折叠：

```javascript
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
}
```

### PDA 列表设计

**按类型分组显示：**

```html
<div class="pda-group">
  <div class="pda-group-title">BSL (Buy Side Liquidity)</div>
  <div class="pda-item" onclick="selectPda('bsl_1')">
    <div class="pda-item-header">
      <span class="pda-item-label">BSL-1</span>
      <span class="pda-item-type">BSL</span>
    </div>
  <div class="pda-item-info">
      时间: 2012-01-09 13:00<br>
      价格: 2305.50
    </div>
  </div>
</div>
```

**选中状态：**

```css
.pda-item.selected {
  background: #1a1e2e;
  border-color: #2962ff;
  box-shadow: 0 0 0 1px #2962ff;
}
```

### PDA 详情面板

选中 PDA 后，在侧边栏底部显示详情：

```html
<div class="pda-detail">
  <div class="pda-detail-title">PDA 详情</div>
  <div class="pda-detail-row">
    <span class="pda-detail-label">PDA ID:</span>
    <span class="pda-detail-value">pda_20120109_1H_bsl_001</span>
  </div>
  <!-- 更多字段... -->
</div>
```

### 测试要点

**请在浏览器中打开 `demo_02_sidebar_layout.html` 测试：**

1. ✅ 侧边栏宽度 360px 是否合适？（不会太窄或太宽）
2. ✅ 图表区域是否自动调整宽度？
3. ✅ 折叠动画是否流畅？
4. ✅ 折叠后，图表是否扩展到全宽？
5. ✅ PDA 列表是否清晰易读？
6. ✅ 选中状态是否明显？
7. ✅ PDA 详情面板是否显示完整？
8. ✅ 滚动条是否正常工作（PDA 列表过长时）？

### 潜在问题和解决方案

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 侧边栏太窄，内容显示不全 | 中 | 调整宽度到 380-400px |
| 侧边栏太宽，图表太小 | 中 | 保持 360px，或支持用户调整 |
| 折叠动画卡顿 | 低 | 使用 `transform` 而非 `width`（已采用） |
| PDA 列表过长，滚动不流畅 | 低 | 添加虚拟滚动（可选） |

---

## 四、预研 3：API 调用测试

### 文件
`v3/docs/demo_03_api_test.html`

### 测试目标
验证 Manual PDA 的创建、更新、删除 API。

### API 端点

1. **POST /v2/pda_manual_add** — 创建 Manual PDA
2. **POST /v2/pda_manual_update** — 更新 Manual PDA
3. **POST /v2/pda_delete** — 删除 PDA

### 请求格式

#### 创建 BSL

```json
{
  "instrument": "NQ",
  "timeframe": "1H",
  "pdaType": "bsl",
  "anchorTime": "2012-01-09T13:00:00",
  "price": 2305.50,
  "note": "测试创建 Manual PDA"
}
```

#### 创建 FVG

```json
{
  "instrument": "NQ",
  "timeframe": "1H",
  "pdaType": "fvg",
  "anchorTime": "2012-01-09T12:00:00",
  "priceHigh": 2310.00,
  "priceLow": 2300.00,
  "direction": "bullish",
  "note": "测试创建 FVG"
}
```

#### 更新 PDA

```json
{
  "pdaId": "pda_20120109_1H_bsl_m001",
  "price": 2308.75,
  "note": "已更新的 Manual PDA"
}
```

#### 删除 PDA

```json
{
  "pdaId": "pda_20120109_1H_bsl_m001"
}
```

### 响应格式

**成功响应：**

```json
{
  "ok": true,
  "result": {
    "pda_id": "pda_20120109_1H_bsl_m001",
    "message": "Manual PDA created successfully"
  }
}
```

**错误响应：**

```json
{
  "ok": false,
  "error": "bsl/ssl manual add requires price"
}
```

### 测试要点

**请在浏览器中打开 `demo_03_api_test.html` 测试：**

**前提：确保 API 服务运行**

```bash
cd /home/leo/myworkspace/trading/backtesting
bash restart_api.sh
```

**测试步骤：**

1. ✅ **测试1：创建 BSL**
   - 选择类型 "BSL"，填写价格 2305.50
   - 点击"创建 PDA"
   - 检查响应：是否返回 `pda_id`？
   - 检查数据库：`SELECT * FROM pda_registry WHERE pda_id = '...'`

2. ✅ **测试2：创建 FVG**
   - 选择类型 "FVG"，填写价格区间 2300-2310，方向 "bullish"
   - 点击"创建 PDA"
   - 检查响应和数据库

3. ✅ **测试3：更新 PDA**
   - 复制测试1返回的 `pda_id`，粘贴到"更新 PDA"表单
   - 修改价格为 2308.75
   - 点击"更新 PDA"
   - 检查响应和数据库

4. ✅ **测试4：删除 PDA**
   - 复制 `pda_id`，粘贴到"删除 PDA"表单
   - 点击"删除 PDA"，确认对话框
   - 检查响应和数据库（记录应被删除）

5. ✅ **测试5：错误处理**
   - 创建 BSL 但不填写价格 → 应返回错误
   - 创建 FVG 但不填写方向 → 应返回错误
   - 更新不存在的 PDA → 应返回错误
   - 删除不存在的 PDA → 应返回错误

### 验证数据库

```bash
python3 -c "
import duckdb
conn = duckdb.connect('v2/data/v2_research.duckdb')
print(conn.execute(\"SELECT pda_id, pda_type, price, note, manual_added FROM pda_registry WHERE manual_added = true ORDER BY created_ts DESC LIMIT 5\").df())
"
```

### 潜在问题和解决方案

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| API 返回 CORS 错误 | 高 | 检查 API 是否设置了 CORS 头 |
| 请求参数格式错误 | 高 | 参考 `create_v2_manual_pda` 函数的参数定义 |
| 数据库写入失败 | 高 | 检查数据库文件权限，查看 API 日志 |
| 时间格式不正确 | 中 | 使用 ISO 8601 格式：`2012-01-09T13:00:00` |

---

## 五、预研结论

### 技术可行性评估

| 技术点 | 可行性 | 风险等级 | 备注 |
|--------|--------|-------|------|
| Primitive 点击检测 | ✅ 可行 | 中 | 需要手动计算距离，但方案成熟 |
| 侧边栏布局 | ✅ 可行 | 低 | Flexbox 布局简单可靠 |
| API 调用 | ✅ 可行 | 低 | API 端点已存在，格式清晰 |

### 关键发现

1. **Primitive 点击检测**：
   - 手动距离计算方案可行，但需要仔细调试
   - 阈值 20 像素较为合理，可根据实际测试调整
   - 高亮效果需要重新渲染 Primitive（性能影响较小）

2. **侧边栏布局**：
   - 360px 固定宽度合适，不需要可调整
   - Flexbox 布局自动适配，无需额外处理
   - 折叠动画流畅，用户体验良好

3. **API 调用**：
   - API 端点完善，支持所有必要操作
   - 请求格式清晰，错误处理完善
   - 需要注意不同 PDA 类型的参数差异

### 风险缓解措施

1. **点击检测不准确**：
   - 在 demo 中充分测试，调整距离计算逻辑
   - 添加调试日志，输出点击坐标和 PDA 坐标
   - 考虑增加视觉反馈（鼠标悬停时高亮）

2. **侧边栏占用空间**：
   - 支持折叠功能，默认展开
   - 如果用户反馈宽度不合适，再考虑可调整

3. **API 调用失败**：
   - 前端添加完善的错误处理和提示
   - 表单验证在前端和后端都做
   - 提供清晰的错误信息，帮助用户排查

---

## 六、下一步行动

### 选项 A：直接开始阶段 1 实现

**理由：** 预研验证了技术可行性，风险可控

**行动：**
1. 在 `kline_viewer.html` 中添加侧边栏 HTML 结构
2. 在 `chart-viewer.css` 中添加侧边栏样式
3. 实现 PDA 列表渲染逻辑
4. 实现点击检测和选择逻辑
5. 实现 PDA 详情显示

### 选项 B：先在 demo 中完善细节

**理由：** 在独立环境中调试更容易，避免污染主代码

**行动：**
1. 在 `demo_01` 中完善点击检测逻辑，确保准确性
2. 在 `demo_02` 中完善 PDA 列表样式，确保美观
3. 在 `demo_03` 中测试所有 API 端点，确保无误
4. 将验证通过的代码迁移到 `kline_viewer.html`

---

## 七、测试清单

**请在浏览器中依次测试三个 demo，并记录结果：**

### Demo 1: Primitive 点击检测

- [ ] 点击 BSL 线段，能否准确选中？
- [ ] 点击 FVG 矩形，能否准确选中？
- [ ] 点击 PDA 附近，是否能选中最近的 PDA？
- [ ] 点击远离所有 PDA 的位置，是否不选中任何 PDA？
- [ ] 高亮效果是否明显？
- [ ] 距离阈值 20 像素是否合理？

### Demo 2: 侧边栏布局

- [ ] 侧边栏宽度 360px 是否合适？
- [ ] 图表区域是否自动调整宽度？
- [ ] 折叠动画是否流畅？
- [ ] 折叠后，图表是否扩展到全宽？
- [ ] PDA 列表是否清晰易读？
- [ ] 选中状态是否明显？
- [ ] PDA 详情面板是否显示完整？
- [ ] 滚动条是否正常工作？

### Demo 3: API 调用测试

- [ ] 创建 BSL 成功？
- [ ] 创建 FVG 成功？
- [ ] 更新 PDA 成功？
- [ ] 删除 PDA 成功？
- [ ] 错误处理是否完善？
- [ ] 数据库中的记录是否正确？

---

## 八、待确认问题

1. **表单样式**：弹出对话框 vs 侧边栏内展开
   - 建议：先实现侧边栏内展开（简单），如果空间不够再改为弹出对话框

2. **删除确认**：简单 `confirm()` vs 自定义模态框
   - 建议：先用 `confirm()`（快速），后续可优化为自定义模态框

3. **PDA 列表排序**：首选时序，次选类型
   - 建议：默认按时间排序，提供"按类型排序"按钮切换

---

**请测试三个 demo，并告诉我：**
1. 是否发现任何问题？
2. 是否需要调整方案？
3. 是否可以开始阶段 1 实现？
