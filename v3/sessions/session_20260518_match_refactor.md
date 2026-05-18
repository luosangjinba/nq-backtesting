# Session: 2026-05-18 一对多匹配 + 跨周期查询 + 可见性过滤

## 完成内容

### 1. Backend: 一对多匹配 API
- `match_v2_manual_to_auto_pdas` 替代旧的 `match_v2_manual_to_auto`
  - 接受 `auto_pda_ids: list[str]` 而非单个 `auto_pda_id`
  - 手动PDA `extra_fields.matched_auto_pda_ids` 存为列表
  - 每个自动PDA `extra_fields.matched_manual_pda_id` 存为单个ID
  - `pda_members` 写入多行（每个 auto_pda_id 一行 manual_ref）
- `unmatch_v2_manual_pda` 重写
  - Case 1: 手动PDA取消匹配 → 清除列表 + 清除所有关联自动PDA的回引
  - Case 2: 自动PDA取消匹配 → 从手动PDA列表中移除自己 + 清除自己的回引
- `/v2/pda_match_manual` 端点改为接受 `autoPdaIds` 列表

### 2. Frontend: 多选匹配面板
- `showMatchPanel` 改为 checkbox 多选
  - exact 匹配默认勾选
  - 底部"匹配所选"按钮 + "保持独立"按钮
- `handleMatchManual` 发送 `autoPdaIds` 列表

### 3. Frontend: 跨周期匹配查询
- `queryAndShowMatchCandidates` 不传 timeframe 参数
- 同时包含 `auto_ict_midnight_scan` 源
- 修复 API 响应结构：`data.result.candidates`（非 `data.candidates`）

### 4. Frontend: 右键菜单"匹配自动 PDA"
- `showPdaMenu` 新增 `onMatchAutoPda` 回调
- 未匹配的手动PDA显示"匹配自动 PDA" (🔗) 菜单项
- `handleMatchAutoPda` 从PDA记录提取参数重新查询候选

### 5. Frontend: 可见性过滤
- `isVisiblePda()` 导出函数，渲染器和检测器共享
- 默认只渲染手动PDA + 已匹配确认的自动PDA
- 自动PDA默认不渲染，除非被匹配确认
- 工具栏"显示自动 PDA" checkbox toggle
- 修复：之前检测器会找到未渲染的自动PDA，导致右键菜单不正确

### 6. 标签区分
- 手动标注：`BSL 1H manual` / `SSL 1H manual`
- 已匹配自动PDA：`BSL ✓` / `Daily High ✓`

## 遇到的问题

1. **API 400 错误**：服务器运行旧代码（调用不存在的 `match_v2_manual_to_auto`），需要 `bash restart_api.sh`
2. **匹配面板不弹出**：`data.candidates` 应为 `data.result.candidates`
3. **检测器找到未渲染的PDA**：添加 `isVisiblePda()` 共享过滤

## 关键决策

- 一对多匹配：手动PDA存列表，自动PDA存单值（一个自动PDA只能被一个手动确认）
- 跨周期查询：不传 timeframe 让后端返回所有周期候选
- 共享过滤：`isVisiblePda()` 确保检测器和渲染器逻辑一致