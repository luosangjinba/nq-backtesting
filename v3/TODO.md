# V3 开发 TODO

## 当前分支：`main`

**最后更新**：2026-05-16 20:35
**当前状态**：🔄 阶段 3（方案 C）代码已落地第一版，但尚未格式化与浏览器验证；已补充 clear 后接驳说明

**重要提醒**：
- ⚠️ 静态文件服务器必须在 `v3` 目录运行（不是 `v3/docs`），否则 CSS 无法加载
- ✅ 访问 URL：`http://127.0.0.1:8000/docs/kline_viewer.html`
- ✅ API 服务器：`http://127.0.0.1:8765`（需要单独启动）
- 📚 **开发新功能前，先查阅 `v3/docs/FUNCTION_REFERENCE.md` 避免重复造轮子**

**接驳指南（clear 后从这里开始）**：

1. **先读最新会话记录**（最重要）
   - `v3/sessions/session_20260516_stage3_scheme_c_progress.md` - 阶段 3 / 方案 C 当前进度（2026-05-16 20:35，最新）
   - `v3/sessions/session_20260516_todo_and_split_assessment.md` - TODO 更新 & 代码拆分评估
   - `v3/docs/REPLAY_STRUCTURE_PLAN.md` - 阶段 3 目标 YAML 结构与总体方案

2. **本次已完成到哪一步**
   - ✅ 已在 `annotation.js` 中加入 swing / segment 状态、撤销、清空、YAML 导出逻辑
   - ✅ 已在 `pda-renderer.js` 中加入最小 `SegmentPrimitive`
   - ✅ 已在 `context-menu.js` 中扩展方案 C 菜单项（标记 Swing、创建行情段、撤销、清空）
   - ✅ 已在 `kline_viewer.html` 中接入导出按钮、dirty guard、方案 C action 分发
   - ⚠️ **尚未完成**：Prettier 格式化、浏览器手工验证、回归验证

3. **clear 后第一步该做什么**
   - 先通读 `v3/docs/kline_viewer.html` 当前改动段，确认没有接线错误
   - 对 `v3/docs/kline_viewer.html`、`v3/modules/annotation.js`、`v3/modules/context-menu.js`、`v3/modules/pda-renderer.js` 运行 Prettier
   - 启动 API 与静态文件服务器，在浏览器手测方案 C 流程

4. **验证重点**
   - Swing Low / High 标记是否正常显示
   - 最近两个 Swing 点能否创建行情段连线
   - 撤销/清空是否正常
   - 导出 YAML 是否成功
   - refresh / load / 切周期前的 dirty guard 是否符合预期
   - 现有 FVG 标注、PDA 表单、timeframe 切换是否回归

5. **当前不要做的事**
   - 不要继续扩展 PDA 关联
   - 不要做 YAML 落盘 / DuckDB sync
   - 不要顺手拆分 `pda-renderer.js`

---

## 进行中功能 🔄

### 阶段 3：行情段标注（方案 C 第一版）
**状态**：🔄 代码已落地，待格式化与浏览器验证

- 已修改文件：
  - `v3/docs/kline_viewer.html`
  - `v3/modules/annotation.js`
  - `v3/modules/context-menu.js`
  - `v3/modules/pda-renderer.js`
- 已新增会话记录：
  - `v3/sessions/session_20260516_stage3_scheme_c_progress.md`
- clear 后先做：
  - Prettier 格式化
  - 浏览器手工验证
  - FVG / PDA 表单 / timeframe 切换回归验证

---

## 已完成功能 ✅

### K 线回放与 PDA 手动标注（已合并 - 2026-05-15）

**分支**：`feature/chart-display-control` → `main`  
**合并提交**：`1d7c285`  
**开发时间**：2026-05-15  
**计划文档**：`v3/docs/REPLAY_STRUCTURE_PLAN.md`  
**会话记录**：
- `v3/sessions/session_20260515_replay_structure_plan.md` - 方案规划
- `v3/sessions/session_20260515_replay_stage1.md` - 阶段 1 实施
- `v3/sessions/session_20260515_pda_disable_and_contextmenu.md` - PDA 禁用 & 右键菜单
- `v3/sessions/session_20260515_pda_form_sidebar.md` - PDA 表单侧边栏实现
- `v3/sessions/session_20260515_replay_controls_layout_fix.md` - 播放控制栏布局修复
- `v3/sessions/session_20260515_fvg_identification.md` - FVG 自动识别实现


---

## 参考资料

### 会话记录
- `v3/sessions/session_20260515_modularization.md` - 模块化拆分完整过程
- `v3/sessions/session_20260515_nwog_ndog_fix.md` - NWOG/NDOG 修复
- `v3/sessions/session_20260514_*.md` - 右键菜单开发过程
- `v3/sessions/session_20260512_evening.md` - PDA 工作台技术预研

### 设计文档
- `v3/docs/CONTEXT_MENU_DESIGN.md` - 右键菜单设计探讨
- `v3/docs/CONTEXT_MENU_FEASIBILITY.md` - 技术可行性报告
- `v3/docs/PLAN_PDA_WORKBENCH.md` - PDA 工作台方案规划
- `v3/docs/TECH_RESEARCH_REPORT.md` - 技术预研报告
- `v3/docs/CONTEXTUAL_PANEL_RESEARCH.md` - Contextual Panel 技术预研
