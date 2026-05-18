# V3 开发 TODO

## 当前分支：`feature/pda-manual-annotation`

**最后更新**：2026-05-18
**当前状态**：✅ PDA 软删除 + 匹配 + 清除功能完成

**接驳指南**：

1. **当前状态**
   - ✅ 右键K线直接标注 BSL/SSL/FVG（无需表单）
   - ✅ 可见周期子菜单 + 过滤渲染
   - ✅ PDA 软删除（隐藏/恢复）+ 永久删除（仅手动PDA）
   - ✅ 工具栏"显示隐藏 PDA" toggle 开关
   - ✅ 手动PDA标注后自动匹配提示 + 合并渲染（确认标记 ✓）
   - ✅ 右键已匹配PDA → "取消匹配"选项
   - ✅ K线右键 → "清除所有已标注 PDA"（批量隐藏，非删除）
   - 分支 `feature/pda-manual-annotation` 包含 16 个 commit
   - 待合并到 main

2. **下一步**
   - 运行 `scan_layer1_pda.py` 生成自动PDA → 浏览器测试匹配流程
   - 合并到 main

---

## 已完成功能 ✅

### 清除所有已标注PDA（2026-05-18）
- K线右键菜单新增"清除所有已标注 PDA"（danger样式，带 confirm）
- 调用 `GET /v2/pda_hide_all_manual` 批量隐藏当前周期手动PDA
- 不是删除，是隐藏，可通过 toggle + 右键恢复
- `hide_all_manual_pdas` DB函数，支持 instrument/timeframe/trade_date 过滤

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