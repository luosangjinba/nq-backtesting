# Session 2026-05-18: PDA 手动标注匹配自动PDA

## 概要

在 `feature/pda-manual-annotation` 分支上实现了手动PDA标注后自动匹配提示 + 合并渲染功能。

## 完成的工作

### PDA 软删除 + 永久删除（1 个 commit: 721321a）
- 右键PDA → "隐藏"(软删除) + "永久删除"(仅手动PDA)
- 工具栏 checkbox "显示隐藏 PDA" toggle
- `/v2/pda_hide` / `/v2/pda_restore` API

### 手动PDA匹配自动PDA（1 个 commit: fe57614）

**核心功能：**
- 标注完成后，自动查询 `/v2/pda_match` 查找同位置的自动PDA候选
- 如果有候选（exact/near），弹出匹配选择面板
- 用户选择"匹配" → 手动PDA不再渲染，自动PDA标签加 ✓
- 用户选择"保持独立" → 两者独立渲染

**关键文件改动：**

| 文件 | 改动 |
|------|------|
| `price_lookup_api.py` | 新增 `match_v2_manual_to_auto` / `unmatch_v2_manual_pda` DB函数 + `/v2/pda_match_manual` / `/v2/pda_unmatch_manual` 端点 |
| `v3/modules/pda-renderer.js` | 已匹配手动PDA skip渲染，已匹配自动PDA标签加 ✓ |
| `v3/docs/kline_viewer.html` | `saveManualPda` 后查询匹配 + `showMatchPanel` UI + `handleMatchManual` / `handleUnmatchManual` |
| `v3/modules/context-menu.js` | `showPdaMenu` 加 `onUnmatchManual` 参数 + "取消匹配"菜单项 |
| `v3/styles/chart-viewer.css` | `.match-panel` / `.match-candidate-row` / `.match-btn` 样式 |

**设计决策：**
- 匹配关系存储：手动PDA `extra_fields.matched_auto_pda_id` + 自动PDA `extra_fields.matched_manual_pda_id` + `pda_members` manual_ref 行
- 不新增列，利用已有 JSON extra_fields
- 匹配后合并渲染：手动PDA不渲染，自动PDA标签加 ✓（确认标记语义）
- 取消匹配：右键 → "取消匹配" → 清除关联 → 重新渲染

**API 验证：**
- `/v2/pda_match_manual` 验证手动→自动方向 ✅
- `/v2/pda_unmatch_manual` 验证无匹配时报错 ✅
- `/v2/pda_match` 前端可正常查询候选 ✅

**注意：** 当前数据库只有手动PDA，没有自动扫描PDA。匹配功能需要先运行 `scan_layer1_pda.py` 生成自动PDA才能实际测试匹配流程。

## 当前状态

- 分支：`feature/pda-manual-annotation`
- 14 个 commit，待合并到 main
- API 服务器已重启

## 下一步

- 运行 `scan_layer1_pda.py` 生成自动PDA数据，然后在浏览器中测试完整匹配流程
- 合并 `feature/pda-manual-annotation` 到 main