# Session 2026-05-18: PDA 软删除 + 匹配 + 清除功能

## 概要

在 `feature/pda-manual-annotation` 分支上实现了三项功能：PDA软删除/永久删除、手动PDA匹配自动PDA、清除所有已标注PDA。

## 完成的工作

### 1. PDA 软删除 + 永久删除（commit: 721321a）
- 右键PDA → "隐藏"(status='hidden') + "永久删除"(仅手动PDA)
- 工具栏 checkbox "显示隐藏 PDA" toggle → 虚线+半透明+"(隐藏)"标签
- `/v2/pda_hide` / `/v2/pda_restore` API
- `query_v2_pda_records` 加 `include_hidden` 参数

### 2. 手动PDA匹配自动PDA（commit: fe57614）
- 标注完成后自动查询 `/v2/pda_match` 查找同位置自动PDA候选
- 有候选（exact/near）→ 弹出匹配选择面板（"匹配" / "保持独立"）
- 匹配后：手动PDA不渲染，自动PDA标签加 ✓（如 "BSL ✓"）
- 取消匹配：右键 → "取消匹配" → 清除关联 → 重新渲染
- `/v2/pda_match_manual` / `/v2/pda_unmatch_manual` API
- 匹配关系：extra_fields.matched_auto_pda_id / matched_manual_pda_id + pda_members manual_ref

### 3. 清除所有已标注PDA（commit: 2180281）
- K线右键菜单新增"清除所有已标注 PDA"（🧫图标，danger样式，带 confirm）
- 调用 `GET /v2/pda_hide_all_manual` 批量隐藏当前周期手动PDA
- 不是删除，是隐藏（status='hidden'），可通过 toggle + 右键恢复
- `hide_all_manual_pdas` DB函数，支持 instrument/timeframe/trade_date 过滤

**Bug修复：**
- `/v2/pda_hide_all_manual` 最初误放在 `do_POST` 中导致 404，移到 `do_GET` 后修复

## 关键文件改动

| 文件 | 改动 |
|------|------|
| `price_lookup_api.py` | hide/restore/match/unmatch/hide_all_manual DB函数 + 5个新端点 + include_hidden过滤 |
| `v3/modules/context-menu.js` | showPdaMenu: 隐藏+永久删除+取消匹配; showHiddenPdaMenu; showKlineMenu: 清除所有 |
| `v3/docs/kline_viewer.html` | handleHidePda/Restore/PermanentDelete/Match/Unmatch/ClearAllManual + 匹配面板UI + toggle |
| `v3/modules/pda-renderer.js` | include_hidden参数 + hidden虚线/半透明 + matched跳过/✓标签 |
| `v3/modules/chart.js` | state.showHiddenPdas |
| `v3/styles/chart-viewer.css` | toolbar-checkbox + match-panel 样式 |

## 当前状态

- 分支：`feature/pda-manual-annotation`
- 16 个 commit，待合并到 main
- API 服务器已重启

## 下一步

- 运行 `scan_layer1_pda.py` 生成自动PDA → 浏览器测试匹配流程
- 合并到 main