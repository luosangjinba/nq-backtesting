# V3 开发 TODO

## 当前分支：`feature/pda-manual-annotation`

**最后更新**：2026-05-18
**当前状态**：✅ PDA 软删除 + 永久删除功能完成

**接驳指南**：

1. **当前状态**
   - ✅ 右键K线直接标注 BSL/SSL/FVG（无需表单）
   - ✅ 可见周期子菜单（1W/1D/4H/1H/30M/15M/5M/1M checkbox）
   - ✅ 可见周期过滤渲染（手动标注PDA按周期过滤）
   - ✅ `/v2/pda_update_visibility` API 端点
   - ✅ 旧 pda-form 代码已清理
   - ✅ PDA 软删除（隐藏/恢复）+ 永久删除（仅手动PDA）
   - ✅ `/v2/pda_hide` / `/v2/pda_restore` API 端点
   - ✅ 工具栏"显示隐藏 PDA" toggle 开关
   - ✅ 隐藏 PDA 虚线 + "(隐藏)" 标签 + 半透明渲染
   - 分支 `feature/pda-manual-annotation` 包含 12 个 commit
   - 待合并到 main

2. **下一步**
   - 合并到 main
   - 自动扫描匹配（deferred）

---

## 已完成功能 ✅

### PDA 软删除 + 永久删除（2026-05-18）
- 右键PDA → "隐藏"（软删除，status='hidden'）+ "永久删除"（仅手动PDA，DB物理删除）
- 隐藏的PDA默认不渲染，API默认不返回
- 工具栏 checkbox "显示隐藏 PDA" → 隐藏PDA以虚线+半透明+"(隐藏)"标签渲染
- 隐藏PDA右键 → "恢复显示" + "永久删除"（仅手动PDA）
- `/v2/pda_hide` / `/v2/pda_restore` API + `hide_v2_pda_record` / `restore_v2_pda_record` DB函数
- `query_v2_pda_records` 新增 `include_hidden` 参数，默认排除 hidden

### PDA 手动标注 + 可见周期控制（2026-05-17）
- 右键K线 → 标注BSL/SSL/FVG → 立即渲染 + API入库
- BSL: 3根K线长度短线 + "BSL {tf}" 标签
- SSL: 3根K线长度短线 + "SSL {tf}" 标签
- FVG: 黄色(bullish)/红色(bearish)矩形
- 右键PDA → 可见周期子菜单 → checkbox勾选/取消
- 默认可见周期 = 当前图表周期
- `/v2/pda_update_visibility` API + `update_v2_pda_visibility` DB函数
- 旧 pda-form sidebar、savePda、setOnSaveCallback 已移除

### 代码审查修复（2026-05-17）
- SQL 注入修复、separator bug、W/1W 对齐
- CORS PUT、extraFields、formatTimestamp 去重
- 死代码清理（validate_review_state、clearAll、utils.js 4 函数、referenceGroup）
- EQH/EQL 渲染与检测、log_message 恢复、验证器消息修正

### K 线回放与 PDA 手动标注（已合并 - 2026-05-15）

### 阶段 3：行情段标注（方案 C 第一版）
**状态**：✅ 代码已格式化，待浏览器验证

---

## 参考资料

### 会话记录
- `v3/sessions/session_20260518_soft_delete.md` - PDA软删除+永久删除开发过程
- `v3/sessions/session_20260517_manual_annotation.md` - PDA手动标注+可见周期控制完整开发过程
- `v3/sessions/session_20260517_code_review_fixes.md` - 代码审查修复过程
- `v3/sessions/session_20260516_stage3_scheme_c_progress.md` - 阶段 3 进度

### 设计文档
- `v3/docs/CONTEXT_MENU_DESIGN.md` - 右键菜单设计
- `v3/docs/REPLAY_STRUCTURE_PLAN.md` - 阶段 3 方案