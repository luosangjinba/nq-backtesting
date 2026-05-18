# V3 开发 TODO

## 当前分支：`feature/pda-manual-annotation`

**最后更新**：2026-05-18
**当前状态**：✅ 一对多匹配 + 跨周期查询 + 可见性过滤完成

**接驳指南**：

1. **当前状态**
   - ✅ 右键K线直接标注 BSL/SSL/FVG（无需表单）
   - ✅ 可见周期子菜单 + 过滤渲染
   - ✅ PDA 软删除（隐藏/恢复）+ 永久删除（仅手动PDA）
   - ✅ 工具栏"显示隐藏 PDA" toggle 开关
   - ✅ 手动标注后自动提示匹配 + 合并渲染（确认标记 ✓）
   - ✅ 右键已匹配PDA → "取消匹配"选项
   - ✅ K线右键 → "清除所有已标注 PDA"（批量隐藏，非删除）
   - ✅ 一对多匹配：一个手动PDA可同时确认多个自动PDA（跨周期）
   - ✅ 匹配面板多选（checkbox + "匹配所选"按钮）
   - ✅ 跨周期匹配查询（不传timeframe，返回所有周期的候选）
   - ✅ isVisiblePda() 共享过滤：检测器只找渲染中的PDA
   - ✅ 默认只渲染手动标注 + 已匹配确认的自动PDA
   - ✅ 工具栏"显示自动 PDA" toggle 开关
   - ✅ 标签区分：手动 `BSL 1H manual`，已匹配自动 `BSL ✓`
   - 分支 `feature/pda-manual-annotation` 包含 17 个 commit
   - 待合并到 main

2. **下一步**
   - 合并到 main
   - 测试完整匹配流程（标注 → 匹配面板 → 多选 → 渲染变化）
   - 考虑匹配候选排序优化（exact 优先，同周期优先）

---

## 已完成功能 ✅

### 一对多匹配 + 跨周期查询 + 可见性过滤（2026-05-18）
- Backend: `match_v2_manual_to_auto_pdas` 接受 `autoPdaIds` 列表
- Backend: `unmatch_v2_manual_pda` 处理列表式 `matched_auto_pda_ids` + 逐个auto取消
- Frontend: 匹配面板改为多选（checkbox + "匹配所选"按钮）
- Frontend: 跨周期匹配查询（不传timeframe，含 midnight scan）
- Frontend: 右键菜单新增"匹配自动 PDA"（仅未匹配手动PDA）
- Frontend: `isVisiblePda()` 共享过滤，检测器只找渲染中的PDA
- Frontend: 默认只渲染手动+已匹配确认的自动PDA，toggle显示全部自动
- 标签：BSL/SSL manual 后缀，已匹配自动PDA加 ✓
- CSS: 匹配面板 checkbox 行 + 按钮行布局

### 手动PDA匹配自动PDA（2026-05-18）
- 标注完成后自动查询 `/v2/pda_match` 查找同位置自动PDA候选
- 有候选（exact/near）→ 弹出匹配选择面板
- 匹配后：手动PDA不渲染，自动PDA标签加 ✓
- 取消匹配：右键 → "取消匹配"
- `/v2/pda_match_manual` / `/v2/pda_unmatch_manual` API

### PDA 软删除 + 永久删除（2026-05-18）
- 右键PDA → "隐藏" + "永久删除"(仅手动PDA)
- 工具栏 checkbox "显示隐藏 PDA" → 虚线+半透明+"(隐藏)"标签
- `/v2/pda_hide` / `/v2/pda_restore` API

### PDA 手动标注 + 可见周期控制（2026-05-17）

### 代码审查修复（2026-05-17）

---

## 参考资料

### 会话记录
- `v3/sessions/session_20260518_soft_delete.md` - 软删除+匹配+清除功能完整开发过程
- `v3/sessions/session_20260517_manual_annotation.md` - PDA手动标注+可见周期控制
- `v3/sessions/session_20260517_code_review_fixes.md` - 代码审查修复过程