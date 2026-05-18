# Session 2026-05-18: PDA 软删除 + 永久删除

## 概要

在 `feature/pda-manual-annotation` 分支上实现了 PDA 软删除（隐藏/恢复）和永久删除功能。

## 完成的工作

### PDA 软删除 + 永久删除（1 个 commit）

**核心功能：**
- 右键PDA → "隐藏"（软删除，status='hidden'）+ "永久删除"（仅手动PDA）
- 隐藏PDA默认不渲染，API默认不返回
- 工具栏 checkbox "显示隐藏 PDA" → 隐藏PDA以虚线+半透明+"(隐藏)"标签渲染
- 隐藏PDA右键 → "恢复显示" + "永久删除"（仅手动PDA）

**关键文件改动：**

| 文件 | 改动 |
|------|------|
| `price_lookup_api.py` | 新增 `hide_v2_pda_record` / `restore_v2_pda_record` DB函数 + `/v2/pda_hide` / `/v2/pda_restore` 端点 + `query_v2_pda_records` 加 `include_hidden` 参数 |
| `v3/modules/context-menu.js` | `showPdaMenu` 删除→隐藏+永久删除(仅手动)，新增 `showHiddenPdaMenu`(恢复+永久删除) |
| `v3/docs/kline_viewer.html` | `handleDeletePda` → `handleHidePda` + `handleRestorePda` + `handlePermanentDeletePda`，新增"显示隐藏 PDA" checkbox |
| `v3/modules/pda-renderer.js` | `loadPdaData` URL 加 `include_hidden`，hidden PDA 虚线+半透明+"(隐藏)"标签 |
| `v3/modules/chart.js` | state 加 `showHiddenPdas: false` |
| `v3/styles/chart-viewer.css` | 新增 `.toolbar-checkbox` 样式 |

**设计决策：**
- 利用已有 `status` 列（default 'active'）实现软删除，无需新增列
- 软删除 → `status = 'hidden'`，恢复 → `status = 'active'`
- 永久删除仍用 `delete_v2_pda_record`（仅手动PDA）
- 隐藏PDA样式：虚线(lineStyle='dashed') + 半透明(FVG颜色33→15) + "(隐藏)"标签后缀
- 恢复入口：工具栏 toggle 开关显示隐藏PDA → 右键可恢复

**API 验证：**
- `POST /v2/pda_hide` → status=hidden ✅
- `POST /v2/pda_restore` → status=active ✅
- `GET /v2/pda_records` → 排除 hidden ✅
- `GET /v2/pda_records?include_hidden=true` → 包含 hidden ✅

## 当前状态

- 分支：`feature/pda-manual-annotation`
- 12 个 commit，待合并到 main
- API 服务器已重启（`bash restart_api.sh restart`）
- 前端服务器在 `v3/` 目录下运行

## 下一步

- 合并 `feature/pda-manual-annotation` 到 main
- 自动扫描匹配功能（deferred）