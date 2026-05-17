# V3 开发 TODO

## 当前分支：`fix/code-review-20260517`

**最后更新**：2026-05-17
**当前状态**：✅ 代码审查修复全部完成（14/14）

**接驳指南**：

1. **当前状态**
   - ✅ 14 个代码审查问题全部修复并提交
   - 分支 `fix/code-review-20260517` 包含 14 个 commit
   - 待合并到 main

2. **下一步**
   - 合并到 main
   - 浏览器验证（启动 API + 静态文件服务器）
   - 继续开发新功能

---

## 已完成功能 ✅

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
- `v3/sessions/session_20260517_code_review_fixes.md` - 代码审查修复过程
- `v3/sessions/session_20260516_stage3_scheme_c_progress.md` - 阶段 3 进度

### 设计文档
- `v3/docs/CONTEXT_MENU_DESIGN.md` - 右键菜单设计
- `v3/docs/REPLAY_STRUCTURE_PLAN.md` - 阶段 3 方案