# 会话记录 - TODO 更新 & 代码拆分评估

**日期**：2026-05-16
**分支**：`main`

---

## 本次工作内容

### 1. TODO 新增条目

**PDA 显示设置面板**（待开始，优先级：中）：
- 手动标注 PDA 的可见周期控制 — 按类型+周期筛选显示/隐藏
- 手动标注 PDA 的默认样式设置 — 默认长度、颜色、线宽等可调
- 单个手动 PDA 的长度调整 — 选中后可单独拖拽/输入，持久化保存

**新增 PDA 类型**（待开始）：
- Key Level — 逻辑参考 v2 kline viewer
- OB (Order Block) — 逻辑参考 v2 kline viewer
- Breaker — 逻辑待用户后续编写
- Wick CE (Wick Candle Exhaustion) — 逻辑待用户后续编写

**行情段连线**：补充参考文件 `v3/docs/demo_swing_annotation.html`

### 2. 代码拆分评估（仅探讨，未实施）

对 v3 kline viewer 代码量的拆分必要性分析：

| 文件 | 行数 | 拆分优先级 | 核心判断 |
|------|------|-----------|---------|
| `pda-renderer.js` | 627 | **高** | 三个无关职责混在一起（FVG渲染/Liquidity渲染/数据加载），`loadPdaData` 218行是最大单函数 |
| `kline_viewer.html` | 767 | **中** | 编排器角色合理，但 `loadKlineData` 100+行混合了fetch/转换/UI |
| `kline_viewer.css` | 590 | **低** | CSS天然扁平，结构清晰，暂不拆 |

**结论**：如拆，优先拆 `pda-renderer.js` → `fvg-primitive.js` + `liquidity-primitive.js` + `pda-data-loader.js`，类型分发换成注册表模式。CSS 提取颜色变量即可，暂不拆文件。

---

## 当前代码状态

- ✅ 所有功能正常，无已知 bug
- ✅ TODO 已更新（新增 PDA 设置面板、新增 PDA 类型、行情段连线参考）

## 下一步选项

1. **阶段 3**：行情段标注（Swing Low/High 标记 + 连线渲染）
2. **阶段 E**：PDA 工作台实现
3. **PDA 显示设置面板**：可见周期控制 + 默认样式 + 单个调整
4. **代码拆分**：优先拆 `pda-renderer.js`
5. **新增 PDA 类型**：Key Level / OB（参考 v2 逻辑）
