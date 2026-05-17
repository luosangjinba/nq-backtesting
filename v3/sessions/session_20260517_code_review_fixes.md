# 会话记录 - 代码审查修复

**日期**：2026-05-17
**分支**：`fix/code-review-20260517`
**状态**：✅ 全部完成

## 背景

放弃 `feature/pda-visibility-control` 分支后，对 main 分支做全面代码审查，发现 14 个问题。

## 问题清单与修复

### 严重
1. ✅ SQL 注入 — `calc_smoothness` f-string 拼接时间戳 → 参数化查询 (`1e0885f`)
2. ✅ separator bug — `context-menu.js:302` type:'separator' → 'divider' (`c604461`)
3. ✅ W/1W 时间周期不一致 → pda-renderer tfMap 改为 '1W' (`87fa45f`)

### 中等
4. ✅ CORS 缺 PUT → 添加 PUT 到 Allow-Methods (`37bdc9b`)
5. ✅ extraFields: null → {} (`73821ef`)
6. ✅ formatTimestamp 重复且时区不一致 → 移除 replay.js 本地副本，导入 utils.js (`af439fb`)
7. ✅ validate_review_state() 死代码 → 移除 (`c635300`)
8. ✅ ensure_v2_registry_columns 重复调用 → 添加 once-per-process 标志 (`acc57cf`)

### 低优先级
9. ✅ clearAllPrimitives/clearAllAnnotations 死代码 → 移除 (`ee3b840`)
10. ✅ utils.js 4 个未使用函数 → 移除 (`e4a9346`)
11. ✅ pda-detail.js referenceGroup 缺失 → 移除死代码路径 (`f71ca08`)
12. ✅ EQH/EQL 未实现 → 添加渲染和点击检测 (`86fe31f`)
13. ✅ log_message 禁用 → 移除覆盖，恢复默认日志 (`ac6140c`)
14. ✅ 验证器错误信息不一致 → 动态生成完整列表 (`d3d5ee4`)

## 提交记录

14 个 commit，每个修复一个问题，从 `1e0885f` 到 `d3d5ee4`。