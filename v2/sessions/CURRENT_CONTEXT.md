# Current Context

这是给后续会话优先读取的短上下文。完整流水账见 `v2/sessions/SESSIONS.md`。

## 当前目标

当前工作重心是 `v2/docs/kline_viewer.html` 的右侧 PDA 管理面板。目标是把 `pda_manager.html` 的 PDA 管理能力逐步迁移进 K 线查看器，让用户可以边看图、边查询/新增/编辑/匹配 PDA。

## 最近决策

- 暂不升级 KLineChart。
- 当前继续使用 `klinecharts@9.8.12`。
- v10 目前是 beta1，等 stable 后再评估正式迁移。
- 不做 v10 隔离实验。

## 当前实现状态

- `kline_viewer.html` 左侧图表逻辑保留：
  - KLineChart v9.8.12
  - UTC timezone
  - PDA overlay
  - S/E overlay
  - 午夜线
  - 右键复制时间
  - URL 参数 `pda_id` / `start` / `end` / `tf` / `padding`
- 右侧管理面板已重搭为 `PDA 工作台`：
  - `PDA 列表`
  - `Manual PDA`
  - `匹配合并`
- 右侧 `PDA 列表` 已接入真实 PDA 查询：
  - `/v2/pda_records`
  - 来源、类型、周期、方向、时间范围筛选
  - 每页 10/20/50
  - 分页、排序、统计
  - 行选中、定位选中 PDA
- 右侧 `Manual PDA` 已接入基础 CRUD：
  - `/v2/pda_manual_add`
  - `/v2/pda_manual_update`
  - `/v2/pda_delete`
  - 只允许编辑/删除 `manual_add` 和 `manual_eqh_eql`
- `取十字时间` / `取时间` 已能从当前 crosshair bar 回填时间。
- 图表取价已接入：
  - `Price` / `Price High` / `Price Low`
  - 周期切换与按时间定位共用统一 TF 映射
- Manual PDA 预览 overlay 已接入：
  - 直接复用现有 PDA overlay builder
  - 预览不写库
- manual-auto 匹配预览已接入：
  - `/v2/pda_match`
  - 时间容差 / 价格容差
  - 候选表格与统计卡
- 安全版 `应用合并` 已接入：
  - 强匹配采用 Auto
  - 未命中保留 Manual
  - 仅落到页面状态 / YAML，不写数据库
- YAML 导出已接入：
  - `Merge YAML`
  - 含 `merge_preview` 的主导出 YAML
- **右键标记 PDA 试验功能已接入（会话 12）：**
  - 右键菜单 `标记 BSL/SSL/FVG/OB`
  - 自动从十字线位置获取时间和价格
  - 自动填充 Manual PDA 表单
  - 自动切换到 Manual PDA 面板
  - **BSL**：取 high（买方流动性），方向 bullish
  - **SSL**：取 low（卖方流动性），方向 bearish
  - **FVG**：检测三根 K 线缺口，自动填充区间和方向
  - **OB**：两步区间选择
    - 右键点击起点 → Shift + 右键点击终点
    - 自动填充 start_time/end_time，计算价格和方向
    - 支持反向选择，按 Escape 取消
  - OB 类型时 Anchor Time 和 Direction 字段置灰
  - 所有 PDA 类型的字段禁用状态已优化

## 关键文件

- `v2/docs/kline_viewer.html`
  - 当前主要工作文件。
  - 右侧 PDA 工作台 UI 已替换旧 Path/YAML 占位结构。
  - 右键标记 PDA 功能已接入。
- `v2/docs/pda_manager.html`
  - 已有 PDA CRUD、搜索过滤、分页表格、manual add/edit/delete 逻辑。
  - 后续要把核心能力迁入 `kline_viewer.html` 右侧面板。
- `price_lookup_api.py`
  - 提供 `/v2/pda_records`、`/v2/pda_manual_add`、`/v2/pda_manual_update`、`/v2/pda_delete` 等 API。
- `v2/docs/layer2_recorder_v2.html`
  - 需要保持 PDA 匹配逻辑语义一致。

## 后续待办

- 根据右键标记功能使用反馈，扩展更多 PDA 类型或优化填充逻辑。
- 将主导出 YAML 与后续上游工作流真正打通（如果需要的话，决定由谁消费 `merge_preview`）。
- 如要持久化，后续再评估是否把 `应用合并` 写回 DuckDB。
- 继续保持 `layer2_recorder_v2` 与 `kline_viewer` 的匹配阈值 / 语义一致。

## 注意事项

- 不要破坏现有 `kline_viewer.html` 的图表加载和 PDA overlay 行为。
- KLineChart v9 的 API 使用较多，尤其是：
  - `applyNewData`
  - `setPriceVolumePrecision`
  - `getBarSpace()`
  - `getDrawPaneById('candle_pane')`
  - Y 轴 `getRange()` / `setRange()`
- 后续如果升级 v10，需要单独迁移和回归，不要只改 CDN。
