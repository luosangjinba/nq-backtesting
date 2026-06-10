# V4 TODO

## 进度

### Phase 1: 核心骨架 ✅
- [x] Step 1: 目录 + 配置 + 启动脚本
- [x] Step 2: 事件总线 + 配置模块
- [x] Step 3: 图表管理器 + 图元 (FvgPrimitive, LiquidityPrimitive)
- [x] Step 4: API 服务 + 最小后端 (v4_api.py, 3 端点)
- [x] Step 5: K 线数据存储 + 工具栏 UI
- [x] Step 6: 图表数据绑定
- [x] Step 7: 周期切换

### Phase 2: PDA 系统
- [x] Step 8: PDA 类型注册表 + 当前会话 store
- [x] Step 9: 手动 PDA 标注入口（右键菜单优先 SSL/BSL）
- [x] Step 10: PDA context 实时计算器（完整交易日 1M 源数据 + D/session/midnight 极值 context；intraday swing 只做 advisory validation）
- [x] Step 11: PDA 渲染器（通用 range rectangle 底座；FVG/OB/NDOG/NWOG range 渲染已接入）
- [x] Step 12: 客观 PDA 显示/隐藏命令（右键显示/隐藏 Today NDOG、This Week NWOG）
- [x] Step 13: EQH/EQL 点位集合打包

### Phase 3: Replay / Viewport 交互
- [x] Replay Bar：On/Off + First/Last Pos/Pick + 前进/后退/自动播放
- [x] 图表视口控制：Zoom in/out、Scroll left/right、Scroll latest、Reset chart view
- [x] Replay 增强：cursor 竖线、时间跳转、快捷键、周期切换对齐、Pick hover preview

### Phase 3 后续增强
- [ ] Viewport: Maximize / restore chart（预留给后续多窗口布局）
- [ ] Viewport: 更完整的快捷键映射
- [x] Viewport: 工具条上移并改为局部热区 hover 显示，避免遮挡时间轴
- [x] Replay: 跳转到指定时间
- [x] Replay: 键盘快捷键（空格播放/暂停，左右方向逐根）
- [x] Replay: 当前回放位置视觉标记（cursor 竖线）
- [x] Replay: Pick 状态下鼠标/图表提示优化
- [x] Replay + Viewport: Replay On 切换周期后 Scroll latest 锚定当前回放切片末端

### Phase 4: Inspector / PDA 编辑工作台
- [x] Step 14: PDA selection store + pda-store get/update/delete 接口
- [x] Step 15: PDA hit-test（BSL/SSL line、range rectangle、EQH/EQL point-set）
- [x] Step 16: 可隐藏 Inspector Sidebar，只读显示选中 PDA 信息
- [x] Step 17: Sidebar 基础编辑：Delete selected PDA、note、extendBars
- [x] Step 18: Renderer 支持 extendBars（line/range/point-set 显示延伸，不改结构事实字段）
- [x] Step 18A: PDA extend 跨周期语义修复：保存真实影响时长 `extendSeconds`，按当前周期换算显示/渲染/hit-test；Fib 保留原始区间，仅在右边界继续延伸
- [x] Step 19: EQH/EQL 点集合编辑：点列表、删除点、少于 2 点时处理集合失效
- [x] Step 20: 选中态视觉反馈（高亮 selected PDA，不遮挡 K 线）
- [x] Step 21: localStorage 持久化（手动 PDA 刷新后恢复）

### Phase 5: PDA 归档 / 迁移
- [x] Step 22: 设计 PDA export/import schema（包含版本、instrument、timeframe、range、annotations）
- [x] Step 23: Export 当前 PDA store 中全部非 draft annotations 到 JSON 文件（不是只导出当前可视窗口）
- [x] Step 24: Import PDA annotations 并处理 id 冲突、版本校验、重复标注
- [x] Step 25: 手工验收 export/import、per-annotation label、CE 显示/隐藏、NQ 0.25 tick 对齐，然后合并回 main

### Phase 6: 1H 行情段系统
- [x] Step 26: 设计 1H market segment 数据结构与模块边界
- [x] Step 27: Segment renderer 最小版（起点/终点 marker、方向线、箭头、label）
- [x] Step 28: 手动创建 1H 行情段（右键起点/终点）
- [x] Step 29: Segment hit-test + selection
- [x] Step 30: Inspector 显示/编辑 segment narrative、tags、起终点信息
- [x] Step 31: Segment 与 PDA 手动关联，并记录 respected/swept/approached/rejected/delivered-through
- [x] Step 32: Segment localStorage 草稿与 Review export/import 扩展（PDA + Segment + PDA responses 复盘包）
- [x] Step 33: Segment 编辑闭环（删除、label 显隐、PDA response relation/note/remove）
- [x] Step 34: 选中 segment 时联动高亮已关联 PDA
- [x] Step 35: PDA response selected 开关控制关联 PDA 是否跟随 segment 高亮
- [x] Step 36: Segment 隔离模式（只显示当前 segment 与关联 PDA）
- [x] Step 37: 隔离模式下 segment 与关联 PDA 支持 hidden/highlight/normal 三态显示
- [x] Step 38: 新建/重新点选 segment 时重置所有 segment 组 object 为 highlight
- [x] Step 39: 隔离模式下禁用点选 segment 自动重置 response display mode
- [x] Step 40: 修复 display mode 语义：hidden 不渲染，isolate 下 segment normal 即时生效

### Phase 7: Segment Review Notes 研究设计
- [x] Step 41: 起草 Review Notes 设计方向（终点反转原因 = 关联 PDA + 反应方式）
- [x] Step 42: 实现只读 segment review metrics foundation（上一段对比、终点 K 线事实）
- [x] Step 43: 实现 PDA-specific terminal reaction metrics（range wick/body 进入深度、liquidity sweep/approach/equality、Fib level 反应）
- [x] Step 44: 实现 segment fluency 组件指标（先展示组件，不合成最终分数）
- [x] Step 45: Segment Inspector 增加只读 Review Metrics 预览
- [x] Step 46: 验证 5-10 个真实样例后，再决定是否做 controlled review selection 与 Review JSON 持久化；实际使用验证已完成，Segment Review Metrics 运行良好，且后续 Order Setup / Calendar / Phase 16 收口已覆盖更大的真实链路

### Phase 8A: Order Review / Execution Lens 设计
- [x] Step 47: 整理订单复盘设计文档 `v4/docs/ORDER_REVIEW_DESIGN.md`，参考 `v4/sessions/session_20260525_930_execution_lens.md`、旧 YAML schema 与 pendulum 示例，但不把旧 YAML 一比一搬进 V4
- [x] Step 48: 定义 `Order Review` 对象边界：不是简单 entry/exit 表，而是 `Setup Thesis -> Entry Plan -> Result Review`；订单理由不限制为上一段行情结束原因，允许前面多段结构、Composite Move、PDA、SMT、Reaction Evidence 的组合拳
- [x] Step 49: 定义 `Setup Thesis`：记录 primary event 的 1M 精确时间、事件周期、事件类型（sweep liquidity / touch FVG / touch NWOG/NDOG / SMT / other），并支持 `linkedObjectRefs[]` 引用多个 segment / composite / PDA / SMT / reactionEvidence；低周期 1M/5M 事件要提示是否违反“跟随高周期事件做单”的原则
- [x] Step 50: 定义 `Entry Plan` 子对象：direction、entry time/price（1M 精度）、entry model（OB / FVG / OTE / OTE+OB / sweep / manual）、stoploss、target internal/swing/external、selected target、final target；第一版人工录入，MAE/MFE 与自动 target hit 计算延后
- [x] Step 51: 定义 `Result Review` 子对象：expected target reached、final target reached、exit time/price、result、note；当前复盘阶段 result 使用 target1/target2/target3/stop-loss/breakeven/unknown，暂不混入 trading journal 的执行反应字段
- [x] Step 52: 设计 Inspector UI 入口：可从 segment/composite/空状态创建 Order Review，允许手工添加多个 setup linked refs，再在 Order 下添加 Entry Plan 与 Result Review；图表第一版只显示轻量 setup/entry/window marker，不做复杂下单 overlay
- [x] Step 53: 设计 Chart Rendering：setup/entry/exit vertical markers，SL/target short helper lines，Inspector Locate，第一版不做 hit-test、拖拽、右键菜单或图表创建订单
- [x] Step 54: 设计 localStorage 与 Review JSON schema：保存 order reviews、setup thesis、entry plan、result review、linked object refs；不写 DB，不包含 K 线数据
- [x] Step 55: 明确第一版非目标：不做自动信号、不自动判断 09:30 reversal / Silver Bullet 是否成立、不替代 1H structure backbone、不强迫订单绑定上一段 segment

### Phase 8B: Order Review MVP 实现
- [x] Step 56: 新增 `order/order-review-store.js`，实现 normalize、identity、add/update/delete、load/get、`order-review:changed`
  - [x] Step 56.1: 建立 `v4/src/order/` 目录与 `order-review-store.js`，定义 enums/constants：event type、ref type、ref role、direction、entry model、target type、stop reason、target reached、result、exit reason、confidence
  - [x] Step 56.2: 实现基础 normalize helper：string enum fallback、number/null、timestamp/null、note string、array 去重
  - [x] Step 56.3: 实现 `normalizeSetupThesis()`：primary event、primaryEventPrice、linkedObjectRefs 去重、lowTimeframeWarning 派生、higherTimeframeJustification/narrative/confidence
  - [x] Step 56.4: 实现 `normalizeEntryPlan()`：direction、entry timestamp/price、entry timeframe/model、stopLoss/stopReason、targets、selectedTargetType、finalTarget、riskPoints 派生
  - [x] Step 56.5: 实现 `normalizeResultReview()`：exit timestamp/price、result、note；旧 expected/final target reached、exitReason、outcomePoints/outcomeR 字段已在 Step 154 精简，结果派生改由 Setup Set/view-model 负责
  - [x] Step 56.6: 实现 `normalizeOrderReview()` 与 `getOrderReviewIdentity()`，保留 `id/createdAt/importedFromId`，更新 `updatedAt`
  - [x] Step 56.7: 实现 store API：`addOrderReview`、`updateOrderReview`、`deleteOrderReview`、`loadOrderReviews`、`clearOrderReviews`、`getOrderReviews`、`getOrderReviewById`
  - [x] Step 56.8: 每次变更 emit `order-review:changed`；运行 `node --check`，并用轻量 node probe 覆盖 normalize / identity / CRUD
- [x] Step 57: 新增 `order/order-review-persistence.js`，使用 localStorage key `v4:order-reviews:NQ` 保存/恢复工作草稿
- [x] Step 58: 新增 `ui/inspector/order-review-panel.js`，渲染 Order Reviews list、Setup Thesis、Entry Plan、Result Review compact panels
- [x] Step 59: 接入 `inspector-sidebar.js`，支持从 selected segment / selected composite / empty state 创建 Order Review，并支持 Locate/Edit/Delete
- [x] Step 60: 新增 `order/order-review-renderer.js`，渲染 setup/entry/exit markers 与可选 SL/target helper lines；支持日线/低周期时间映射
- [x] Step 61: 扩展 Review JSON export/import，加入 `orderReviews`，处理 normalize、id 冲突、semantic dedupe 与 missing linked refs
- [x] Step 62: 更新 `USER_GUIDE.zh-CN.md`、`USER_GUIDE.en.md`、`readme.md` 与 session handoff
- [x] Step 63: 验证 09:30 reversal、09:50 continuation/reversal、Silver Bullet、skipped、missed、invalidated、win/loss/breakeven 样例；运行 JS 语法检查与 `git diff --check`

### Phase 8C: Order Review Editing UI
- [x] Step 64: 设计编辑入口边界：第一版优先 Inspector 完整表单，其次图表 pick；不做拖拽、不做自动信号判断、不做统计页
- [x] Step 65: 扩展 `ui/inspector/order-review-panel.js`，为每条 Order Review 增加可折叠编辑区，支持 Setup Thesis / Entry Plan / Result Review 三组字段
- [x] Step 66: 实现 Setup Thesis 编辑：primary event time/timeframe/type/price、confidence、higher timeframe justification、narrative、low timeframe warning
- [x] Step 67: 实现 Entry Plan 编辑：direction、entry time/timeframe/price/model、stopLoss/stopReason、target internal/swing/external、selectedTargetType、finalTarget、note
- [x] Step 68: 实现 Result Review 编辑：exit time/price、result、note；旧 expected/final target reached、exitReason 编辑入口已在 Step 151/154 移除，outcomePoints/outcomeR 改由 Setup Set/view-model 派生
- [x] Step 69: 实现 linked refs 管理第一版：显示 refs，支持删除 ref；从当前选中的 PDA / segment / Composite Move / SMT 追加 ref
- [x] Step 70: 实现图表 pick 第一版：从 Inspector 按钮进入 pick mode，点击主图 K 线填入 setup / entry / exit timestamp；Escape 取消
- [x] Step 71: 实现价格 pick 第一版：点击主图 K 线后可选择 OHLC 或当前价格，填入 entryPrice / stopLoss / finalTarget；暂不做拖拽
- [x] Step 72: 验证完整录入链路：blank order、segment-derived order、composite-derived order、09:30/09:50/Silver Bullet 手工样例、localStorage 恢复、Review JSON 导出/导入

### Phase 8D: Chart-First Order Setup Workflow
- [x] Step 73: 重新定义 Order Setup 交互边界：图表右键为主入口，Inspector 只做轻量摘要、少量修正与 locate/delete；Segment/Composite/PDA/SMT 都只是 linked refs，不是订单父级
- [x] Step 74: 新增 active Order Setup 状态：创建后自动激活，后续图表右键操作写入 active setup；Inspector 可切换/取消 active
- [x] Step 75: 主图右键菜单新增 Order Setup 分组：Create Bullish/Bearish Setup Here、Set Setup Event、Set Entry、Set Exit、Set Entry Price、Set Stop Loss、Set Final Target
- [x] Step 76: PDA / SMT / Segment / Composite 右键命中时支持 Link To Active Setup；允许 1H/30M FVG 这类非 segment 事件直接作为 setup 依据
- [x] Step 77: 精简 `order-review-panel.js` 默认显示：只显示 active setup 摘要、核心字段、refs、note/result/locate/delete；完整表单移入高级折叠区或暂时弱化
- [x] Step 78: 更新文档与 user guide：强调 Order Setup 是中心对象，图表操作是主输入方式，Inspector 不是主录入面板
- [x] Step 79: 验证 chart-first 工作流：右键创建 setup、关联 PDA/SMT/segment/composite、设置时间/价格、localStorage 恢复、Review JSON export/import、headless smoke

### Phase 8E: V4 Frontend Refactor
- [x] Step 80: 拆分 `manual-annotation.js` 第一阶段：抽出 `order/order-setup-chart-actions.js` 与 `pda/manual-context-menu.js`，保持右键菜单与 Order Setup 行为不变
- [x] Step 81: 继续拆分 PDA 创建动作：BSL/SSL/FVG/IFVG/Wick CE/OB/Breaker/Fib 创建逻辑移出 `manual-annotation.js`
  - 新增 `pda/manual-pda-workflow.js` 管理 PDA 创建 UI workflow：BSL/SSL、FVG/IFVG、Wick CE、OB/Breaker range 起终点、Fib 起终点
  - `manual-annotation.js` 不再持有 range/Fib PDA 选择状态，也不再直接调用具体 PDA 创建 helper；它只负责主图右键上下文、菜单路由、非 PDA workflow 与全局取消/清理协调
- [x] Step 82: 拆分 Inspector action 层：Order Review / PDA / Segment / pick mode 从 `inspector-sidebar.js` 中分离
  - 新增 `ui/inspector/order-review-actions.js`，集中 Order Setup 创建、active、locate、显隐、refs/reasons、元素选择/删除/显隐，以及 PDA/Segment link active setup
  - 新增 `ui/inspector/pda-actions.js`，集中 PDA Inspector 的 label/extend/note/CE、删除与 point set remove-point 行为
  - 新增 `ui/inspector/segment-actions.js`，集中 Segment/Composite Inspector 写操作、Reaction Evidence 操作与 actor bar pick mode；`inspector-sidebar.js` 保留侧栏状态、Calendar/Archive/SMT、selection render 与 action controller 分发
- [x] Step 83: 拆分 chart primitives：按 Range/Liquidity/PointSet/Fib/Segment/VerticalLine 分文件，并保留 `chart/primitives.js` re-export
  - 新增 `chart/primitives/`：`range-primitive.js`（含 FVG）、`liquidity-primitive.js`、`point-set-primitive.js`、`fib-primitive.js`、`segment-primitive.js`、`vertical-line-primitive.js`、`bar-marker-primitive.js` 与共享 `primitive-utils.js`
  - `chart/primitives.js` 保留为兼容 re-export 入口；现有 renderer / chart manager import 路径无需修改

### Phase 8F: Order Setup Review Set Infrastructure
- [x] Step 96: 定义 Review Set 边界：内部把一个 Order Setup 视为一个 Review Set；现有 `OrderReview` / `orderReviews` 仍作为兼容持久化 schema；Review Set 只是图表交互、定位、日历聚合与可见性控制的基础抽象
- [x] Step 97: 新增 Review Set adapter：从 `getOrderReviews()` 派生 `getReviewSets()`、`getReviewSetById()`、`getReviewSetTimeRange()`、`locateReviewSet()`；第一版不改 localStorage key、不改 Review JSON 字段
  - 后续 Phase 12 cleanup 已废弃该独立 adapter；运行时 active bridge 和显示/定位均改为消费 `setup-set.js`
- [x] Step 98: 迁移 active Order Setup 语义：保留现有 active id 行为，但命名和调用路径逐步转向 active Review Set；右键菜单写入 active Review Set
- [x] Step 99: 重整 Inspector Order Reviews：默认显示 Review Set 列表与当前 active/focused set 摘要；详细编辑继续折叠，避免把输入表单堆满 Inspector
- [x] Step 100: Calendar 改为读取 Review Set adapter：日期归属、红色角标、对象 locate/open 都走 Review Set 派生信息，避免 Calendar 直接解析 raw order review 字段；已由 Phase 8G 的 Setup Set Calendar 适配覆盖完成
- [x] Step 101: Renderer 改为消费 Review Set：entry/stop/target/final target/exit 作为同一组图表标记绘制；后续 visibility/focus 可以一次控制整组；已由 Phase 8G 的 Setup Set renderer 覆盖完成
- [x] Step 102: 兼容性验证：旧 localStorage、Review JSON import/export、chart-first 右键创建、active setup 恢复、calendar locate、headless smoke 均保持可用；已由 Step 110 验收覆盖完成

### Phase 8G: Setup Set Tree Model
- [x] Step 103: 定义 Setup Set 数据边界：一个 setup 是大集，包含 `orderElements` 与 `explanationElements`；订单元素包括 reversal、entry(time+price)、stopLoss、targets[]、result；解释元素包括 refs[]、manualEvents[]、note；regime/bias 等不能图表化的内容写入 note
- [x] Step 104: 新增 Setup Set adapter：在不破坏现有 `orderReviews` schema 的情况下，从 `OrderReview` 派生 setup set tree；node probe 验证 reversal、entry、stop、targets、refs、note 映射正确
- [x] Step 105: 图表右键创建/设置订单元素：Create Bullish/Bearish Setup、Set Reversal、Set Entry(time+price)、Set Stop Loss、Set Target1/2/3、Set Final Target；交互验证图表实时显示、切换周期位置正确
- [x] Step 106: 图表右键添加解释元素：Link PDA/Segment/Composite/SMT Set To Active Setup、Add Manual Explanation Event Here；manual event 第一版记录 time、price 可选、timeframe、type、note；验证 30m FVG CE、1m sweep EQL 等自由理由可挂入 setup
- [x] Step 107: Setup Set 渲染：把 reversal、entry、stop、target1/2/3/final target 作为同一组标记绘制；active setup 更突出；多 setup 并存可分辨；不得使用遮挡 K 线的通贯竖线
- [x] Step 108: Inspector 改为 Setup Set 摘要面板：默认只展示 direction、reversal、entry、stop、targets、explanation count、note、result；order elements / explanation refs/events / note/result 放入折叠编辑区
- [x] Step 109: Calendar / Locate 适配 Setup Set：Calendar 按 setup set 聚合；有 setup 的日期红色角标；Locate 闪亮范围覆盖 setup 核心发生区域，不错误拉到自然日零点
- [x] Step 110: 兼容性与交互验收：旧 localStorage orderReviews、Review JSON import/export、chart-first 创建、刷新恢复、图表交互、Calendar locate、headless Chrome smoke、全量 node --check 均通过

Phase 8F/8G 接驳状态：`feature/order-review-cleanup` 已完成 Order Review -> Review Set -> Setup Set 的兼容迁移，并已合并到 `main`（merge commit `3a5af8c`）。持久化仍使用旧 `orderReviews` schema/localStorage key，运行时通过 adapter 派生 Setup Set tree。

### Phase 8H: Global Undo / Redo
- [x] Step 111: 定义 undo/redo 边界：覆盖所有研究对象修改，不覆盖 zoom/scroll/replay/hover/selection/pick mode/数据加载等临时视图状态
- [x] Step 112: 新增 `history/history-manager.js`：实现 `captureSnapshot()`、`restoreSnapshot()`、`recordHistory(label, mutator)`、`undo()`、`redo()`、`canUndo()`、`canRedo()`，并 emit `history:changed`
- [x] Step 113: 扩展 store 恢复接口：确认 `pda/segment/segment-group/smt/order-review` load 接口可用于 restore；为 `time-overlays` 增加显式 `loadTimeOverlaySettings()`；决定 Composite draft 是否纳入 snapshot
- [x] Step 114: 接入右键菜单写操作：PDA、1H Segment、Composite、SMT、Order Setup、Time Lines/Killzones、Clear 类批量操作全部通过 history transaction 包装；组合操作只入栈一次
- [x] Step 115: 接入 Inspector 写操作：PDA/Segment/Composite/SMT/Order Review 的编辑、删除、link/ref/evidence 变更通过 history transaction；文本输入按 change/blur 或 debounce 合并，避免每个 keypress 一步
- [x] Step 116: 增加全局快捷键与 UI 状态：`Ctrl/Cmd+Z` undo，`Ctrl/Cmd+Shift+Z` 与 `Ctrl+Y` redo；输入控件聚焦时保留浏览器原生撤销；可选 toolbar icon 按钮与 status 提示
- [x] Step 117: Undo/Redo 验收：覆盖新增/删除/编辑 PDA，创建/清空 Segment，Order Setup entry/stop/target/link，Clear PDA/Segments/Killzones，Inspector note 单步撤销，Review JSON import 策略，刷新/初始化不污染 undo 栈

Phase 8H 收尾状态：已在 `main` 合并。后续 review 修复补齐了 SMT 创建、NDOG/NWOG 显隐的 undo/redo 覆盖，并把 NWOG replay 可见范围改为渲染期计算，避免回放过程中写回 PDA store。BSL/SSL 默认延伸也已修复：没有显式 extend 时按当前图表周期默认 8 根 K 线显示，不再因 `D high/D low` context 被误换算成 1H 192 根或 4H 48 根。

### Phase 9: Time Overlays / Calendar Review Navigator
- [x] Step 84: 明确 Phase 9 边界与数据原则：新增 `time-overlays/` 与 `calendar/` 独立模块；overlay 状态只影响视觉显示，不写入 PDA / Segment / SMT / Order Review 对象；Calendar Index 只读取各 store 并生成派生索引
- [x] Step 85: 实现共享时间坐标 helper：支持 exact bar timestamp 与 1H/4H 内部时间点插值，解决 09:30/09:50/10:00 在高周期 K 线内部没有 exact bar 的定位问题；主图 overlay、calendar locate、hit/hover 未来共用
- [x] Step 86: 实现 Time Overlay Store：保存 show/hide、selectedDate、day-boundary 开关、可自由增删改的 event-times 列表、killzone 配置；event time 默认为空，不自动生成 09:30/09:50/10:00，必须由用户按需添加；第一版只存在前端会话，确认稳定后再决定 localStorage
- [x] Step 87: 实现基础 Time Marker Primitive/Renderer：绘制自然日边界竖线与 event-time 竖线；event-time 绑定具体 date + time，不复制到每天同一时间；仅在 4H 及以下周期显示；自然日边界和 event-time 使用不同颜色；线条略粗但低透明，避免遮挡 K 线细节
- [x] Step 87.1: 将 Time Overlays 接入右键菜单：支持在当前 K 线添加具体日期时间线、删除当前日期时间线、清除全部手工时间线；新增 Grid 开关用于显示/隐藏 LightweightCharts 原生背景网格，主图与副图同步应用
- [x] Step 88: 实现 Killzone 顶部 band：贴近 canvas 上边缘绘制横线/细带，不依赖价格坐标；支持多个手工命名 killzone 并存；每个 killzone 绑定 date + start/end time；右键菜单支持 Start/End 创建、命名、重命名、删除、清空；重叠 killzone 自动分层显示，暂不内置固定 preset
- [x] Step 89: 实现 Calendar Navigator 跳转第一版：顶部工具栏提供 Calendar/Date 入口，点击弹出单月日历 popover；支持上一月/下一月、点击某一天；第一版只做单日跳转，不做 date range，不做 This Week/Next Week 等快捷项；点击日期默认定位到当日 09:30，若目标在当前加载区间内直接调用 viewport 定位，若不在区间内则自动加载目标日附近数据后定位；不自动写 selectedDate，不过滤 Time Markers/Killzones
- [x] Step 89A: 合并顶部 `开始/结束` 输入与 Calendar，改为 Date Range Calendar：toolbar 常驻只保留一个 Date Range 控件（显示当前加载范围）和加载动作；点击后弹出双月 calendar，可选择 start/end 日期并加载该范围；提供 `Load Week` / 单日跳转到 09:30 的快捷动作；精确到分钟的 start/end 输入移入 popover 的 advanced/manual fields，不再常驻占用顶部空间；保留当前 API 的 `YYYY-MM-DD HH:mm` 请求格式与 `formatTimeInput` 兼容能力
- [x] Step 90: 实现 Calendar Review Index：按自然日聚合 Order Setup / PDA / Segment / Composite / SMT；Order Setup 归日优先级为 entryTimestamp -> setup primaryEventTimestamp -> exitTimestamp；Reaction Evidence 第一版挂在所属 Segment/PDA response 下，不做顶层对象
- [x] Step 90A: Date Range Calendar 易用性补强：成功加载后把 `start/end/timeframe` 写入本地 history ranges，支持一键 Load History Range、单条删除、清空历史；Date Range popover 增加 `<<` / `>>` 年切换，保留 `<` / `>` 月切换
- [x] Step 91: 实现 Calendar Day Details 第一版 UI：点击/打开某日后显示当天对象列表，分组顺序为 Order Setups、SMT、PDA、Segments、Composite、Killzones/Time Lines；Order Setups 默认展开；先接在 Calendar popover 或右侧面板中，不做完整月历角标
- [x] Step 92: 实现对象级操作：Day Details 中每个对象支持 Locate；可选中对象时同时 Select 并打开 Inspector；Focus 第一版可复用 Structure Sets focus 语义，暂不写入对象数据
- [x] Step 93: 实现完整月历 UI 与 setup 红色角标：月历日期格显示当天对象概览；当天存在 Order Setup 时显示红色 badge/dot，第二版可显示数量；点击有 badge 的日期默认展开 Order Setups 区域
- [x] Step 93A: Split Screen 副图同步补强：Inspector Calendar 选日与对象 Locate 同时定位/快闪副图；Time Overlay 的 Days / Killzone / Time Line primitives 在副图加载、Days 开关变化、Split 清空/关闭时同步渲染或清理；Grid 开关继续同时作用于主图和副图
- [x] Step 94: 联动 selectedDate 与 overlays：Calendar 选中某日后，手工 Time Lines / Killzone 默认只显示该日；自然日 Days 边界始终显示加载区间内全部日期，避免首次换日后除首日外的 day 竖线消失；允许手工切换显示日期，避免一次加载多日时手工 overlay 过多
- [x] Step 95: 验证与视觉验收：覆盖 1M/5M/15M/1H/4H；检查自然日边界、09:30/09:50/10:00、killzone、calendar locate 与对象 locate 一致；确认线条不遮挡 K 线细节，Split Screen 开启时主图行为不受副图影响
  - Headless Chrome harness 覆盖 `2012-01-03 00:00` 到 `2012-01-05 23:59` 的 1M/5M/15M/1H/4H 加载与 Calendar range 渲染
  - 验证手工 Time Lines `09:30 / 09:50 / 10:00` 与 `NY Open 09:30-10:00` Killzone 出现在 Calendar Day Details
  - 验证 Calendar 选日写入 selectedDate、显示 `All loaded days` 恢复入口，并定位到当日 09:30
  - 验证 Calendar 对象 Locate 状态路径可用；Split Screen Side 开启后副图加载并渲染 canvas，主图 canvas 保持渲染

### Phase 10: Secondary Chart Annotation Workflow
- [x] Step 118: 定义 chart context 边界：新增 `chart/chart-context.js`，用统一 context 描述 primary / secondary 的 chart、series、bars、timeframe、coordinate 转换、primitive attach/clear 与基础事件订阅；当前只作为后续接入基础，不改变现有主图/副图行为，secondary context 标记为 `readonly=true`
- [x] Step 119: 抽离 PDA 创建动作：把 `manual-annotation.js` 中依赖主图单例的 PDA 创建流程拆成可接受 chart context 的 action/helper；第一步保持只调用 primary context，确保主图右键行为不变
- [x] Step 120: 副图右键菜单 MVP：在 secondary chart 上接入独立 context menu 入口，只暴露经过允许的只读/创建项；不复用主图 DOM 状态导致菜单互相覆盖
- [x] Step 121: 副图 PDA 创建 MVP：支持在副图上创建 BSL/SSL，记录 `sourceChartId/sourceInstrument/sourceTimeframe`，并复用现有 PDA store / Review JSON；基础 range PDA 留到 Step 122/后续映射验证后启用
- [x] Step 122: PDA 主副图渲染一致性：确认副图创建的 PDA 能按现有 renderer 规则在主图/副图显示或投影；补齐 label、extend、CE、hit-test 的 timeframe 映射
- [x] Step 123: 副图 PDA hit-test / select / Inspector：副图点击 PDA 能选中同一 annotation 并打开 Inspector；Inspector 编辑、删除、note、extend 与 undo/redo 继续作用于同一 PDA store
- [x] Step 124: 副图 PDA link 到 active setup：允许从副图 PDA 关联当前 active Order Setup，并在 setup/review JSON 中保留来源 chart/timeframe 信息
- [x] Step 125: Review JSON / localStorage 验证：验证副图创建 PDA 的刷新恢复、export/import、undo/redo、Calendar index 与 Locate/Open 行为
- [x] Step 126: 副图 Segment 设计冻结：明确副图 segment 复用同一 Segment store，以 source chart/instrument/timeframe metadata 区分来源；字段、显示规则、selection/Inspector、Calendar/archive、link 到 setup 规则已写入 `docs/SECONDARY_SEGMENT_DESIGN.md`
- [x] Step 127: 副图 Segment MVP：按 Step 126 决策实现副图起终点选择、创建、渲染与基础 Inspector 查看
- [x] Step 128: 副图 Segment link 到 setup：支持把副图 segment 作为 HTF structure evidence 关联到 active setup / setup set
- [x] Step 129: 副图 Segment 验证：覆盖主图 1M 找 setup、副图 1H/4H 做结构标注的真实流程；验证 Review JSON、Calendar、undo/redo、Split on/off 与 replay 不回归

### Phase 11: Secondary Chart FVG Workflow
Phase 11 收尾状态：已在 `main` 合并；副图 PDA/Segment/FVG 创建、source metadata、setup-link、持久化、命中/Inspector 与主副图时间定位对称功能已完成。
- [x] Step 130: 副图 FVG 设计冻结：明确副图 FVG 复用现有 PDA store 与 `type='fvg'` range annotation；冻结 source metadata、contexts、渲染/命中/Inspector、setup-link 与 archive 边界，写入 `docs/SECONDARY_FVG_DESIGN.md`
- [x] Step 131: 副图 FVG metadata hardening：让 `addManualFvg()` 与 point PDA 一样写入 `sourceChartId/sourceChartLabel/sourceInstrument/sourceTimeframe/sourceTimeframeLabel/sourceContext`，并让 contexts 同时包含来源与结构标签；主图 FVG 行为不变
- [x] Step 132: 启用副图 Mark FVG：在副图右键菜单开放 `Mark FVG`，用 secondary context 调用现有 FVG 识别/创建流程；无有效三根 FVG 时只提示不创建
- [x] Step 133: 副图 FVG 渲染/命中/Inspector 验证：确认副图创建的 FVG 可在主图/副图显示、命中选择、打开 Inspector、编辑 note/extend、删除，并支持 locate/flash
- [x] Step 134: 副图 FVG link setup 验证：确认副图 FVG 能作为 PDA evidence 关联 active Order Setup / setup set，setup ref 保留来源 chart/instrument/timeframe/context
- [x] Step 135: 副图 FVG 持久化与 workflow 验证：覆盖 localStorage、PDA JSON、Review JSON、undo/redo、Split on/off、Replay Bar On；确认主图 1M 找 setup + 副图 1H/4H 标 FVG 的真实流程不回归

### Phase 12: Order Setup Cleanup
- [x] Step 136: Order Setup cleanup 分支启动与术语收敛：从 `main` 创建 `feature/order-setup-cleanup`；第一步把 Inspector 用户可见的 `Review Sets` / `Order Review` 创建提示收敛为 `Order Setups` / `Order Setup`，保留底层 `orderReviews` schema 不变
- [x] Step 137: 梳理 chart action 边界：清理 `order-setup-chart-actions.js` 中旧动作分支、缩进噪声和重复状态提示；建立 action map，保证右键菜单只暴露当前实际支持的 Order Setup 动作
  - Step 153 已完成实际收敛：`ORDER_SETUP_PATCH_ACTIONS` / `ORDER_SETUP_LINK_ACTIONS` 成为 chart action map，旧的宽泛 prefix 分支和重复状态提示已移除
- [x] Step 138: 收敛 Setup Set / Review Set adapter 使用：明确运行时优先消费 `setup-set.js`；保留 `order-review-set.js` 仅作 active/兼容桥，避免 Calendar/Renderer/Inspector 各自解析 raw order review
  - Step 150/152/156 已冻结边界：Calendar、renderer、hit-test、locate 与 Active Inspector 消费 Setup Set 或其派生 helper；`order-review-set.js` 仅保留 active id / legacy bridge，不再作为新显示权威
  - 后续收敛已完成：`order-review-active.js` 改为直接通过 `setup-set.js` 派生 active setup；Setup Set 保留 `orderReview` alias 兼容旧调用，`order-review-set.js` 当前无运行时 import，仅作为 legacy adapter 文件保留
  - Legacy adapter 文件已删除；`order-review-active.js` 保留旧 public function 名称，但返回的运行时对象是 Setup Set
- [x] Step 139: Inspector Order Setup 面板整顿：默认只显示 active/current setup，不再罗列全部 setup；order elements、explanation elements 和少量动作保留在当前 active setup 中；Advanced Edit 继续折叠，创建/删除/active/locate/show-hide 文案统一为 Order Setup；支持单个 setup 显/隐以处理多 setup 重叠
- [x] Step 140: Order Setup linked refs 整顿：统一 PDA/Segment/Composite/SMT ref label、source metadata、去重与删除交互；确保副图来源信息在 Inspector 中可读
- [x] Step 140A: Inspector 导航收敛：默认空状态只保留 Calendar + Active Order Setup + 折叠 Archive；不再常驻罗列 SMT Evidence / Structure Sets，相关对象通过 Calendar Open 或图表选择进入详情
- [x] Step 141: Order Setup renderer/locate 验证：确认 reversal 以单根 K 线小三角标记呈现，不再画价格线段；entry/stop/targets/result 绘制、active highlight、Calendar locate、Replay/Split 不回归
- [x] Step 142: 持久化兼容验证：localStorage、Review JSON import/export、undo/redo 仍使用 `orderReviews` schema；`display.hidden` 兼容旧数据且 import/export 不丢失；外层 UI 语言切换为 Order Setup 不破坏旧数据
- [x] Step 143: 文档与 handoff：更新 Order Setup 用户说明、架构边界与后续是否迁移 schema 的决策记录
- [x] Step 144: Reversal anchor 归属规则落实：`Create Bullish/Bearish Setup Here` 创建新 setup 并把点击 K 线作为该 setup 的唯一 primary reversal；后续 entry / stop / targets / reason / result 只写入当前 active setup；不按最近 reversal 自动归属；允许多个独立 setup 共享同一 reversal bar；考虑移除 `Set Reversal Here` 或改名为 `Move Active Reversal Here`
  - 创建路径通过 `createChartReviewSet()` 写入该 setup 的 `setupThesis.primaryEventTimestamp` 并设为 active；后续 chart action 统一通过 `updateActiveReviewSet()` 写入当前 active setup，不做最近 reversal 自动归属
  - 右键菜单文案已收敛为 `Move Active Reversal Here`，表达这是移动当前 active setup 的 reversal，而不是创建/归属到最近 reversal
- [x] Step 145: Active Order Setup UI 重建：抛弃旧 Setup Thesis / Entry Plan / Result Review 表单式容器；按新逻辑实现 Header / Anchor / Execution / Reasons / Result 四段式 active setup 面板；Inspector 只展示当前 active setup 状态与轻量操作，主要录入仍来自图表右键 active setup 动作
- [x] Step 146: Order Setup 锚点与列表显隐补强：Calendar 的 Order Setups 列表提供 Hide/Show；entry/stop/target/final target 写入时必须命中某根 K 线有效 high/low 范围，否则报错不写入；stop/target/final target 保存各自鼠标锚点 timestamp/timeframe 并从该锚点起画线，旧数据 fallback 到 entry 起点
- [x] Step 147: Order Setup element interaction 设计落实：建立 order setup element hit-test 与 selection 状态；reversal / entry / stop / target / final target 都可选中；选中后可控制 helper line 长短并可删除该元素；右键 reversal marker 区域显示命中的 setup 列表，支持 Set Active / Clear Active，多个 setup 共享同一 reversal bar 时从菜单选择具体 setup；第一步先实现 reversal marker 右键命中与 active/close 菜单
  - Step 147A-X 已完成 umbrella 范围：reversal marker 右键可在共享 reversal 的多个 setup 中 Set Active / Close / Hide / Delete；entry、stop、target1-3、final target 支持 hit-test、selection、Execution 行双向选中、Shift 右键时间终点控制线段长度、单元素删除和单元素显隐
  - Reversal 主锚点按当前设计作为 setup identity/anchor 管理，不作为可单独删除的 execution element；需要调整时使用 `Move Active Reversal Here`
- [x] Step 147A: Reversal marker 右键 MVP：新增 order setup element hit-test；右键命中 reversal 三角区域时菜单显示命中的 setup 列表；支持从共享 reversal 的多个 setup 中选择 Set Active，并支持 Close Active Setup
- [x] Step 147B: Active reversal marker 高亮：普通 bullish reversal 保持绿色上三角，普通 bearish reversal 保持红色下三角；active setup 的 reversal marker 除了变大，还切换为黄色
- [x] Step 147C: Active setup Inspector 自动聚焦：从 reversal 菜单或其它入口 Set Active 某个 setup 后，自动打开 Inspector，刷新到默认面板，并滚动定位到 Active Order Setup；Clear/Close Active 只刷新，不强制弹出
- [x] Step 147D: Entry / stop / target element 编辑 MVP：entry / stop / target1-3 / final target 可命中并选中；Inspector 显示选中元素；支持按 bars 调整 helper line 长度；支持删除单个 entry/stop/target 元素；暂不删除 reversal 主锚点
- [x] Step 147E: Entry / stop / target 时间锚定终点：普通右键继续设置线段起点；Shift+右键设置 entry/stop/target/final target 终点；保存起点/终点时间，切换周期时按时间重新投影线段长度；Length bars 仅作为旧数据/无终点 fallback
- [x] Step 147F: Execution 双向元素选择 UI：把 Selected Element 合并进 Execution；图表 helper line 与 Execution 行可双向选中并着重显示；delete 改为紧凑 X；Length bars 改为紧凑数字输入，不再占用独立面板空间
- [x] Step 147G: Order Setup OHLC Magnet Anchor：entry/stop/target 起点设置时，鼠标价格在 K 线 high/low 内保留原价；若在范围外但接近 high/low，自动吸附到最近 high/low；超过容错才报错；状态提示说明实际吸附价格
- [x] Step 147H: Active setup 同步 Inspector Calendar 日期：从图表/右键/Execution 选中或激活 setup 时，Inspector 跳到 Active Order Setup 的同时，将 Calendar selected/view date 同步到该 setup 所属自然日，并刷新当天事件列表
- [x] Step 147I: Target free-price anchor：target1-3/final target 起点允许不落在 K 线 high/low 范围内；若靠近 high/low 仍自动 magnet；entry/stop loss 继续要求有效 K 线范围或 high/low magnet；target 自由价格仍记录点击 K 线时间作为左端点
- [x] Step 147J: 移除 Execution Length 数字输入：helper line 长度以右键起点 + Shift 右键终点为准；删除 Inspector Execution 行内 Length 数字框和对应更新 handler，避免数字初始值/行为误导
- [x] Step 147K: Reason 1 MVP：Reasons 不再按 Add PDA/Segment/Composite/SMT 分类型按钮；先实现一个 Reason 1，支持自由 note，支持一个通用 Link Selected Object 自动识别当前选中 PDA/Segment/Composite/SMT 并挂入 refs；refs 可单独移除；底层暂复用现有 narrative + linkedObjectRefs
- [x] Step 147L: Execution 行列式对齐：将 entry / stop / target 行拆成 Type / Price / Time Range / Kind 四列，保持类型、价格、时间段、顶点/模型类型等字段纵向对齐；保留行选中与紧凑 X 删除交互
- [x] Step 147M: Execution 两行紧凑布局：修正 147L 单行列式过宽问题；第一行对齐 Type / Price / Kind / X，第二行展示完整 Time Range，避免 Inspector 横向滚动并保留选中/删除交互
- [x] Step 147N: 多 Reason MVP：新增 `setupThesis.reasons[]`，支持 Add Reason、删除空 reason、每个 reason 独立 note/refs；Link Selected Object 挂到对应 reason；旧 `narrative + linkedObjectRefs` 自动映射为 Reason 1 兼容显示与编辑
- [x] Step 147O: Order Setup 默认隐藏与 helper line 配色：新创建的 Order Setup 默认 `display.hidden=true`；entry/stop/target helper line 变细；Long Entry 墨绿色、Short Entry 红色、Stop Loss 蓝色、Target 紫色；不改变旧记录缺省显示兼容
- [x] Step 147P: Reversal 右键隐藏 setup：图表 reversal 右键菜单增加 Hide Setup，隐藏整个 setup；曾评估的排它/并存显示模式已撤销，不保留 Inspector 开关，避免扰乱显隐逻辑
- [x] Step 147Q: Calendar Order Setup 行三点菜单：把 Order Setups 列表中的 Locate / Open / Hide(Show) 收进紧凑三点菜单，减少行宽占用；菜单动作复用现有 locate/open/toggle hidden 行为
- [x] Step 147R: Calendar/Reversal 删除 setup 菜单：Calendar Order Setup 三点菜单增加 Delete；图表 reversal 右键菜单增加 Delete Setup；删除整个 setup 并复用历史记录/active 清理逻辑
- [x] Step 147S: Order Setup 默认显示：撤回 147O 的新建默认隐藏策略；图表右键、空白、Segment、Composite 创建的 Order Setup 默认 `display.hidden=false`，保留手动 Hide/Show 与旧记录兼容
- [x] Step 147T: Calendar Order Setup 显隐状态按钮：Order Setup 行内增加紧凑显隐状态点；绿色表示 visible，灰色斜线表示 hidden；点击状态点直接切换 Show/Hide，三点菜单继续保留完整操作
- [x] Step 147U: Entry Context 结构化描述：在 Active Order Setup 的 Execution 与 Reasons 之间增加 Entry Context；`entryPatterns[]` 多选支持 Purge + OB / OTE / Stop Market / Key Level；`entrySession` 单选支持 930 Judas Swing / 950 Macro / Silver Bullet
- [x] Step 147V: Result 复盘选项整理：物理移除 win/loss/missed/skipped/invalidated/managed-out；Result 下拉改为 Target 1 / Target 2 / Target 3 / Stop Loss / Breakeven / Unknown
- [x] Step 147W: Risk/Reward Box：用 `display.showRiskRewardBox` 控制每个 setup 的 risk/reward box 显隐；risk 区间由 Entry -> Stop Loss 派生，reward 区间按 Result 的 Target 1/2/3 派生，Unknown/Stop Loss/BE 不画 reward
- [x] Step 147X: Result 静态派生摘要：Result 为 Target 1/2/3、Stop Loss、Breakeven 时，从 Entry/Stop/Target 派生 Exit price、Points、R；暂不扫描 K 线寻找第一次触达时间

### Phase 12B: Order Setup 收敛审计与清理
- [x] Step 148: 冻结 Order Setup 新功能入口：本轮只修 bug、清理残留、合并重复逻辑；不再新增新的复盘概念、字段或大型 UI 区块，避免继续扩大混乱面
- [x] Step 149: 做 Order Setup 残留代码审计：检查 `order-review-panel`、`order-review-store`、`setup-set`、`order-setup-chart-actions`、renderer/context menu/calendar 里是否还残留旧 Review Sets、旧 Result Review 表单、废弃 action、重复 helper 和无用兼容字段；输出可执行 cleanup 清单
  - Cleanup finding A: `order-review-panel.js` 仍保留旧完整列表/表单路径：`renderOrderRow`、`renderOrderActions`、`renderOrderEditor`、`renderSetupThesis/EntryPlan/ResultReview`，但当前 `renderOrderReviewPanel()` 只渲染 active setup；后续 Step 151 可删除死 UI 路径及其旧文案
  - Cleanup finding B: `inspector-sidebar.js` 仍保留旧 Advanced Edit 的通用字段/pick handlers；其中 `display/reason/result/element` 仍被新 UI 使用，`setupThesis/entryPlan/resultReview` 完整表单 handlers 需在 Step 151 逐项删减，避免误删新 UI 依赖
  - Cleanup finding C: `order-review-set.js` 与 `setup-set.js` 是两套运行时 adapter；active 层仍返回 Review Set，renderer/hit-test/Inspector 已主要消费 Setup Set；Step 150 应明确 Setup Set 为图表/Inspector 权威派生层，Review Set 只保留 active/compat bridge 或被并入
  - Cleanup finding D: Result points/R 目前在 `order-review-store.js` 和 `setup-set.js` 两处派生；Step 152 应统一为 Setup Set/view-model 派生，store 只负责 normalize 明确输入
  - Cleanup finding E: helper line length/time projection 在 renderer 与 hit-test 各算一套；Step 152 应抽共享 helper，避免渲染长度与命中区域漂移
  - Cleanup finding F: `ORDER_EXIT_REASON_DEFINITIONS` 曾包含 trading-journal 风格值（model-invalidated/missed-entry/skipped）；当前 Result UI 不再使用 exit reason，已在 Step 154 删除
- [x] Step 150: 权威数据源审计：明确 `orderReviews` 持久化 schema、运行时 `Setup Set` 派生层、Inspector view model、renderer element model 各自职责；找出同一概念多处重复存储/重复计算的位置，优先保留一个权威来源
  - Authority decision A: `orderReviews` 只作为兼容持久化 schema/localStorage/Review JSON/undo snapshot 的权威输入，不再作为图表或 Inspector 直接渲染模型
  - Authority decision B: `Setup Set` 是 Order Setup 的运行时/view-model 权威层；renderer、hit-test、Calendar object open/locate、Active Inspector 都应消费 Setup Set 或 Setup Set 派生 helper
  - Authority decision C: 旧 `order-review-set.js` adapter 已删除；active id 仍由 `order-review-active.js` 管理，但派生对象直接来自 Setup Set，不再维护 Review Set summary
  - Authority decision D: result summary、risk/reward box、execution rows、helper line projection 都是派生视图状态；优先放在 Setup Set 或共享 projection/result helper，不写回 store
  - Authority decision E: Inspector 只负责编辑明确的 persisted fields（entry/stop/target endpoint、reason refs/note、entry context、display flags、result status/note），不自己重新计算业务派生值
  - Authority decision F: renderer/hit-test 共享同一 element projection 语义；后续 Step 152 把 endTimestamp/lineLength fallback 抽到共享 helper
- [x] Step 151: 清理旧 UI 与入口：删除或隐藏已经不用的 Review Sets/Advanced Edit/旧 Result Review/旧 Setup Thesis 路径，只保留 Calendar、Order Setups 列表、Active Order Setup、Archive import/export 等当前有效入口
  - Removed dead `order-review-panel.js` full-row/form render path: old Setup Thesis / Entry Plan / Result Review / Advanced Edit / Quick Review renderers and their unused input helpers
  - Removed old Order Setup time/price pick state and handlers from `inspector-sidebar.js`; chart-first entry/stop/target endpoint workflows remain in `order-setup-chart-actions.js`
  - Kept Active Order Setup UI, Calendar Order Setups, Archive import/export, entry context, reasons, result status/note, display flags, element select/delete, and active/locate/hide/delete actions
- [x] Step 152: 合并重复计算与格式化 helper：统一 result/risk-reward/execution line/time range/visible-hidden state 的派生函数，避免 Inspector、renderer、store 各自算一套
  - Added `order-setup-projection.js` as shared renderer/hit-test projection helper: timestamp mapping, display bar lookup/index, `lineLengthBars` fallback, projected zone end, bar spacing, line end coordinate
  - Updated renderer and hit-test to share `endTimestamp -> lineLengthBars -> default length` semantics
  - Stopped deriving result points/R in `order-review-store`; store now normalizes explicit result input while Setup Set/view-model derives displayed Target/Stop/BE summary
- [x] Step 153: 清理右键菜单与 chart actions：收敛 reversal/entry/stop/target/reason/result 相关 action map，确认菜单只显示当前可执行动作；删除旧分支和重复状态提示
  - 已把 `order-setup-chart-actions.js` 中 active setup 的 reversal/entry/stop/target/final target 更新动作收敛到 `ORDER_SETUP_PATCH_ACTIONS`
  - 已把 PDA/Segment/Composite/SMT link 动作收敛到 `ORDER_SETUP_LINK_ACTIONS`
  - 已移除旧的长 if/else 分支和重复状态提示；handler 只接受已登记的 Order Setup action，避免未知 action 被误吞
- [x] Step 154: 清理旧字段兼容策略：在不导入旧数据的前提下，移除已明确废弃的 result 值、旧 Review Set 文案和无意义 fallback；保留 `orderReviews` schema/localStorage key 直到单独 migration
  - Removed `ORDER_TARGET_REACHED_DEFINITIONS` / `ORDER_EXIT_REASON_DEFINITIONS` and their values/valid sets/alias maps from `order-review-store.js`
  - Simplified `normalizeResultReview()` to persisted review fields still used by current UI: `exitTimestamp`、`exitPrice`、`result`、`note`
  - Removed legacy `expectedTargetReached` / `finalTargetReached` / `exitReason` from Setup Set and Review Set runtime adapters
  - Removed store fallback for persisted `outcomePoints/outcomeR`; displayed Points/R remain derived by Setup Set/view-model from entry、stop、result target/exit
- [x] Step 155: 回归验证 Order Setup 主路径：覆盖 create bullish/bearish setup、set active/close/hide/show/delete、entry/stop/target 起止点、reason add/link、entry context、result target/stop/BE、risk/reward box、calendar locate/open、undo/redo、import/export、split/replay 基本不回归
  - Module smoke covered chart-created setup, active/close, show/hide, delete, entry/stop/target/result derivation, reason link, calendar grouping, undo/redo snapshot restore, and import-shaped normalize/add
  - Full `v4/src/**/*.js` syntax check passed
  - Local page smoke passed on `http://127.0.0.1:8001/index.html`; toolbar, split controls, replay controls, Inspector, archive controls, and chart canvas rendered
- [x] Step 156: 收尾文档与剧本：把实际 cleanup commit、验证结果、保留的兼容边界、下一阶段迁移建议写入 TODO / sessions / order setup 剧本
  - Cleanup commit range: `33ea5f3` -> `dfda684`，核心收敛提交包括 `5b6d2e9`、`8d54190`、`937720c`、`bac8f05`、`dfda684`
  - 保留兼容边界：`orderReviews` localStorage key / Review JSON 字段名仍保留；active bridge 已直接消费 Setup Set；当前不做 DB migration
  - 后续建议：短期只修回归 bug；如果继续拆分，优先把 active bridge、archive import/export、inspector handlers 做小步拆分；trading journal 字段另开阶段，不回塞到当前 review result
  - Review fix: Review JSON import now remaps `setupThesis.reasons[].refs` as well as legacy `linkedObjectRefs`; Active Order Setup auto-focus now uses a stable section selector instead of the last Inspector section
  - Merge status: `feature/order-setup-cleanup` 已 fast-forward 合并到 `main`，合并后全量 `v4/src/**/*.js` 语法检查、`git diff --check HEAD~1..HEAD`、本地页面 `8001/index.html` HTTP smoke 均通过
- [x] Step 157: Execution element 显隐开关：Active Order Setup 的 Execution 行增加状态点开关，可单独隐藏/显示 Entry、Stop Loss、Target1/2/3/Final Target；隐藏状态写入 `display.elementVisibility`，renderer、hit-test、risk/reward box 同步尊重该状态
- [x] Step 158: Split layout 默认 Side：副图 Layout 默认值从 `stack` 改为 `side`；Split off 时仍可预设 layout，打开 Split 后默认左右布局
- [x] Step 159: Context reset handoff：记录 `main` 当前收口点、最近提交、未跟踪文件与下一步建议；用于执行 `new` 清空 context 后继续接手
- [x] Step 160: Execution 删除残留修复：Active Order Setup 的 Execution 面板与图表 renderer 改为按 Setup Set `complete` 状态判断 entry/stop 是否可显示，避免删除元素后留下 `0.00` 行或不完整 helper line 残影
- [x] Step 161: Order Setup 里程碑收尾：Phase 12/12B 工程收敛阶段结束；不继续预设新功能 step，下一阶段进入真实使用与样例复盘，在实际流程中发现并记录 bug、缺口与交互摩擦

### Phase 13: Large Range / 1m Performance Guard
- [x] Step 162: 加载范围保护：新增单次图表窗口上限 policy，Toolbar 与 Calendar 在请求 `/v4/bars` 前按 timeframe 校验范围；1m 单次窗口最多 45 天，超出时不直接全量加载，提示缩小窗口或等待窗口模式接管长期区间
- [x] Step 163: 缓存 display bars：`bar-store.setBars()` 写入数据时一次性派生并缓存用户请求范围内的 display bars，`getDisplayBars()` 不再每次调用都对含 padding 的全量 bars 执行 filter
- [x] Step 164: 1m 窗口加载模式第一版：1m 长区间请求不再直接失败；Toolbar 与 Calendar 会保存外层研究范围，并先加载从 start 开始的 45 天图表窗口，状态栏提示当前窗口与外层范围；副图/Replay 跟随当前窗口
- [x] Step 165: Calendar 跳转触发 1m 窗口切换：在 1m 外层研究范围内点击/跳转到当前窗口外的日期时，自动加载目标日期附近的 45 天窗口并定位；无外层范围时保留原来的周窗口加载行为
- [x] Step 166: 图表手动切换 1m 窗口：主图 viewport 控制条在 1m 窗口模式下显示 Prev/Next Window 按钮，按 45 天步长在外层研究范围内切换窗口，并同步 toolbar 当前窗口范围
- [x] Step 167: Phase 13 收口验证：覆盖长/短 1m、1H、Calendar 目标窗口、Prev/Next 边界、displayBars 缓存、全量 JS 语法、Web/API smoke；确认 1m 长区间已从一次性全量加载改为 45 天窗口化使用
- [x] Step 168: Replay cursor 视觉修复：副图 replay cursor 改为主图同款半透明宽竖带，避免 1px 亮线遮挡 K 线影线；主图与副图 replay cursor 底部增加精确时间标签，便于对齐 FXReplay 式回放读数

### Replay History / 使用修复
- [x] Step 169: Replay History 数据模型：新增 `replay-history-store.js`，定义 localStorage key、最多 10 条 history、主图窗口/outerRange、replay cursor、split 状态的数据结构，并提供 normalize / save / list / delete / clear 基础能力；不保存 K 线数据
- [x] Step 170: 自动保存 Replay checkpoint：新增 `replay-history-persistence.js`，Replay cursor、bars 加载、Split 设置变化时 debounce 保存有效 checkpoint，页面关闭前 flush；关闭 Replay 后不删除 history
- [x] Step 171: Replay History UI：Replay 控制条增加 History 入口，显示最近记录、窗口范围与 Split 状态；Delete/Clear 可操作；Load 按钮先展示但恢复动作留给 Step 172
- [x] Step 172: 手动恢复 Replay workspace：点击 history 后恢复主图窗口、1m outerRange、Split 状态，并按 cursorTimestamp 恢复 Replay 位置，默认暂停；若 cursor 不在保存窗口但有 outerRange，则先加载目标附近 1m 窗口
- [x] Step 173: Replay History 验证与收口：覆盖刷新后 history 保留、Split 开关/品种/周期/layout 恢复、1m 窗口模式恢复、删除/清空与 localStorage 体积；修复程序化恢复 Split 时 toolbar checkbox 未同步的问题
- [x] Step 261: Replay Pick / Split reload 使用修复：Pick 恢复为旧版语义，只在当前已 replay 出来的 `chartData` 内按 chart time 命中，不展开完整 date range、不移动视口、不加载未来 K 线；同时恢复直接 crosshair hover preview，避免性能优化后的 cached lookup / RAF throttle 破坏 Pick 光标响应。主图 reload / bars cleared / replay 无法恢复时显式广播 `replay:changed`，清理副图 stale replay 状态，避免 Split 副图在新 date range 加载成功后被旧 cursor 裁剪为空。

### Chart Notes / 使用修复
- [x] Step 262: Chart Bar Notes MVP。目标是在指定 instrument + timeframe + K 线 timestamp 上添加轻量文字 note，只在该周期该 K 线上显示，不跨周期投影，不作为 PDA/Segment/Order Setup 对象的一部分。
  - [x] Step 262.1: 设计并实现 `chart-notes` 数据边界：独立 store、normalize、identity、CRUD、localStorage persistence；字段包括 `instrument/timeframe/timestamp/text/position/color`，note 状态不进入 undo/redo 以外的临时 hover/selection。
  - [x] Step 262.2: 实现 chart note renderer：在主图按当前 instrument/timeframe 渲染 note label，Replay On 时只显示当前 replay 已揭示的 note；不显示未来 note，不展开视图。
  - [x] Step 262.3: 接入图表右键菜单：支持 `Add Note Here`、命中当前 K 线 note 后 `Edit Note` / `Delete Note`；第一版使用 prompt 输入文本，不做富文本、不做拖拽。
  - [x] Step 262.4: 接入 Review JSON 可选归档：导出当前 review payload 中相关日期/周期的 `chartNotes`，导入时 normalize + 去重；Calendar/Inspector 详情先不做独立分组。
  - [x] Step 262.5: 验证与收口：覆盖 1M/5M/1H 周期切换、Replay On 前进/回退、刷新恢复、Review JSON export/import、Split on/off 不回归；运行 `node --check` 与 `git diff --check`。
- [x] Step 263: Chart Note 显示/输入体验修复：note label 固定显示在主图 canvas 顶部区域，增加弱化虚线 leader line 指向所属 K 线；Add/Edit 从浏览器 prompt 改为图表内 textarea 浮层，支持 Save/Cancel、Esc 关闭、Ctrl/Cmd+Enter 保存。修改/删除入口为右键原始 K 线 -> `Chart Note` -> `Edit Note` / `Delete Note`。
- [x] Step 264: Chart Note Calendar / Inspector / Replay 收口：Chart Notes 独立显示在 Time Reaction Observation 中，支持 Inspector 三点菜单 locate/edit/delete/select-object；顶部 note box 按行占位复用最顶可用行，长文本保留截断并支持展开；Show/Hide Day Objects 纳入 chart note 外显对象；Calendar 选日、对象 locate、Show Day Objects 在 Replay 状态下使用当前 replay visible bars 作为聚焦 anchor，避免加载后续交易日后回看旧日期时 note box 被误清除；保持周期规则不变，1M 只显示 1M note，30M 只显示 30M note。

### PDA Locate Flash / 使用修复
- [x] Step 265: Secondary Chart Context Menu 增补计划。目标是把主图右键菜单中适合副图语义的功能迁移到副图，保持副图作为 HTF/ES evidence chart，而不是 NQ execution chart；不迁移会造成语义错乱的 Order Setup entry/stop/target、SMT 创建、NDOG/NWOG 全局切换和 Clear 全局清空。
  - [x] Step 265.1: PDA 增补第一组：在副图开放 Wick CE Upper/Lower 与 IFVG；复用 chart context 写入 source metadata，保持主图行为不变。Bullish/Bearish OB 与 Breaker 保持 range workflow 语义，拆到 Step 265.2 实现。
  - [x] Step 265.2: Range workflow 增补：在副图支持 Fib start/end 与 OB/Breaker range PDA workflow；右键菜单状态显示 active draft，Esc/取消/副图 reset 能清理副图 draft，不影响主图 draft。
  - [x] Step 265.3: Point Sets 增补：在副图支持 EQH/EQL start/add/finish/cancel；draft state 按 primary/secondary scope 隔离，最终对象复用同一 PDA store，并保留 source chart/timeframe。
  - [x] Step 265.4: Navigation / Calendar 增补：副图增加 `Locate Date in Calendar`，复用 Inspector calendar open event；保留现有 `Locate Time in Primary` / copy time/price。
  - [x] Step 265.5: Active Order Setup evidence 链接：副图菜单允许将命中的副图 PDA / Segment / Composite evidence 链接到 active Order Setup reason/ref；不允许从副图设置 entry、stop、target 或创建 execution setup。
  - [x] Step 265.6: 副图 Chart Notes 决策与实现计划：冻结语义为“暂不迁移主图 Chart Notes 到副图菜单”；未来若实现，副图 note 必须只显示在副图同 instrument/timeframe，带 source chart metadata，不进入主图 note box，进入 Calendar/Order reason 前需明确 source chart。
  - [x] Step 265.7: 验证与收口：覆盖 source metadata、Inspector Open/Locate 代码路径、Review JSON 共享 store 路径、undo/redo recordHistory 路径、全量 JS 语法和 Web/API smoke；Split on/off、NQ/ES、1M/30M/1H、Replay On 仍需浏览器人工回归确认。
- [x] Step 266: Inspector Day Object Visibility Controls。目标是在 Inspector 的 `SMT / PDA / Segments / Composite / Killzones / Timelines` 模块标题行增加当前日期范围内的三态显隐控制：全部显示为勾选，全部隐藏为未勾选，部分隐藏为圆点；点击模块 checkbox 只批量切换当前 selected day 的该类 chart objects，不监听 chart 渲染帧，只监听对象 store、Calendar selected day、Replay day anchor、Show/Hide Day Objects 状态变化。
  - [x] Step 266.1: 定义 day-scoped visibility summary 模型：按 `date + objectType` 派生 `total / visible / hidden / state(checked|unchecked|mixed)`，对象类型覆盖 SMT、PDA、Segments、Composite、Killzones、Timelines；无对象时 disabled，不显示误导性状态。
  - [x] Step 266.2: 统一当前日期对象过滤规则：非 Replay 使用 Inspector Calendar selected day / Time Overlay selectedDate；Replay 状态优先使用当前 replay visible bars 推导的当前交易日，避免回看旧日期或加载后续日期后跨日误统计。
  - [x] Step 266.3: 增加 Inspector 模块三态 checkbox UI：放在模块 header，使用 `input.indeterminate` 或等价 visual state；模块展开/折叠逻辑不变，状态文案保持紧凑。
  - [x] Step 266.4: 接入批量显隐动作：点击 checked -> 隐藏当前 day 该类全部对象；点击 unchecked/mixed -> 显示当前 day 该类全部对象；操作进入 undo/redo history，且不改变对象核心研究字段。
  - [x] Step 266.5: 事件驱动刷新与性能边界：只在相关 store changed、calendar selected day changed、replay day changed、display mode/day object visibility changed 时重算 summary；不监听 crosshair/mousemove/chart render；Replay 播放中仅在 day key 变化或 debounce 后刷新，避免每根 K 重算。
  - [x] Step 266.6: 验证与收口：覆盖各模块全显/全隐/部分隐藏、Show Day Objects / Hide Day Objects 联动、Replay On 回看旧日期、Split on/off、undo/redo、刷新恢复、Review JSON 不引入额外 schema 噪音；运行全量 JS 语法检查与 `git diff --check`。
- [x] Step 174: Reasons linked refs 定位入口：Reason ref 行增加 Locate 动作，支持 linked PDA/Segment 定位并复用现有时间范围快闪；删除 X 改为 Execution 同款紧凑样式
- [x] Step 175: PDA 本体快闪设计收敛：明确 Locate 与 Flash 分层，保留视图定位，新增按 PDA 本体形状高亮的临时 primitive；定义 `flashPdaAnnotation(annotation, chartContext)` 返回 true/false，时间范围快闪只作为 fallback
- [x] Step 176: 新增 `pda-locate-flash-primitive.js`：支持 range PDA 本体矩形快闪（FVG/IFVG/OB/Breaker/NDOG/NWOG 等），使用 annotation 的 `start/end` 时间与 `top/bottom` 价格绘制 pulse overlay；新增 `pda-locate-flash.js` helper，当前尚未接入 Reasons Locate
- [x] Step 177: 扩展 PDA 本体快闪类型：支持 liquidity line / key level / point-set / fib；无法解析本体几何时返回 false，让调用方 fallback 到时间范围快闪
- [x] Step 178: 接入 Reasons linked PDA Locate：linked PDA 的 Locate 先移动视图，再尝试本体快闪；主图/副图按 `sourceChartId` 调用对应 chart context；linked Segment 暂继续使用时间范围快闪
- [x] Step 179: PDA 本体快闪验证与收口：覆盖主图 range PDA linked ref 浏览器链路、line/point-set/fib geometry module smoke、fallback 规则、全量 JS 语法与 Web/API smoke；副图与更多实盘样例留给后续实际使用观察
- [x] Step 180: Reasons 选中对象链接修复：PDA Inspector 面板也渲染 Active Order Setup 面板，避免选中 PDA 后 Reason 的 `Link Selected Object` 按钮消失；验证选中 PDA 后可直接把 PDA ref 写入 Reason

### Auto Exit Time / Holding Time
- [x] Step 181: Exit Time 语义与字段规则：复用现有 `resultReview.exitTimestamp` 作为最终离场时间；自动计算、手动输入、Pick Exit Bar 都写入同一字段；Target/Stop/BE/Unknown 都允许保存 exit time；Result 改变后的自动重算留给 Step 183，手动/Pick 覆盖策略需在 UI 中显式提示或保留用户值
- [x] Step 182: 1m 首次触碰计算器：新增 `order/auto-exit-time.js`，给定 entry/direction/result/entryPrice/stopPrice/targetPrice，查询有限 1m 窗口并返回第一根触碰 K 线；Long target 用 `high >= target`，Long stop 用 `low <= stop`，Short 反向，BE 用 `low <= entry <= high`；找不到时返回无法自动计算
- [x] Step 183: Result 改变时自动填 Exit Time：选择 Target 1/2/3、Stop Loss、Breakeven 后触发首次触碰计算；命中后写入 `resultReview.exitTimestamp`，未命中不写错值并给状态提示
- [x] Step 184: Result UI 增加 Exit Time 控件：Result 面板拆分 Exit Time 输入、Pick 按钮、Exit Price 只读、Hold 持仓时长；支持清空 exit time；Pick 按钮先显示 Step 185 提示，图表选 K 线交互留给下一步
- [x] Step 185: Pick Exit Bar 手动覆盖：点击 Pick 后选择当前图表 K 线写入 `resultReview.exitTimestamp`；Esc 取消；适用于 Target/Stop/BE/Unknown
- [x] Step 186: Holding Time 派生与展示：entryTimestamp 与 exitTimestamp 都存在时在 Setup Set Result 派生 `holdingSeconds` / `holdingDuration`，Result 面板显示自然持仓时长；缺字段显示 `—`
- [x] Step 187: 验证与收口：覆盖 Target 自动计算、手动/Pick 覆盖、刷新恢复、持仓时长显示、模块语法、Web/API smoke；Stop/BE 与找不到触碰路径已由计算器规则和状态分支覆盖，后续实盘使用继续观察

### PDA 视觉区分 / 使用修复
- [x] Step 188: OB 统一灰色：bullish/bearish OB 不再使用接近 FVG 的绿/红色，统一为中性灰；新建手动 OB、PDA 类型 fallback、工具栏色标、主图/副图渲染均已覆盖，已保存旧 OB 的自带颜色在渲染时也会被灰色覆盖

### Economic Calendar / Inspector 查看层
- [x] Step 189: Economic Calendar 数据契约收敛：以 `v4/data/economic_calendar/economic_calendar_usd_events.csv` 为只读来源；当前列为 `event_date/event_time_et/event_time_utc/currency/title/impact/event_type/all_day/default_visible/actual/forecast/previous`；功能层忽略 `actual/forecast/previous`；`all_day=true` 时不读取事件时间，Locate 固定使用当天 `09:30`
- [x] Step 190: 后端 API：在 `v4_api.py` 新增 `/v4/economic_events`，按 `date_from/date_to/currency/impact/include_holidays` 过滤 CSV 并进程内缓存；返回前端需要字段，不返回 `actual/forecast/previous`
- [x] Step 191: 前端 Economic Calendar store：新增当前加载窗口内事件 store 与 filter 状态；High/Medium 默认显示，Low 默认隐藏，Holiday/All Day 默认显示；不写 localStorage、不进 undo/redo、不进 Review JSON
- [x] Step 192: 数据加载接入：主图 `bars:loaded` 后按当前 loaded/requested 日期范围拉取 economic events；1m 窗口切换时重新拉取；Split 副图复用主图窗口事件，不单独拉取
- [x] Step 193: Calendar index 接入：新增 `economic-event` 类型与 `Economic Events` 分组，顺序放在 Order Setups 后、SMT 前；timed event 用 ET wall-clock 时间归档/定位，all-day event 用 `event_date 09:30` 定位
- [x] Step 194: Inspector 日期格与列表 UI：按 impact 显示红/橙/黄/灰小点（High 红、Medium 橙、Low 黄、Holiday/All Day 灰）；Economic Events 行显示时间/All Day、impact、currency、完整 title 与 Locate；title 允许换行，不显示 actual/forecast/previous
- [x] Step 195: Inspector filter：在 Calendar / Economic Events 区提供 High、Medium、Low、Holiday 开关；过滤影响日期格小点和当天事件列表，不影响其它 Calendar 对象
- [x] Step 196: Locate 快闪：不在图表常驻标记 economic events；点击 Locate 才移动主图/副图并复用现有 time-range flash；timed event 快闪事件时间，all-day/holiday 快闪当天 `09:30`
- [x] Step 197: 验证与收口：覆盖 API range、High/Medium 默认显示、Low 默认隐藏、Holiday all-day 09:30 locate、小点颜色、长 title 换行、Split 同步 locate、全量 JS 语法、Web/API smoke 与 `git diff --check`

### Inspector Page Stack / Order Setup Detail 重构
- [x] Step 198: 冻结信息架构目标：采用单 Inspector 页面栈方案，`Open` 进入详情页并可 `Back` 返回上一层；暂不做第二并列 Inspector，避免挤占图表与引入双详情状态
- [x] Step 199: 建立 Inspector 页面状态模型：新增统一的 `inspectorPage` / back stack 状态，支持 `home/calendar/list` 与 `detail` 两类页面；记录来源页面、selected date、opened object type/id，不改 Review JSON / `orderReviews` schema
- [x] Step 200: Order Setup 详情页：把现有 `Active Order Setup` 内容迁移为 `Order Setup Detail` 页面；页面顶部显示 Back、setup 摘要、当前 active/visible 状态；正文保留 Display、Anchor、Execution、Entry Context、Reasons、Result
- [x] Step 201: Order Setups 列表入口收敛：列表中的 `Open` 进入 `Order Setup Detail`；`Locate / Hide / Delete` 仍留在列表菜单；点击 Open 同步 set active，但不滚动到同层下方 section
- [x] Step 202: Calendar Open 入口收敛：Calendar 中 Order Setup / PDA / Segment / Composite / SMT 的 `Open` 都进入对应详情页；`Locate` 继续只定位与快闪，不切换详情页
- [x] Step 203: PDA / Segment / Composite / SMT 详情页去除常驻 Active：打开这些对象详情时只显示该对象自己的字段与动作，不再在页面下方附带整套 Active Order Setup；仅保留必要的轻量动作，例如 link selected object/ref to active setup reason
- [x] Step 204: Back / 删除 / 空状态规则：Back 回到打开前的 Calendar/list 与 selected date；删除当前详情对象后返回上一层并刷新列表；无 active setup 不显示独立 Active 页，只在 Order Setups 列表提示选择或创建
- [x] Step 205: 重复对象级动作收敛：Active Order Setup 顶部不再显示 Clear Active / Locate / Hide / Delete；Locate / Open / Hide / Delete 统一保留在 Order Setups 列表菜单，Active 区只保留 Display、Anchor、Execution、Entry Context、Reasons、Result 等当前 setup 内容控件
- [x] Step 206: 视觉与交互收口：详情页标题层级压缩，Back 固定在详情顶部；长标题、notes、reason refs 必须换行不撑爆 Inspector；避免详情页和列表页同时显示两个 competing current object
- [x] Step 207: 验证与收口：覆盖 Order Setup Open/Back、Calendar Open/Back、PDA/Segment/Composite/SMT Open、Locate 不切页、Hide/Delete 后状态、link selected object to active setup、Entry/Reasons/Result 编辑、刷新恢复、undo/redo、全量 JS 语法、Web smoke 与 `git diff --check`

### Chart -> Inspector Calendar 双向定位
- [x] Step 208: 冻结交互边界：图表反向定位 Calendar 只通过显式动作触发，不跟随 crosshair hover；支持主图右键当前 K 线 `Locate Date in Calendar`，以及图表选择 PDA / Segment / Composite / SMT / Order Setup 后把详情页 Back 目标同步到对象日期
- [x] Step 209: 新增 Inspector Calendar 日期打开事件：定义 `inspector:open-calendar-date` bus event，payload 包含 `timestamp/dateKey/source`；Inspector 收到后打开 sidebar，设置 `calendarSelectedDate/calendarViewDate`，进入 home Calendar 页，不创建详情页，不改变 chart viewport
- [x] Step 210: 主图右键菜单接入：在主图 K 线右键菜单增加 `Locate Date in Calendar`；用右键上下文 timestamp 转 `YYYY-MM-DD`，emit `inspector:open-calendar-date`；若无有效 timestamp 则禁用或提示
- [x] Step 211: 对象选中日期同步：PDA / Segment / Composite / SMT / Order Setup 从图表选择进入详情页时，计算对象主日期并写入当前 detail page 的 `selectedDate/viewDate`；Back 回 Calendar 时自动落在该日期；不强制展开 Economic Events
- [x] Step 212: Calendar 分组默认状态确认：从图表反向定位到某日后，Order Setups 仍默认展开；Economic Events 默认折叠；`Locate` 行为仍只定位图表，不切页
- [x] Step 213: 验证与收口：覆盖主图右键日期定位、无 timestamp 保护、PDA/Segment/Composite/SMT/Order Setup 选中后 Back 日期、Calendar 日期格 selected 状态、Order Setups 展开/Economic Events 折叠、全量 JS 语法、Web smoke 与 `git diff --check`

### Daily Time Reaction Observation
- [x] Step 214: 冻结功能边界：新功能命名为 `Daily Time Reaction Observation`，按日期记录“时间理论反应观察”，不是交易计划表，也不是自动信号；目标是观察 09:30 / 09:50 / 10:00 / 10:30 这些算法时点在不同高周期环境下何时形成可交易形态、何时只是 noise
- [x] Step 215: 数据模型设计：新增 `dailyTimeReviews[]`，按 `date + instrument` 唯一；包含 `pre0930Context.note/refs`、四个固定 `reactions[]`、`summary0930To1100.note/refs`；每个 reaction 只保留 `time`、轻量 `reactionType`、`note`、`refs[]`、`locate{timestamp,timeframe,chart}`，不拆 Expectation / What happened / Why
- [x] Step 216: Store 与持久化：实现 daily time review store，支持 create/getByDate/update section/update reaction/link ref/remove ref/delete；接 localStorage 草稿保存；暂不入 DB
- [x] Step 217: Review JSON 接入：export/import 增加 `dailyTimeReviews`；import 时规范化字段并 remap refs，复用 PDA / Segment / Composite / SMT / Order Setup ref 结构
- [x] Step 218: Calendar 日维度 UI：在 Inspector Calendar 某日详情新增 `Time Reaction Observation` 分组，默认折叠；Open 后进入按日期的 detail editor；包含 `Pre 09:30 Context`、四个固定 reaction、`09:30-11:00 Summary`，当前以 textarea 为主
- [x] Step 219: Reaction 基础交互：每个 09:30 / 09:50 / 10:00 / 10:30 reaction 支持添加多条事实 event，每条 event 有独立 textarea / refs / locate；不做 reversal / continuation 等分类；不把每个 reaction 强制当作 Order Setup
- [x] Step 220: Link Selected Object：支持把当前选中的 PDA / Segment / Composite / SMT / Order Setup 链接到 pre0930、某个 reaction 或 summary；refs 记录 role/source metadata，删除 ref 不影响原对象
- [x] Step 221: Locate 第一版：每个 reaction/section 支持主图定位到 `date + time`；第一版支持手动选择 timeframe 并在 locate 时切换主图周期后定位与快闪；secondary chart 仅在当前已开启且已加载时可选，不自动打开副图
- [x] Step 222: 高周期环境衔接：Pre 09:30 Context 与 Summary 支持链接 HTF Segment / Composite / PDA，用于记录“为什么这个时间反应有效或无效”；不做系统自动判断，不自动推荐 PDA
- [x] Step 223: 验证与收口：覆盖 localStorage 恢复、Review JSON export/import/remap、Calendar 日详情编辑、四个 reaction 编辑、Link Selected Object、ref locate、主图切周期定位、Economic Events 默认折叠不受影响、全量 JS 语法、Web smoke 与 `git diff --check`
- [x] Step 224: Review follow-up 修复：空白 Time Reaction 草稿不再计入 Calendar 月历对象概览、localStorage 保存或 Review JSON export；Calendar 选中日期详情仍保留创建入口；Summary event Locate 默认覆盖 `09:30-11:00`；副图 ref 已定位但主图周期切换失败时给出明确状态提示
- [x] Step 225: 拆分基线与边界：从 `main` 新建 `refactor/daily-time-inspector-actions`；本轮只拆 Daily Time inspector 行为，不改 UI、不改 store schema、不改 Review JSON/localStorage key
- [x] Step 226: 新增 `ui/inspector/time-reaction-actions.js` controller，先迁移 Daily Time pending pick 状态、target 解析、target label/key、range/timeframe/ref helper，并保持 `inspector-sidebar.js` 行为不变
- [x] Step 227: 迁移 Daily Time click/change/locate/ref-pick 行为到 controller；`inspector-sidebar.js` 仅保留 page routing、bus 接线和 shared selection 状态
- [x] Step 228: 验证与收口：覆盖相关 JS 语法、target/summary range/content filter smoke、Calendar Open、Add Event、Select Object pending、linked ref Locate，并记录拆分后边界
- [x] Step 229: Calendar 图表对象显隐计划：新增 `feature/calendar-object-visibility-controls`；复用既有 `display.hidden` / overlay `enabled=false` 语义，不新增 schema；覆盖 PDA、Segment、Composite、Killzone、Time Line，SMT 第一版仅在具备显示状态后接入
- [x] Step 230: 对象行显隐按钮：在 Inspector Calendar 单日对象行增加类似 Order Setup 的绿点/灰点+斜杠按钮；PDA 单对象显隐，Segment 单段显隐，Composite 按 composite group 整组显隐，Killzone/Time Line 按 overlay 项显隐
- [x] Step 231: 单日批量显隐：Calendar 单日区域增加 `Show Day Objects` / `Hide Day Objects`，批量切换当天所有可显隐图表对象；Economic Events、Time Reaction、Order Setup 不纳入该批量图表对象按钮
- [x] Step 232: 验证与收口：覆盖相关 JS 语法、对象显隐 smoke、批量显隐 smoke、Calendar render smoke，并记录边界
- [x] Step 233: PDA 多图投影统一边界：一个 PDA 只有一个逻辑 `id`，主图/副图只是同一对象的不同 projection；所有选择、显隐、删除、Calendar、ref link、locate 都操作同一 PDA id，不做 per-pane 独立编辑
- [x] Step 234: 来源标识统一：新增 PDA source formatter，统一输出 `Main NQ 1H` / `Sub ES 1H` 等来源 badge；在 Inspector PDA detail、Calendar row、linked refs、图表 label 中使用同一 formatter
- [x] Step 235: 选择统一：主图/副图 hit-test 和 renderer 都以同一 `annotation.id` 作为 selected key；点击任一 projection 选中同一 PDA，并在两张图对应 projection 上同步高亮
- [x] Step 236: Projection 渲染规则：同 instrument projection 画完整价格对象；跨 instrument projection 只画时间范围/竖线/来源 badge，不把 ES 价格 box 直接投到 NQ 价格轴
- [x] Step 237: PDA actions 统一：PDA Locate 同时定位主副图；Hide/Delete/Calendar visibility/ref locate 都走同一个 PDA id；来源图 price area flash，非来源图只做 time flash
- [x] Step 238: 验证与收口：覆盖主/副图 PDA 创建、同品种高低周期 projection、跨品种 time-only projection、任一图选中同步高亮、Hide/Delete 双图消失、Locate Both、Calendar/ref 行为与全量 JS 语法

### Phase 15: P0 Order Setup Refactor 执行计划
P0 执行边界：优先解决阻碍后续开发的 Order Setup action 混乱问题。旧 AI review 方案已归档到 `docs/legacy/P0_REFACTOR_PLAN_legacy_ai_review.md`，仅作为参考，不作为执行清单。当前 P0 不做持久化统一、不迁移 `orderReviews` schema、不追求机械的“所有文件 < 500 行”。
- [x] Step 239: 建立最小回归基线：新增 Order Setup smoke，覆盖 create bullish/bearish setup、set active/close、entry/stop/target/result、reason link PDA/Segment/Composite/SMT、localStorage restore、undo/redo；用于后续拆分防回归
- [x] Step 240: 抽取 `order-review-actions.js` 纯 helper：迁移 date/time parse、timestamp range、selected ref 解析、auto-exit result 判断、field value parsing 等无 UI 状态函数；保持 `createOrderReviewActionController` 外部签名不变
- [x] Step 241: 抽取 Order Setup refs/reasons actions：集中 linked refs、reasons add/delete/update、Link Selected Object、reason ref locate/delete；保留现有 `setupThesis.reasons[]` 与旧 `linkedObjectRefs` 兼容路径
- [x] Step 242: 抽取 Order Setup create/lifecycle actions：集中 blank/segment/composite 创建、set active/close active、locate/open、hide/show/delete；不改变 Calendar、reversal 右键、Inspector 的用户行为
- [x] Step 243: 抽取 Order Setup edit/result actions：集中 entry context、display flags、execution element visibility/delete、result status、exit time auto-calc/manual pick；确保自动 exit time 与持仓时间派生不回归
- [x] Step 244: 保留 `ui/inspector/order-review-actions.js` 作为 facade/controller factory：只负责组合子模块、维护少量 controller 状态和对 `inspector-sidebar.js` 的兼容入口；不让 sidebar 重新承担 Order Setup 业务逻辑
- [x] Step 245: 轻量收敛 `order-review-active.js`：内部统一以 Setup Set / active review set id 为权威；旧 `getActiveOrderReview*` alias 暂留兼容但不新增使用；不改 localStorage key、不迁移 Review JSON 字段
- [x] Step 246: 文档化 Order Setup 分层：更新 TODO / session / 必要时 `docs/ORDER_REVIEW_DESIGN.md`，明确 store=兼容持久化输入、setup-set=view-model 权威、inspector actions=UI 操作协调、renderer/hit-test=投影消费层
- [x] Step 247: P0 验证与收口：运行全量 `v4/src/**/*.js` 语法检查、Order Setup smoke、Web/API smoke；手工覆盖 Calendar Open/Locate、图表右键创建/编辑、Reasons link、Result auto exit、undo/redo、Review JSON import/export
- [x] Step 248: Context reset handoff：在 `sessions/session_20260602_p0_order_setup_refactor.md` 记录当前分支、提交范围、验证结果、未跟踪文件状态与清空上下文后的接手步骤

### Deferred Refactor Backlog
- [ ] Persistence manager 统一 localStorage 读写：当前实际 localStorage 使用点较少，重复但不阻塞；等 Order Setup P0 拆分稳定后再做，且必须保持 key 与 payload 兼容
- [ ] `order-review-store.js` / `setup-set.js` 派生边界深度收敛：仅在有测试覆盖后处理；短期不再移动 result/risk/reward schema 字段，避免破坏保存数据与 UI 回填
- [ ] `order-review-actions.js` 之外的大文件继续评估：`time-reaction-actions.js`、`segment-panel.js`、`order-setup-chart-actions.js` 按实际新增功能压力决定是否拆分

### Phase 16: P1 代码质量改进计划
Phase 16 参考 `docs/improvement_plan.html`，但按当前 V4 实际边界调整执行顺序。目标是降低重复逻辑和维护成本，不做新业务功能，不迁移 `orderReviews` schema，不改 localStorage key，不破坏 Review JSON 兼容。

- [x] Step 249: P0 分支收口：确认未跟踪 docs 是否纳入提交；运行产物（`.web_pid`、`.web.log`、`__pycache__`、`tmp/*.png`、本地 duckdb）不纳入提交；重新跑 Order Setup smoke、全量 JS 语法检查、`git diff --check` 与 Web/API smoke；验证通过后将 `refactor/p0-order-setup-actions` 合并回 `main`
- [x] Step 250: 建立中性时间投影工具模块：新增 `chart/time-projection.js` 或 `data/timeframe-buckets.js`，承载 `getBarChartTime()`、`getBucketStart()`、`normalizeChartTime()`、`findDisplayBarByTime()`、`getDisplayBarIndex()`；基础层不得 import `pda-context.js`
- [x] Step 251: 为时间投影工具增加 smoke test：覆盖 1M/5M/1H timestamp、D `tradingDay`、4H bucket 对齐、非法输入 fallback；确保迁移前有可重复验证基线
- [x] Step 252: 第一批迁移 Order Setup 时间投影路径：优先处理 `order-setup-projection.js`、`order-review-renderer.js`、`order-setup-hit-test.js`、`ui/inspector/order-review-utils.js`；验证 Order Setup 创建、entry/stop/target 渲染、hit-test、Calendar locate 不回归
- [x] Step 253: 第二批迁移 PDA / Segment / Time Overlay 时间映射：分批替换重复 `getBarChartTime` / daily tradingDay 逻辑；每批后验证 PDA 创建/locate、Segment 创建/locate、Time Overlay、Calendar 跳转与 Split Screen 基础渲染
- [x] Step 254: 拆分 Order Review types：新增 `order/order-review-types.js`，迁移 `ORDER_*_DEFINITIONS`、`ORDER_*`、`VALID_ORDER_*`、`ORDER_*_ALIASES` 与 `getActiveDefinitions()`；`order-review-store.js` 必须继续 re-export，保持旧 import 兼容
  - [x] Step 254.1: 建立 types 模块边界：新增 `order/order-review-types.js`，先只迁移 `keyFromValue()`、`valuesFromDefinitions()`、`validSetFromDefinitions()`、`aliasMapFromDefinitions()`、`getActiveDefinitions()` 以及全部 `ORDER_*_DEFINITIONS`
  - [x] Step 254.2: 在 `order-review-types.js` 内派生并导出全部 `ORDER_*`、`VALID_ORDER_*`、`ORDER_*_ALIASES`；新增轻量 smoke 覆盖 enum value、alias map、valid set、`getActiveDefinitions()`，确保 types 模块可独立验证
  - [x] Step 254.3: 改造 `order-review-store.js`：从 `order-review-types.js` import normalize 需要的 types，并 re-export Step 254.1/254.2 的全部 public types；保留 `ORDER_REVIEW_VERSION`、`DEFAULT_ORDER_INSTRUMENT`、normalize/CRUD/load API 在 store 内；外部旧 import 必须继续可用
  - [x] Step 254.4: 验证兼容 re-export：不迁移任何调用方 import，先运行 Order Setup smoke、types smoke、全量 `node --check` 与 `git diff --check`；确认 `order-review-store.js` 行数下降且旧 import 不破坏
  - [x] Step 254.5: 分离提交边界：如果 Step 254.1-254.4 通过，单独提交 `refactor(v4): extract order review types`；不要在同一提交中做 Step 255 的调用方 import 迁移
  - [x] Step 254.6: 记录后续迁移批次：在 Step 255 执行前用 `rg` 生成仍从 `order-review-store.js` import types 的文件清单，按 tests/renderer/hit-test/panel -> chart actions/archive/time reaction 的顺序迁移
    - Step 255 type-only/mostly-type imports 第一批：`tests/order-setup-smoke.js`、`order/auto-exit-time.js`、`order/order-setup-hit-test.js`、`order/order-review-renderer.js`、`ui/inspector/order-review-utils.js`、`ui/inspector/order-review-panel.js`
    - Step 255 混合 imports 第二批：`order/order-review-active.js`、`order/order-setup-chart-actions.js`、`ui/inspector/order-review-edit-actions.js`、`ui/inspector/order-review-lifecycle-actions.js`、`ui/inspector/order-review-reason-actions.js`、`ui/inspector/time-reaction-actions.js`、`ui/inspector-sidebar.js`、`review/review-archive.js`
    - 继续保留 store imports：`history/history-manager.js`、`order/setup-set.js`、`order/order-setup-selection.js`、`order/order-review-persistence.js`、`time-reaction/daily-time-review-store.js` 等只消费 normalize/CRUD/load API 的文件
- [x] Step 255: 分批迁移 Order Review types imports：先迁移 tests、renderer、hit-test、inspector panel，再迁移 `order-setup-chart-actions.js`、`review-archive.js`、`time-reaction-actions.js`；每批后运行 Order Setup smoke 与全量 JS 语法检查
  - [x] Step 255.1: 迁移第一批 type-only imports：`tests/order-setup-smoke.js`、`order/auto-exit-time.js`、`order/order-setup-hit-test.js`、`order/order-review-renderer.js`、`ui/inspector/order-review-utils.js`、`ui/inspector/order-review-panel.js`
  - [x] Step 255.2: 验证第一批迁移：运行 Order Review types smoke、Order Setup smoke、全量 `node --check`、`git diff --check`
  - [x] Step 255.3: 迁移第二批 order 层混合 imports：`order/order-review-active.js`、`order/order-setup-chart-actions.js`；types 从 `order-review-types.js` 引入，store API 继续从 `order-review-store.js` 引入
  - [x] Step 255.4: 迁移第二批 inspector/review 层混合 imports：`ui/inspector/order-review-edit-actions.js`、`ui/inspector/order-review-lifecycle-actions.js`、`ui/inspector/order-review-reason-actions.js`、`ui/inspector/time-reaction-actions.js`、`ui/inspector-sidebar.js`、`review/review-archive.js`
  - [x] Step 255.5: 明确保留 store imports 清单：`history/history-manager.js`、`order/setup-set.js`、`order/order-setup-selection.js`、`order/order-review-persistence.js`、`time-reaction/daily-time-review-store.js` 等只消费 normalize/CRUD/load API 的文件继续从 `order-review-store.js` 引入
  - [x] Step 255.6: Step 255 收口检查：用 `rg` 确认 `ORDER_*` / `getActiveDefinitions` 不再从 `order-review-store.js` 引入；运行 types smoke、Order Setup smoke、全量 `node --check`、`git diff --check`；标记 Step 255 完成
- [x] Step 256: 关键注释补强：只补业务规则和架构边界注释，包括 `pda-context.js` 的 18:00 trading day anchor / 4H 对齐 / session window，`setup-set.js` 的 storage schema vs runtime view-model / result 派生边界，`segment-review-metrics.js` 的 metrics 分类和 fluency component 非最终评分
  - [x] Step 256.1: 补强 `pda-context.js` 注释：解释 18:00 trading day anchor、4H 02:00/06:00 对齐、session window / `skipExtrema`、representative extreme 判断边界
  - [x] Step 256.2: 补强 `setup-set.js` 注释：解释 `orderReviews` storage compatibility schema 与 Setup Set runtime/view-model tree 的边界、result/points/R 派生不写回 store、explanation refs/events/note 映射
  - [x] Step 256.3: 补强 `segment-review-metrics.js` 注释：解释 metrics 是 read-only review facts、previous comparison 前提、terminal PDA reaction 范围、fluency components 非最终评分也不是交易信号
  - [x] Step 256.4: Step 256 收口验证：运行三个目标文件 `node --check`、全量 `node --check`、`git diff --check`；标记 Step 256 完成
- [x] Step 257: Phase 16 收口验证：运行新增时间投影 smoke、Order Setup smoke、全量 `node --check`、`git diff --check`，并手工覆盖 1M/5M/15M/1H/4H/D 切换、Order Setup、PDA、Segment、Time Overlay、Calendar、Split Screen 基础链路
  - [x] Step 257.1: 自动验证基线：运行 `v4/tests/time-projection-smoke.js`、`v4/tests/order-review-types-smoke.js`、`v4/tests/order-setup-smoke.js`、全量 `node --check`、`git diff --check`
  - [x] Step 257.2: 启动并验证 Web/API：确认 V4 API 可前台启动并返回 `/v4/health` OK，确认 Web 入口可访问，保留当前本地运行产物未跟踪
  - [x] Step 257.3: 手工链路覆盖：覆盖 1M/5M/15M/1H/4H/D 切换、Order Setup、PDA、Segment、Time Overlay、Calendar、Split Screen 基础链路；发现问题则单独拆修复步骤
  - [x] Step 257.4: Phase 16 收口记录：记录验证结果，标记 Step 257 完成；不引入业务改动
    - 验证记录：`time-projection-smoke.js`、`order-review-types-smoke.js`、`order-setup-smoke.js`、全量 `node --check`、`git diff --check` 通过；Node 仅输出既有 ES module package type warning。
    - Web/API 记录：`/home/leo/miniconda3/bin/python3 v4_api.py` 前台启动正常，`/v4/health` 返回 OK；Web `http://127.0.0.1:8001/index.html` 返回 200。
    - 手工链路记录：headless Chrome 覆盖 1M/5M/15M/1H/4H/D 加载、Order Setup/PDA/Segment/Time Line 创建、Calendar 分组计数、Split Screen ES 4H 副图与 side/stack layout；未发现 console error。

Phase 16 暂缓项：不做 persistence manager 统一、不迁移 `orderReviews` schema、不重命名 Review JSON 字段、不新增 Service 层抽象、不机械拆分所有大文件、不以“所有文件低于 500 行”为目标。

### Phase 17: 真实复盘试运行观察期
当前系统以 `main` 的 `770e8a4` 作为试运行基线。先按现有功能做一段真实复盘工作，不立即开启新的 speculative refactor；后续开发由真实使用中暴露的高频问题驱动。

- 记录问题时按 `Bug / Friction / Research Gap / Noise` 分类，并尽量包含日期、品种、周期、对象类型、复现步骤、期望行为、实际行为。
- Bug 优先级最高，尤其是数据丢失、状态错乱、Review JSON/localStorage 恢复、Locate/Open 错误、图表渲染失败。
- Friction 只在重复出现后再转开发任务，避免为单次不顺手过早改 UI。
- Research Gap 需要多个真实样例支撑后再考虑新增字段、对象或 Review JSON schema。
- Noise 类问题先记录是否应隐藏、折叠、改名或改为按需显示，不急着删除指标。
- 试运行记录与接手说明见 `sessions/session_20260603_real_review_trial.md`。

- [x] Step 258: Split Screen 副图移动/hover 卡顿优化计划。目标是降低副图 crosshair move 与拖动时的高频 CPU/重绘成本，不改变副图只读边界、不改变 Review JSON/localStorage schema、不改变主副图时间对齐语义。
  - [x] Step 258.1: 建立问题基线：用真实复盘场景记录主图/副图 instrument、timeframe、加载区间、bar 数、是否 Replay On、是否开启 Display Mode/overlay；在 DevTools Performance 中确认卡顿主要发生在副图 mousemove / pan，记录 `syncPrimaryHoverCursor`、legend 更新、primitive redraw、overlay redraw 的占比。
  - [x] Step 258.2: 为主图和副图 display bars 建轻量 lookup cache：按 `timeframe + displayBars identity/length/first/last timestamp` 缓存 `chartTime -> bar` 和 `bucketStart timestamp -> chartTime/bar`，替代 `findDisplayBarByTime()` 在 crosshair move 中的线性扫描；cache 只服务高频 hover/sync，不改变 store 数据结构。
  - [x] Step 258.3: 给主副图 crosshair 同步加 `requestAnimationFrame` 节流：副图移动时一帧最多执行一次 `syncPrimaryHoverCursor`，主图移动时一帧最多执行一次 `syncSecondaryHoverCursor`；保留最后一次 param，鼠标离开/无 time 时仍能及时隐藏同步线。
  - [x] Step 258.4: 降低 legend DOM 写入频率：主图/副图 legend 记录上一次 bar time + OHLC 值，未变化时不重复 `innerHTML`；确保跨 instrument 的价格 formatter 仍正确。
  - [x] Step 258.5: 处理 pick/replay 优先级：确认节流后的普通 sync crosshair 不覆盖 pick preview、replay cursor、manual secondary hover cursor；Pick 模式和 Replay On 状态下的清理路径必须保持无残线。
  - [x] Step 258.6: 验证与收口：运行 targeted node smoke、全量 `node --check`、`git diff --check`；手工覆盖 Split on/off、主图 hover、副图 hover、副图拖动/缩放、Replay On、Sub 1M 大区间、Sub ES/NQ 切换、Inspector locate/open；记录优化前后体感和 DevTools 结果。

- [x] Step 259: 主图移动/hover 卡顿优化计划。目标是降低主图高频 crosshair/pick handler 与 overlay primitive 负担，不改变现有标注、Replay、Order Setup、SMT、Segment、Calendar 的用户语义。
  - [x] Step 259.1: 建立主图性能基线：记录复现状态（Split on/off、Replay on/off、Display Mode、对象数量、Time Overlay 开关、主图 timeframe/range/bar 数）；用 DevTools 确认卡顿是否集中在 crosshair handlers、pick preview primitive、legend 更新、或 primitives 绘制。
  - [x] Step 259.2: 复用 `display-bar-lookup.js` 到主图高频 pick 路径：Replay Pick、SMT Pick、Order Exit Pick、Segment Actor Pick 的 hover/click lookup 优先用 cached chartTime lookup；保持原有 timestamp/timeframe 映射语义。
  - [x] Step 259.3: 给主图 pick hover 加 `requestAnimationFrame` 节流：Replay Pick、SMT Pick、Order Exit Pick、Segment Actor Pick 一帧最多更新一次 preview cursor；保留最后一次 hover param，并确保无 bar 时及时隐藏 preview。
  - [x] Step 259.4: 消除无状态高频 no-op：Replay 非 picking 状态不在每个 crosshair move 中重复调用 `hidePickPreviewCursor()`；其他 pick controller 只在 active state 时做实际 lookup/primitive 更新。
  - [x] Step 259.5: 评估并必要时限制主图 primitive 压力：统计当前可渲染 PDA / Segment / Composite / Time Overlay primitive 数量；如果主图 pan 仍卡，再拆后续步骤做可视范围裁剪或 overlay 数量降噪，本步骤不直接改变显示语义。
  - [x] Step 259.6: 验证与收口：运行 targeted smoke、全量 `node --check`、`git diff --check`；手工覆盖主图 hover、主图拖动/缩放、Replay Pick、SMT Pick、Order Exit Pick、Segment Actor Pick、Split on/off、对象多的真实复盘页面；记录优化前后体感。

- [x] Step 260: Daily Regime 自动背景层。目标是给每个复盘交易日自动附加市场环境，不增加手工录入负担；第一阶段只做日级背景和显示/export，不做 setup 置信度、不做复杂复合 regime 统计页。
  - [x] Step 260.1: 定义 `daily-regime` 数据边界与命名：每条记录按 `date + instrument` 生成，字段包括 `volatilityRegime/vixClose/vixBucket`，预留 `trendRegime/rangeRegime/eventTags`；regime 属于交易日背景层，不挂到 PDA/Order/Segment 对象本体。
  - [x] Step 260.2: 实现 VIX 数据读取与分档 MVP：读取 `v4/data/vix-daily.csv`（`DATE,OPEN,HIGH,LOW,CLOSE`，当前覆盖 1990-01-02 到 2026-06-02），按日期 lookup `CLOSE`，生成 `vix_extreme_low / vix_low / vix_medium / vix_high / vix_extreme_high`。
  - [x] Step 260.3: 在 Inspector Calendar / Day Details 显示当天 VIX regime：选中日期后显示 `VIX: Low 13.20` 这类摘要；缺数据时显示 `VIX: n/a`，不阻塞复盘。
  - [x] Step 260.4: Review JSON export/import 加入 `dailyRegimes`：导出当前 review range 中有复盘对象或 daily review 的日期 regime；导入时 normalize 但不覆盖本地实时计算优先级，确保历史归档可自带当时背景。
  - [x] Step 260.5: 扩展 Trend Regime：用 NQ/ES 日线或可用 HTF bars 计算 `bull_trend / bear_trend / range`，第一版规则为 close 与 20EMA/50EMA 关系；缺少足够历史时返回 `unknown`。
  - [x] Step 260.6: 扩展 Range Regime：用日内 range 与 20日 ATR 比值生成 `small_range / normal_range / large_range`，记录 `rangeAtrRatio`；先做日级结果，不改变图表渲染。
  - [x] Step 260.7: 扩展 Event Regime：先支持手工维护的经济事件日期表（FOMC/CPI/NFP/PPI/major_earnings/none），后续再考虑自动下载；Calendar 显示 event tags。
  - [x] Step 260.8: 验证与研究收口：用当前一周 Review JSON 检查 dailyRegimes 覆盖情况；手工确认 3-5 个日期的 VIX/trend/range/event；记录后续统计入口，但暂不做 confidence rubric。

## 已知问题
- 系统 Python 无 duckdb，需用 /home/leo/miniconda3/bin/python3
- localStorage 只作为浏览器工作草稿保存；跨设备/正式研究归档仍待后续 YAML/export 或 DB 方案
- 1W 周线聚合逻辑待实现（暂搁置）
- 假日异常收盘时间（如13:14）暂不特殊处理
- `main` 当前本地领先 `origin/main` 较多；如需远端同步，需单独执行 push。

## 架构决策记录
- 2026-05-19: 所有 PDA 前端实时计算，不存 DB
- 2026-05-19: LightweightCharts v5.2.0，用内置 Markers 插件替代部分自定义 Primitive
- 2026-05-19: v4_api.py 从 price_lookup_api.py 导入查询函数，不复制代码
- 2026-05-19: OHLCV 悬停 legend 用 subscribeCrosshairMove 实现
- 2026-05-20: 日线聚合使用 CME 交易日分界 18:00 ET（前一天18:00~当天16:59），数据时间戳为美东时间不做 UTC 转换
- 2026-05-20: 日线聚合排除 17:00-17:59 休市时段
- 2026-05-20: 时间输入自动格式化（8位→日期 00:00，12位→日期 HH:mm），blur 触发 + handleLoad 前格式化
- 2026-05-20: API 返回 { bars, requestedRange } 格式，前端用 requestedRange 过滤 padding bar
- 2026-05-20: bar-store 分离全量数据（含 padding）和显示数据（不含 padding）
- 2026-05-20: 图表显示策略：少量 bar 用 fitContent()，大量 bar 用 setVisibleLogicalRange 从起始位置显示
- 2026-05-20: fixLeftEdge/fixRightEdge=false，允许自由拖动滚动
- 2026-05-20: barSpacing=6, minBarSpacing=2, rightOffset=7
- 2026-05-20: 日线 time 字段用交易日日期（YYYY-MM-DD），新增 tradingDay 字段；前端按 tf 区分 time 来源
- 2026-05-20: crosshair 所有周期显示星期缩写（Mon/Tue/...），用 localization.timeFormatter 实现
- 2026-05-20: Replay Bar 默认 Off；Off 时恢复现有完整数据视图策略，不把全部 K 线压进 canvas
- 2026-05-20: Select bar 降级为 Pick，作为 Replay 回退到指定位置的一种入口
- 2026-05-20: Replay 播放视口使用 visible logical range 右锚定；默认最新 K 线右侧留约 7 根空间，播放中拖动/缩放后继承新的锚点
- 2026-05-20: 图表视口控制独立于 Replay Bar，基于 LightweightCharts timeScale logical range 封装，不引入插件
- 2026-05-20: Replay cursor 使用 LightweightCharts series primitive 画竖线，只做前端视觉定位，不写入数据
- 2026-05-20: Replay On 状态切换周期时按 cursor timestamp 对齐到新周期 K 线并保持 On；保留切换前手动拖动/缩放后的 viewport 锚点，自动播放会暂停
- 2026-05-20: Replay Bar 支持输入时间跳转，复用 formatTimeInput，按不晚于目标 timestamp 的最近 K 线定位
- 2026-05-20: Reset chart view 与 Scroll to latest 统一为保持当前缩放并将最新 K 线锚到右侧 7 根空间
- 2026-05-20: Replay Bar 支持键盘快捷键：Space 播放/暂停，左右方向逐根，Home 回第一根，Esc 退出 Pick 或关闭 Replay；输入控件聚焦时禁用
- 2026-05-20: Pick 模式支持 hover 临时竖线，点击成功后状态栏显示 index/total + time，成功或取消后清除 preview
- 2026-05-20: Replay 时间跳转按 UTC wall-clock timestamp 解析，避免浏览器本地时区导致跳转偏移
- 2026-05-20: V4 PDA 改为手动标注优先，不做全量自动扫描；用户选择 PDA 后实时计算 HTF/session/midnight/LDN/NYAM 等上下文并打包标注
- 2026-05-20: PDA 第一阶段只做当前会话内存 store，不写 DB；手动 BSL/SSL 右键标注后实时生成 current TF/session context 并用 LiquidityPrimitive 渲染
- 2026-05-29: Review data storage direction is layered, not YAML-vs-DuckDB exclusive. Near term: localStorage remains the browser work draft, Review JSON/YAML remains the human-readable archive/exchange format while schemas keep evolving. Later, after Order Setup / PDA / Segment / Composite / SMT / Reaction Evidence object boundaries stabilize, add DuckDB import/export as the formal research database for batch query, statistics, cross-sample search, and reproducible analysis. YAML/JSON should continue as portable case files and migration/backup format even after DuckDB exists.
- 2026-05-30: Phase 12 Order Setup cleanup keeps `OrderReview` / `orderReviews` as the compatibility storage schema. User-facing language is `Order Setup`; runtime grouping should prefer `Setup Set`; persisted JSON/localStorage keys are not renamed until a dedicated migration exists.
- 2026-05-30: Reversal is the primary anchor element of an Order Setup, not a standalone global object. Entry/stop/targets/reason/result ownership is determined by the active Order Setup, not by nearest-marker guessing. Multiple independent Order Setups may share the same reversal bar when one reversal supports more than one execution plan.
- 2026-05-31: 旧 YAML 文件都是测试性质，不作为长期研究资产保留；V4 后续不需要兼容旧 YAML schema，不为旧 YAML 保留 migration/fallback。当前兼容边界只针对 V4 `orderReviews` localStorage / Review JSON；未来正式归档可直接面向新的 Review JSON/YAML 或 DuckDB schema 设计。
- 2026-05-29: Secondary chart annotation workflow will be introduced through an explicit `chart-context` boundary first. Existing primary chart modules remain the default behavior surface; secondary chart write actions must opt in through context-aware helpers so readonly split-screen behavior is not accidentally changed.
- 2026-05-20: PDA session 划分采用 Asia / London Killzone / London Close / NY Premarket / NY Open / AM Silver Bullet / NY Late Morning / Lunch / PM Open / PM Silver Bullet / Power Hour / Post-Close / CME Break；CME Break 跳过极值判断
- 2026-05-20: PDA context 计算区间与图表显示区间分离；右键标注时按所选 K 线所属 CME 交易日临时请求完整交易日数据，仅用于 PDA 极值计算，不改变图表显示
- 2026-05-20: 图表 crosshair 时间格式化统一使用 UTC getter，匹配 UTC epoch 承载的美东墙钟时间，避免浏览器本地时区偏移
- 2026-05-20: LiquidityPrimitive 接入 attached/requestUpdate，PDA 首个标注 attach 后立即重绘，不再依赖鼠标移动触发
- 2026-05-20: Viewport 工具条上移到时间轴上方，并改为仅在工具条周围局部热区 hover 时显示
- 2026-05-20: Viewport Scroll latest 使用 chart 当前实际 series 数据量，不再用完整 store displayBars 长度；避免 Replay On 状态下切换周期后滚到不存在的逻辑位置
- 2026-05-20: Viewport 按钮启用状态仍以 store displayBars 判断，避免 bars:loaded 先于 chart.setData 时 active series count 为 0 导致控件变灰
- 2026-05-20: PDA HTF context 使用完整 CME trading day 的 1M bars 作为唯一聚合源
- 2026-05-20: PDA HTF context 缓存键为 `instrument:source:1M:tradingDay`，例如 `NQ:source:1M:2012-01-09`
- 2026-05-20: PDA daily context 聚合边界使用 CME 18:00 trading day；intraday bucket high/low 不再作为 context 标签
- 2026-05-20: 跨 timeframe 对齐规则目前只用于 D context：以被右键选中的当前图表 K 线时间区间为准，检查重叠的 daily bucket；若所选 BSL/SSL 价格等于 daily high/low，则追加 D context 标签
- 2026-05-21: PDA context 不再显示 4H/1H/30M/15M/5M/1M bucket high/low；bucket 极值标签只保留 D 与 session/midnight，intraday 结构判断交给 advisory swing validation
- 2026-05-21: PDA 跨周期 D context 遇到同一 daily bucket 内多个当前周期等高/等低点时，只取最晚出现的当前周期 bar 作为 D high/low 的代表点
- 2026-05-21: 手动 PDA 标注按 source/type/price/canonicalTimestamp 归并；不同周期标注同一高/低点时合并 contexts 并更新当前图表 anchor，不重复渲染
- 2026-05-21: Step 11.1 完成通用 RangePrimitive 底座，renderer 支持 `shape: range` 的 start/end + top/bottom rectangle；FVG/OB/NWOG/NDOG 菜单和识别逻辑后续分步接入
- 2026-05-21: Step 11.2 完成 FVG-only 手动标注：右键 Mark FVG，按三根连续 K 线识别 FVG，成功后生成 range annotation 并用 RangePrimitive 渲染
- 2026-05-21: Step 11.3 完成 OB 全手动 range 标注：右键选择 Bullish/Bearish OB 起点，Shift+右键选终点，系统仅按选区计算 high/low，不做 OB 自动识别；OB range 无边框避免遮挡影线
- 2026-05-21: Step 11.4/12 完成客观 gap overlay：右键 Show/Hide Today NDOG 与 Show/Hide This Week NWOG；只使用当前已加载数据计算，缺少当日/本周 open 或前一日/上周 close 时提示无法显示
- 2026-05-21: BSL/SSL 手动标注增加 advisory swing validation，不阻止标注；规则为 D 1/1、4H 1/1、1H 2/2、30M 3/3、15M 4/4，5M/1M 暂不校验
- 2026-05-21: PDA 渲染按当前图表周期映射 anchor：annotation 保留 canonical timestamp，renderer 将其映射到当前 TF bucket，避免 1H 标注切到 4H/D 后因找不到原始时间而消失
- 2026-05-21: Step 13 完成 EQH/EQL 点位集合打包：右键开始 EQH/EQL set、继续添加点、选到第 2 个点后用 draft annotation 动态预览参考虚线，完成后生成正式 `shape: point-set` annotation；EQH 参考线画在所选点最高价，EQL 参考线画在所选点最低价；renderer 使用 `PointSetPrimitive` 绘制参考虚线、集合标签和小三角点位标识，EQH 标识统一在线段上方、EQL 标识统一在线段下方，便于多个 EQH/EQL 并存时区分归属；当前只做手动集合，不做严格等高/等低自动判定或持久化
- 2026-05-21: EQH/EQL 选点状态机已拆到 `v4/src/pda/point-set-annotation.js`，`manual-annotation.js` 只保留右键菜单路由与其他 PDA 入口
- 2026-05-21: 下一阶段采用通用 Inspector Sidebar 方案，不做 PDA 专用弹窗；先建立 selection store + hit-test + 只读 sidebar，再逐步加入删除、extendBars、EQH/EQL 点编辑、选中态高亮和 localStorage
- 2026-05-21: Phase 4 Step 14-16 完成首轮最小链路：`pda-selection.js` 管理当前选中 PDA，`pda-hit-test.js` 用像素容差命中 liquidity line/range/point-set，`inspector-sidebar.js` 提供可隐藏只读侧边栏；点击 PDA 打开 Inspector，点击空白或 Esc 清除 selection
- 2026-05-21: Inspector Sidebar 不作为 canvas 上层 overlay；页面改为 `#workspace` 横向布局，sidebar 打开时占用右侧宽度并压缩 `#chart-area`，避免遮挡图表
- 2026-05-21: Selected PDA 视觉反馈完成：renderer 监听 `pda:selected` / `pda:selection-cleared` 后重绘，选中 annotation 的 label 加 `●`，line/range/point-set 使用 `#f0f3fa` 提亮并轻微加粗；Inspector 同步显示 `● TYPE`
- 2026-05-21: Phase 4 Step 17-18 完成：Inspector 支持 Delete selected PDA、note、extendBars；renderer 和 hit-test 均读取 `display.extendBars`，BSL/SSL line、range rectangle、EQH/EQL point-set 的显示延伸不改原始结构时间字段
- 2026-05-21: EQH/EQL draft 选第一个点后立即渲染归属小三角 marker；只有一个点时不画参考线和 label，第二个点后再显示完整线段
- 2026-05-21: Phase 4 Step 19 完成 EQH/EQL 点集合编辑第一版：Inspector 点列表支持 Remove，删除后重算 reference price / contexts；剩余少于 2 点时自动删除集合并清除 selection
- 2026-05-21: 已完成向当前选中的 EQH/EQL 集合追加点：选中已完成集合后，右键其他 K 线显示 Add to Selected EQH/EQL，追加后重算 reference price / contexts 并刷新 Inspector
- 2026-05-21: PDA 持久化第一阶段采用浏览器 localStorage 作为工作草稿保存，不建数据库；YAML/export 用于后续复盘归档，DB 用于未来正式研究资产和统计查询
- 2026-05-21: Phase 4 Step 21 完成本地工作草稿持久化：手动 PDA 保存到 `localStorage` key `v4:pda-annotations:NQ`，启动时恢复；draft annotation、selection、hover、replay 状态不持久化；Inspector 空状态提供 Clear Saved PDA
- 2026-05-21: `feature/v4-inspector-sidebar` 与 `feature/v4-pda-local-storage` 已按功能边界拆分后依次合并回 `main`；下一阶段从 `main` 新开 export/import 分支
- 2026-05-21: Phase 5 Step 22-24 完成第一版 JSON archive：schema 使用 `app/version/exportedAt/instrument/timeframe/range/annotations`；Inspector Archive 区支持 Export/Import PDA JSON；导入时校验 app/version，过滤 draft，遇到 id 冲突自动重命名并保留 `importedFromId`
- 2026-05-21: Export PDA JSON 的范围定义为当前浏览器 PDA store 中全部非 draft PDA；不按当前屏幕可视窗口裁剪，也不导出 K 线数据、selection、hover、replay 或 viewport 状态
- 2026-05-21: Inspector 保留 `Show current PDA label`；该开关写入当前 annotation 的 `display.showLabel`，失焦后仍保持隐藏/显示，新建 PDA 默认显示 label
- 2026-05-21: PDA label 显示策略改为按 annotation 控制：普通 PDA 默认显示，只有被显式设置 `display.showLabel=false` 的 PDA 隐藏 label
- 2026-05-21: FVG range 不显示矩形边框；renderer 对既有 FVG annotation 强制透明边框，新建 FVG 也写入 `borderColor: transparent`
- 2026-05-21: Range PDA 支持在 Inspector 中显示/隐藏 CE 中间虚线；`display.showCe` 按 annotation 保存，适用于 FVG/OB/NDOG/NWOG，不影响矩形填充或 export schema
- 2026-05-21: CE 价格按 NQ tick size 0.25 对齐：annotation 保留 `ce.raw` 数学中点和 `ce.price` 可交易价，RangePrimitive 用 `ce.price` 绘制中线，Inspector 同时显示 CE 与 Raw CE
- 2026-05-21: 图表价格显示按 NQ tick size 0.25 对齐：series `priceFormat.minMove=0.25`，chart `localization.priceFormatter` 与 OHLC legend 都使用 tick rounding，避免 crosshair/价格轴显示不可交易价
- 2026-05-21: Review hardening 完成：Inspector 动态文本统一 escape；PDA archive import 增加类型/shape 最小校验、语义重复跳过、range CE 重算；CE 显示开关文案改为 `CE Visible`
- 2026-05-21: Phase 5 Step 25 手工验收通过：export/import、per-annotation label、CE 显示/隐藏、NQ 0.25 tick 对齐已确认；`feature/v4-pda-export-import` 可合并回 `main`
- 2026-05-21: Phase 6 启动 1H 行情段系统；segment 独立于 PDA store，第一版只做手动 1H 起终点连接和显式图表绘制，后续再做 selection、Inspector、PDA response linking
- 2026-05-21: Phase 6 Step 29-30 完成最小版：segment 支持 line/marker hit-test、点击选中、高亮显示；Inspector 支持查看起终点/方向并编辑 narrative/tags
- 2026-05-21: Phase 6 Step 31 完成最小版：选中 segment 后右键命中 PDA，可将 PDA 以 respected/swept/approached/rejected/delivered-through 关系写入 segment.pdaResponses；Inspector 显示已关联 PDA 列表
- 2026-05-21: Segment localStorage 草稿持久化完成：保存到 `v4:market-segments:NQ`，页面重新加载后恢复手动画段、narrative/tags、PDA responses；正式 review export/import 后续再扩展
- 2026-05-21: Segment 编辑闭环完成：Inspector 支持删除当前 segment、显示/隐藏 segment label、修改/删除 PDA response，并为 response 增加 note
- 2026-05-21: Segment/PDA 联动高亮完成：选中 segment 时，`segment.pdaResponses` 关联的 PDA 使用琥珀色加粗并在 label 前显示 `↔`；取消选择或修改 response 后自动重绘
- 2026-05-21: PDA response 增加 `selected` 开关；选中 segment 时只有 `selected=true` 的关联 PDA 跟随高亮，旧数据缺省按 true 兼容
- 2026-05-21: Segment 隔离模式完成：Inspector 可切换 `display.isolate`；隔离开启后只渲染该 segment 与其关联 PDA，失焦不退出隔离，只有取消勾选才恢复全量显示；K 线和编辑操作不受影响
- 2026-05-21: 隔离模式显示控制升级：segment 本身与每条 PDA response 均支持 `highlight` / `normal` / `hidden`；选择 segment 不会自动进入隔离，只有 `Isolate segment` 控制隔离开关
- 2026-05-21: Segment display mode 硬重置完成：重新点选 segment 或新建 segment 时，所有 segment 组内 object 的显示模式统一回到 `highlight`
- 2026-05-21: Segment display mode 重置增加隔离例外：当前存在 isolate segment 时，点选/新建 segment 不再重置 PDA responses 的 `normal/highlight/hidden`
- 2026-05-21: Segment display mode 修复：`hidden` 现在真正跳过渲染但保留 object；isolate 状态下 segment 本身从 `highlight` 切到 `normal` 会即时按普通样式重绘，不再被 selected 状态强制高亮
- 2026-05-21: Review archive 完成：Inspector Archive 区新增 Export/Import Review JSON；Review JSON 导出 PDA annotations 与 market segments，不导出 K 线数据；导入时先合并 PDA 并建立 id remap，再导入 segment 与 pdaResponses，处理 id 冲突、语义重复与 orphan response 过滤；导入 segment 默认关闭 isolate，避免恢复归档时直接进入隔离视图
- 2026-05-21: Inspector 增加顶部工具栏 Archive 直接入口；Archive 操作不再依赖先选中 PDA 或 segment，对象选中仍会打开对应 detail inspector
- 2026-05-22: Review Notes 暂不做自由文本手填方案；新设计以 segment 终点反转/停止为核心，原因拆成关联 PDA 与反应方式，并优先实现只读计算指标
- 2026-05-22: Segment review metrics foundation 完成：新增 `segment-review-metrics.js`，在首尾连续、反向、high/low endpoint 语义下计算 `extensionRatio`、`tookPreviousExtreme`、`overshootPoints`、`overshootRatio`、`stoppedAtPreviousRangePositionPercent` 与 terminal bar OHLC/body/wick facts；Segment Inspector 已展示当前 foundation 只读指标，不写入 segment/review archive
- 2026-05-22: PDA-specific terminal reaction metrics 完成只读版：Segment Inspector 基于 segment 已关联 PDA 展示 Terminal PDA Candidates；range PDA 计算 wick/body 进入深度、CE 触碰、swept/reversed/delivered-through，liquidity/point-set PDA 计算 sweep/equality/approach/close-back-through，Fib 计算最近 level 与 wick/body/sweep/delivered-through；候选按触碰与距离排序，不写入 `segment.review`
- 2026-05-22: Segment fluency 组件指标完成只读版：基于当前加载的 segment 内 bars 展示 bar count、path range、directional efficiency、overlap ratio、counter/directional close ratio、average body percent、max adverse excursion、points per bar、terminal 前 PDA interruption count；仅展示组件，不合成最终分数，不写入 archive
- 2026-05-22: 1H segment 手动创建改为显式端点语义：右键菜单提供 `Start 1H Segment from Low/High` 与 `End 1H Segment at High/Low`，新建 segment 的 start/end price 完全按用户选择的本根 K 线 high/low 写入；暂不做自动区间高低点推断，为未来方案预留
- 2026-05-22: Segment Inspector Review Metrics 收敛为 `Extension Ratio` + `Extension State` 主解释，不再显示 `Overshoot/Overshoot Ratio/Stopped Inside`；Terminal PDA Candidates 改为按 Range/Liquidity/Fib 展开详细反应字段；新建 segment 默认 `showLabel=false`，并新增 `v4/docs/INSPECTOR_HELP.md`
- 2026-05-22: Wick CE 作为独立 PDA 类型接入：`type=wick-ce` / `shape=liquidity-line`；右键菜单支持 `Mark Upper Wick CE` 与 `Mark Lower Wick CE`，按当前周期生成 `<TF> Upper/Lower Wick CE`，上影线 CE = `(high + bodyHigh)/2`，下影线 CE = `(low + bodyLow)/2`
- 2026-05-23: Segment isolate 增加上下文显示选项：`Prev segments` 可临时显示当前 isolate segment 前 N 个 segment，`Include previous PDA responses` 可同时显示这些前序 segment 的 PDA responses；前序对象只做普通上下文显示，不抢当前 isolate segment 高亮
- 2026-05-23: Wick CE 线段渲染改细：`type=wick-ce` 单独使用 `lineWidth=1`，不跟随普通 liquidity-line 的 `2/3` 加粗规则；BSL/SSL 等其它 liquidity-line 不受影响
- 2026-05-23: Composite Move MVP 完成：新增 `segment-group-store` 独立记录多段连续 segment 的父级结构；Segment Inspector 支持 staged segments 后创建 Composite Move、查看所属 group 及 net/path/efficiency/pullback/target extreme 指标；图表以淡色父级线显示 group；localStorage 与 Review JSON 已包含 `segmentGroups`
- 2026-05-23: Composite Move 增加右键工作流：右键命中 segment 可 Add/Remove Segment To Draft、Set Segment As Target、Create Composite Move、Clear Composite Draft；Inspector 的 Target Segment 下拉与右键 target 共用同一 draft target 状态
- 2026-05-23: Composite Move 交互升级：draft child segment 用橙色加粗临时标记，draft target segment 用紫色加粗临时标记；创建后的 composite 父级线支持 hit-test/click selection，并新增独立 Composite Move Inspector，可编辑 target/objective/outcome/notes/display 与删除 group
- 2026-05-23: Composite Move 选中态补充：选中 composite 父级线时，父级线白色高亮，正式 child segments 用与 draft child 一致的橙色加粗标记，target segment 用与 draft target 一致的紫色加粗标记，target 紫色优先于 child 橙色
- 2026-05-23: 修复 Terminal PDA Candidates liquidity reaction：BSL/SSL/EQH/EQL 等 high/low liquidity 分支现在填充 `bodyTouched`，Inspector `Body Touch` 与候选排序不再漏掉 terminal candle body 穿越/等于 liquidity level 的情况
- 2026-05-23: 补齐 high/low liquidity reaction 的 `touched` 字段：sweep 或 exact equality 时 `Touched` 现在会在 Inspector 中显示为 yes，与 `Swept/Exact Equality/Body Touch` 字段保持一致
- 2026-05-24: This Week NWOG 改为 replay-aware：价格区间仍由真实 Sunday 18:00 open 与上周 Friday close 计算；Replay Bar 开启时矩形只绘制到当前 replay 已显示的本周最后一根 K 线，并在 replay 前进/后退/退出时同步刷新；若当前加载 bars 缺少周开盘/上周收盘参考点，会临时请求 1H reference bars
- 2026-05-24: FVG direction 命名修正为 ICT 语义：`K1.high < K3.low` 记为 bullish FVG，`K1.low > K3.high` 记为 bearish FVG；价格区间 top/bottom 不变，颜色随 direction 自动切换
- 2026-05-24: 新增 IFVG PDA：复用 FVG 三根 K 线识别与 range 绘制结构，写入 `type=ifvg`，direction 与 FVG 相反，并统一使用黄色系 `#fdd835` 绘制，不再按 bullish/bearish 分色
- 2026-05-25: 新增 Display Mode 预设显隐层：工具栏提供 `All / Selected PDA / Recent Workspace` 与共享 `N`；`Selected PDA` 无选中对象时自然等价于只显示结构，旧 localStorage `structure-only` 会迁移到 `selected-pda`；状态只进 localStorage，不进入 Review JSON；renderer 与 hit-test 共用 `shouldRenderPda/Segment/SegmentGroup`；Recent Workspace 按 segment end timestamp 与 composite child 最新 end timestamp 取最近 N，选中 segment/composite 会 additive 显示其结构与关联 PDA；isolate mode 仍高于普通 display mode
- 2026-05-25: Display Mode resolver 收敛为 `buildVisibilitySets()` / `getDisplayVisibility()`：统一返回 `visiblePdaIds / visibleSegmentIds / visibleGroupIds`，`shouldRenderPda/Segment/SegmentGroup` 只查这些 Set，便于后续继续加显示过滤条件或测试
- 2026-05-25: 09:30 / 09:50 / Silver Bullet 开单复盘方向确认：1H segment 继续作为唯一 structure backbone，不因为 09:30 强行切段；09:30 作为 event anchor / execution lens 单独建 Opportunity Review 层，30M/5M/1M 只作为 09:30-11:00 的 execution evidence，不替代 1H path；后续模块应引用现有 segment/composite/PDA，而不是把旧 YAML schema 原样塞回 V4
- 2026-05-25: 1H segment 低周期对齐修复：手工创建 1H segment 时为端点补 `sourceTimeframe / occurrenceTimestamp / occurrenceTime / occurrenceSourceTimeframe`；系统请求该 1H bar 的 1M 数据定位真实 high/low 发生时间，多个相同 high/low 时取最右侧 occurrence；renderer 与 hit-test 共用 `getSegmentPointRenderTime()`，低周期优先 occurrence，高周期仍用原始 1H bucket timestamp；旧 segment 无 occurrence 字段时继续兼容
- 2026-05-25: Split Screen Step 1 范围确认：先做 `primary chart + readonly secondary chart`；主图保留现有完整 V4 功能，副图第一版只显示同一绝对区间的独立周期 K 线，不做副图右键、标注、segment、Inspector、独立 replay、PDA/segment 渲染或双向 viewport 同步；原因是当前 chart-manager/bar-store/replay/selection/renderers 均为单图表单例，直接做双完整图会牵动过大
- 2026-05-25: Split Screen Step 2 布局骨架完成：新增 `#chart-stack`、`#primary-chart-panel`、隐藏的 `#secondary-chart-panel/#secondary-chart`；保留主图原有 `#chart/#ohlc-legend/#pda-context-menu/#viewport-controls` id；默认副图隐藏，未来通过 `#chart-area.split-screen-enabled` 上下分屏，主副图高度约 `64% / 36%`
- 2026-05-25: Split Screen Step 3 副图 manager 完成：新增 `chart/secondary-chart-manager.js`，独立持有 `secondaryChart/secondarySeries/resizeObserver/cursorPrimitive`，复用现有 chart theme、candlestick style、价格格式与 vertical cursor primitive；提供 init/setData/update/clear/showStart/showEnd/showCursor/hideCursor/destroy 接口；未改主图 `chart-manager.js`，也未接入 `app.js`，因此当前无运行行为变化
- 2026-05-25: Split Screen Step 4 副图状态完成：新增 `data/secondary-chart-store.js`，独立保存 `enabled/bars/currentStart/currentEnd/currentTimeframe/requestedRange`，默认副图周期 `1H`；提供 enable/timeframe/setBars/getDisplayBars/clear/reset 等接口，并使用 `secondary-chart:*` 与 `secondary-bars:*` 独立事件名，避免误触发主图 bar-store/replay/renderers；暂未接入 toolbar 或 app
- 2026-05-25: Split Screen Step 5 toolbar 控件完成：工具栏新增 `Split` checkbox 与 `Sub TF` 下拉；控件写入 `secondary-chart-store`，并通过 `syncSplitScreenLayout()` 切换 `#chart-area.split-screen-enabled`、`#secondary-chart-panel.hidden` 与 Sub TF disabled 状态；当前只控制布局和状态，打开后副图为空，数据加载留到 Step 6
- 2026-05-25: Split Screen Step 6 副图加载完成：新增 `ui/secondary-chart-controller.js` 并在 `app.js` 初始化；Split 开启后等待 panel 显示、初始化副图 chart、读取主图当前 `start/end`，按 Sub TF 调 `fetchBars()` 并写入副图 store/render candlesticks；主图 reload 或 Sub TF 改变时副图按同一绝对区间重载；使用 request sequence 防止旧响应覆盖新请求；副图仍只读，不渲染 PDA/segment，也不接管右键/Inspector/replay
- 2026-05-25: Split Screen Step 7 replay cursor 同步完成：副图 controller 监听主图 `replay:changed`，Split 开启且 replay active 时将 `cursorTimestamp` 用 `getBucketStart()` 映射到副图当前周期并调用 `showSecondaryCursor()`；副图为日线时转成 chart date string；Split 关闭、replay off 或 cursor 无效时隐藏副图 cursor；副图不切片数据，只显示时间 marker
- 2026-05-25: Split Screen Step 8 生命周期加固完成：关闭 Split 时清空副图 bars 并销毁副图 chart；主图 `bars:cleared` 或副图 reload 开始时清空旧副图数据，避免展示 stale range；副图 controller 保存最新 primary replay state，副图 bars 渲染或 Sub TF 重载后会重新按当前副图周期映射 cursor，避免周期切换后保留旧 bucket marker；request sequence 继续防止旧 fetch 覆盖新请求
- 2026-05-25: Split Screen Step 9 验证完成：`node --check` 覆盖 `app/toolbar/secondary-chart-controller/secondary-chart-store/secondary-chart-manager`；API health 与页面服务正常；headless Chrome 验证默认无 Split 时副图隐藏且主图 canvas 正常，主图单独加载后 replay 可用，Split 开启后副图加载并生成 canvas，Sub TF 切 1M 后副图重载，主图 Replay Bar On 时副图保持渲染，关闭 Split 后副图 canvas 清零且 Sub TF disabled；未观察到主图回归
- 2026-05-25: Split Screen Step 10 crosshair 单向同步完成：副图仍 readonly，只响应主图 hover；`secondary-chart-manager.js` 新增独立 hover cursor primitive，与 replay cursor 分离并使用更淡颜色，提供 `showSecondaryHoverCursor(time)` / `hideSecondaryHoverCursor()`；`secondary-chart-controller.js` 监听主图 `chart.onCrosshairMove()`，将主图 hover time 映射到副图当前 timeframe bucket 后显示 hover cursor；Split off、无 time、无副图数据或映射失败时隐藏；日线主图通过 display bars 查回 timestamp 后映射
- 2026-05-25: Split Screen Step 10 验证通过：`node --check` 覆盖 `secondary-chart-manager/secondary-chart-controller/secondary-chart-store/toolbar`；headless Chrome 验证 Split on + 默认 1H 副图 + Replay Bar On 状态下主图 mouse move 无 runtime exception，副图 canvas 保持渲染，hover cursor 与 replay cursor 可并存
- 2026-05-25: Split Screen 默认副图周期已改为 `1H`：`secondary-chart-store.js` 的 `DEFAULT_SECONDARY_TIMEFRAME = 60`，Sub TF 下拉默认选中 `1H`
- 2026-05-25: Split Screen 默认副图周期验证通过：`node --check` 覆盖 `secondary-chart-store/toolbar/secondary-chart-controller`；headless Chrome 确认初始 `Sub TF=60/1H` 且 disabled，Split on 后默认仍为 `1H`，副图生成 canvas 并完成 1H 数据加载
- 2026-05-25: Split Screen layout mode 完成：`secondary-chart-store.js` 新增 `layout=stack|side`，默认 `stack`；toolbar 在 Split/Sub TF 旁新增 Layout select，Split off 时 disabled；`syncSplitScreenLayout()` 切换 `split-screen-stack` / `split-screen-side` class；Stack 保持上下分屏约 `64%/36%`，Side 改为左右分屏约 `60%/40%`，副图在左、主图在右，并将副图分隔边框切到 `border-right`；未改变副图数据加载或渲染逻辑
- 2026-05-25: Split Screen layout mode 验证通过：`node --check` 覆盖 `secondary-chart-store/toolbar/secondary-chart-controller/secondary-chart-manager`；headless Chrome 确认初始 Layout=`stack` 且 disabled，Split on 后 stack class 生效且副图加载，切换 `Side` 后 `#chart-stack` flex-direction=row、`split-screen-side` class 生效、副图在左、主图在右、副图 `border-right=1px/border-top=0` 且 canvas 仍渲染，无 runtime exception
- 2026-05-25: Split Screen readonly segment/composite overlay 完成：新增 `segment/secondary-segment-renderer.js`，副图只读取现有 segment/composite store 与 Display Mode resolver，将 segment 端点用 `getSegmentPointRenderTime(point, secondaryTf)` 映射到副图周期后渲染到 secondary chart；composite 使用按时间排序后的首个 child start 与最后 child end；不接入副图 hit-test、selection、右键菜单或 Inspector，第一版统一 normal 样式；`secondary-chart-manager.js` 补充 secondary primitive attach/clear helper；Split 关闭、secondary bars clear/reset 会清理副图 overlay
- 2026-05-25: Split Screen readonly PDA overlay 第一阶段完成：新增 `pda/secondary-pda-renderer.js`，副图只读取现有 PDA store 与 Display Mode resolver，将 liquidity-line 与 range PDA 映射到副图周期后渲染到 secondary chart；timestamp 通过 `getBucketStart(timestamp, secondaryTf)` 映射，日线副图转成 chart date string；range 支持 CE/midline、extendBars、label 显隐与 FVG/IFVG 无边框样式；不接入副图 hit-test、selection、右键菜单或 Inspector，第一版不渲染 selected/linked highlight
- 2026-05-25: Split Screen readonly PDA overlay 第二阶段完成：`secondary-pda-renderer.js` 补齐 `point-set` 与 `fib-retracement`，EQH/EQL 点位按副图周期映射每个 point，Fib start/end 按副图周期映射并复用原有 level price 计算；仍保持副图只读、不接入 hit-test/selection/Inspector，不同步 selected/linked highlight
- 2026-05-25: Split Screen overlay visibility resolver 第一步完成：新增 `display/overlay-visibility.js`，集中计算 `visibleSegmentIds / hiddenSegmentIds / visibleGroupIds / visiblePdaIds / hiddenPdaIds / highlightPdaIds / isolate`，封装普通 Display Mode、selected segment/composite 关联 PDA additive 显示，以及 segment isolate 下 isolated + companion segment、linked PDA visible/hidden/highlight 语义；当前只是新增 helper，renderer 尚未切换使用
- 2026-05-25: Split Screen 副图 segment/composite renderer 已切到 `getStructureOverlayVisibility()`：副图 segment/composite 显示范围现在使用共享 resolver，支持普通 Display Mode、segment isolate、isolate companion、isolated segment hidden 状态；副图仍只读且不渲染 selected/draft 高亮
- 2026-05-25: Split Screen 副图 PDA renderer 已切到 `getStructureOverlayVisibility()`：副图 PDA 显示范围现在使用共享 resolver，支持普通 Display Mode、selected segment/composite 关联 PDA additive 显示、segment isolate linked PDA visible/hidden 语义；副图仍只读且暂不同步 selected/linked highlight 样式
- 2026-05-25: Split Screen layout-only reload 修复完成：`secondary-chart-controller.js` 缓存上次 `enabled/timeframe`，`secondary-chart:settings-changed` 中只有 Split 开关或 Sub TF 变化才清空/加载副图；Stack/Side layout 切换不再递增 requestSeq、不清空 bars、不重新 fetch，ResizeObserver 继续负责尺寸变化
- 2026-05-26: Split Screen Step 9 验证完成：全量 `node --check` 通过；API health 与 8001 页面服务正常；headless Chrome CDP 覆盖主图加载、Split on/off、默认 1H 副图、Stack/Side layout-only 切换不触发可见 reload、Sub TF 切到 1M 后副图从 41 根重载到 218 根、Replay On 与副图并存、Split 关闭后 secondary canvas 清零且主图保持渲染；segment/composite/PDA 副图 overlay 本轮以全量语法检查和此前 renderer 专项检查覆盖，未导入对象 fixture 做浏览器截图验收
- TODO SMT 研究结论：仅关注 NQ / ES，第一版采用“半自动候选 + 手动确认”的 SMT 标注，不做无监督全量自动扫描；SMT 应作为跨品种 review evidence 独立于 PDA/segment store，依赖 split-screen 增加副图 instrument selector（主图 NQ，副图 ES，或反向）和同一绝对时间区间/周期对齐。第一版支持两类 SMT：1) liquidity sweep divergence：系统在用户指定窗口内提示一个品种 sweep 前高/前低或形成 HH/LL、另一个没有的候选，由用户确认保存；2) FVG reaction divergence：系统可提示一个品种存在并尊重 FVG 后反转、另一个没有对应 FVG 但在相同时间窗口同步反转的候选，由用户确认保存。建议数据结构记录 `primaryInstrument / compareInstrument / direction / leader / subtype=sweep-divergence|fvg-reaction / confidence|candidateReason / confirmed=true|false / windowStart/windowEnd / primaryPoint / comparePoint / linkedPdaId(optional) / note`；先做候选生成、人工确认、双图 marker/连接线渲染、Review JSON 持久化，暂不做自动入库
- 2026-05-25: Viewport Scroll latest 价格轴修复：`chart-manager.js` 新增 `resetPriceScale()`，`viewport-controller.scrollToLatest()` 在移动到最新 logical range 后恢复 price scale autoScale；避免用户手动拖动/缩放价格轴后，Scroll latest 只回到时间轴末端但最新 K 线仍落在价格轴可视范围外
- 2026-05-26: Viewport reset 命名收敛完成：删除独立 `Scroll to latest` UI/action，保留单一 `Reset chart view` 按钮；`resetChartView()` 与 `Alt+R` 继续调用 `scrollToLatest()` 行为（保持当前缩放、锚定最新 K 线、保留右侧 offset、重置价格轴 autoScale），以贴近 TradingView
- 2026-05-25: Structure Sets 列表定位第一版完成：Inspector 空状态新增 `Structure Sets` 列表，每个 segment/composite 作为一个绘制集条目；点击条目会选中对应 segment/composite 并调用 `viewport.locateTimestampRange()` 滚动到其时间范围，同时恢复 price scale；不改变 Display Mode、不做临时显隐、不写 Review JSON
- 2026-05-26: Structure Sets focus 第二版完成：点击绘制集不再走 chart selection，而是进入独立临时 focus 状态；再次点击同一项恢复原状态，单击 canvas 空白不清除该 focus；支持多选 segment/composite 绘制集；被 focus 的绘制集在 Inspector 列表中显示 active 样式，并在主图/副图以琥珀色高亮；原本被 Display Mode 隐藏的绘制集及其非 hidden PDA response 会临时显示并高亮；状态只存在当前前端会话，不写 localStorage 或 Review JSON
- 2026-05-26: Reaction Evidence 新方案确认：不做系统自动判断 `respect/sweep`，改为人工确认事件存在并指定 PDA + 连续 K 线群，系统只做客观量化；FVG respect 以 FVG 本体高度为分母计算 wick/body 进入百分比，body 超过 100% 不截断、如实保存并在 UI 标红；liquidity sweep 以被 sweep 的 liquidity price 为分母计算 wick/body sweep 百分比，便于跨年份/跨价格区间对比；第一版用 Inspector 时间输入指定 first/last/terminal bar，不做 canvas 框选、不做自动识别；最终 verdict 字段暂不纳入计划，转为未定事项
- 2026-05-26: Reaction Evidence Plan 1 完成：新增 `segment/reaction-evidence.js` 核心模块，提供 evidence 创建/normalize、时间解析、actor K 线群提取、FVG respect 百分比计算、liquidity sweep 百分比计算、liquidity side 推断与 segment 默认 actor 构造；尚未接 Inspector UI、localStorage normalize 或 Review JSON import normalize
- 2026-05-26: Reaction Evidence Plan 2 完成：核心模块补齐批量 `reactionEvidence[]` normalize 与 `computeReactionEvidenceWithMetrics()`，后续 Inspector UI / Review JSON import 可以直接复用，不需要在渲染层重复拼装 metrics
- 2026-05-26: Reaction Evidence Plan 3 完成：Segment Inspector 的 `PDA Responses` 每条 response 下接入 evidence UI；range PDA 可添加 `FVG Respect Evidence`，high/low liquidity PDA 可添加 `Liquidity Sweep Evidence`；支持编辑 first/last/terminal bar、FVG entrySide、note，显示即时计算 metrics，并支持删除 evidence；bodyEntryPercentOfFvg 超过 100% 时用红色样式提示
- 2026-05-26: Reaction Evidence Plan 4 完成：确认 localStorage 不需要新增 schema；`segment-persistence.js` 保存完整 persistable segment，刷新恢复会自然保留 `pdaResponses[].reactionEvidence[]`；`updatePdaResponse()`、重复 link、display reset 路径都会保留 evidence 字段
- 2026-05-26: Reaction Evidence Plan 5 完成：Review JSON import 的 `normalizeImportedResponse()` 接入 `normalizeReactionEvidenceList()`，导入 segment 的 PDA response 时保留并规范化 `reactionEvidence[]`；evidence 的 `pdaId` 会绑定到导入后/remap 后的 response PDA，避免归档导入后出现旧 PDA id 引用
- 2026-05-26: Reaction Evidence Plan 6 完成：FVG respect 的 `bodyExceededFvg=true` 时，Segment Inspector 同时高亮 `Body Entry` 百分比与 `Body Exceeded` 状态；数值仍保持真实计算结果，不做 clamp
- 2026-05-27: Reaction Evidence actor 周期 UI 完成：每条 evidence 显示并可编辑 `Actor TF`；`First/Last/Terminal Bar` 改名为 `Actor First/Actor Last/Actor Terminal`，明确这些时间属于 actor K 线群而非 PDA/FVG 周期；metrics 只有在 `Actor TF` 与当前加载图表周期一致时才计算，不一致时显示提示，避免按错误周期 bars 误算
- 2026-05-27: Reaction Evidence actor 选择效率组件计划确认：这类功能只提升 K 线群选择/取数效率，不做自动 respect/sweep 判断、不做 verdict；执行顺序为 1) Actor First/Last/Terminal chart pick，2) Actor TF 不等于当前图表周期时自动拉取 actor TF bars 计算 metrics，3) canvas 框选连续 K 线群。Step 1 已完成：每个 actor 时间字段有 `Pick` 按钮，hover 显示竖线预览，点击图表写入当前图表 K 线 timestamp，Escape 取消；若 `Actor TF` 与当前图表周期不一致则拒绝 pick，避免误选错误周期 K 线
- 2026-05-27: Reaction Evidence workflow 已合并回 `main`：merge commit `d660b2a merge(v4): reaction evidence workflow`；合并后全量 `v4/src/**/*.js` 语法检查与 `git diff --check HEAD^ HEAD` 通过；后续只保留 actor TF 自动取数、canvas 框选 actor K 线群、verdict 未定、统计页 deferred 等非当前计划项
- 2026-05-27: SMT ES 数据准备完成：`duckdb_import_nq_1m.py` 支持英文/中文 CSV 表头别名，`ES.csv` 无需改表头即可导入；本地 `trading_data.duckdb.futures_1m` 已写入 `instrument=ES` 共 6,431,985 根，范围 `2008-01-02 06:01` 到 `2026-05-22 16:59`，空 ts 与重复 ts 均为 0；V4 API `/v4/bars?instrument=ES...` 已能返回 ES 1M/1H bars。下一步 SMT 前置开发是 Split Screen 增加副图 instrument selector，使主图 NQ / 副图 ES 能按同一绝对时间区间与周期对齐
- 2026-05-27: SMT Split Screen 副图 instrument selector 完成：`config.js` 新增 `INSTRUMENT_OPTIONS=['NQ','ES']` 与 ES tick 配置；`secondary-chart-store.js` 新增副图 instrument 状态，默认 ES；toolbar 在 Split 后新增 `Sub` 下拉；`secondary-chart-controller.js` 在副图加载时按所选 instrument 调 `/v4/bars`，并在 instrument 变化时 reload，layout-only 切换仍不 reload；全量 `v4/src/**/*.js` 语法检查通过，headless Chrome DOM 检查确认页面初始化、Sub 默认 ES 且 Split off 时禁用
- 2026-05-27: Split Screen 预配置交互调整：`Sub` / `Sub TF` / `Layout` 在 Split off 时保持可编辑，只是不显示/加载副图；勾选 Split 后按当前预设 instrument/timeframe/layout 生效；全量 `v4/src/**/*.js` 语法检查通过，headless Chrome DOM 检查确认三个控件不再 disabled
- 2026-05-27: SMT Phase 1 观察基础完成：副图新增 instrument/timeframe label（如 `ES 1H` / `NQ 1M`）与独立 OHLC legend；headless Chrome 验证 Split off 可预设，Split on 按预设加载 ES 1H，Stack/Side layout-only 切换不 reload，Sub TF 切 1M 按同一绝对时间范围 reload，Sub 从 ES 切 NQ 按同一绝对时间范围 reload，副图 hover 能更新 OHLC legend；下一步可进入手动 SMT 标注 MVP（store / renderer / Inspector 或右键入口）
- 2026-05-27: SMT 手工标注计划更新：只做 `NQ follows ES`，不做 ES follows NQ；所有 SMT 标注动作必须在图表中完成，右侧 Inspector 只显示/备注/定位/删除。Liquidity SMT 通过图表选择同周期 left/right 两根 K，NQ/ES 两图使用严格相同 left/right timestamp，bearish 连 high、bullish 连 low，并在 NQ/ES 两图都画两点连线；record 必须保存 timeframe，非原周期第一版不显示。FVG SMT 通过图表选择 ES FVG 所在 K，record 保存 timeframe + timestamp；ES 副图正常显示 FVG range，NQ 主图只标记同时间 K；第一版仅原周期显示，不做跨周期投影。建议实现顺序：smt-store → renderer 可渲染手工造数据 → manual-smt liquidity 两点点击 → Inspector list/note/delete/locate → localStorage → Review JSON → FVG SMT 识别与标注 → 浏览器验证。
- 2026-05-27: `feature/smt-annotation-ui` 新分支开始 SMT 标注 UI：新增 `smt-store`、`smt-renderer`、`manual-smt` 与 Inspector SMT list。主图右键菜单新增 `Start Bearish/Bullish Liquidity SMT` 与 `Mark Bearish/Bullish FVG SMT`；Liquidity 从右键所在 K 作为 left，随后左键选择 right，校验 NQ no-sweep + ES sweep 后生成记录，并在 NQ/ES 两图画同 timestamp 两点连线；FVG SMT 点击同时间 K 后在 ES bars 中识别 FVG，ES 渲染 FVG range，NQ 渲染同时间 marker；SMT 只在 record timeframe 等于当前图表周期时显示。Inspector 目前只提供 list、note、Locate、Delete；localStorage 与 Review JSON 尚未接入。
- 2026-05-27: 右键菜单过长问题修复：菜单改为 `details/summary` 折叠分组，`PDA` 默认展开，`SMT`、`1H Segments`、`Point Sets`、`Objective Gaps`、`Clear` 默认折叠，上下文相关分组可默认展开；同时修正菜单定位使用实际宽度 220px，靠近 canvas 下沿时自动上移，仍放不下时菜单内部滚动。主图右键菜单新增 `Locate Time in Secondary`，可将副图定位到当前主图 K 线 timestamp 附近并显示副图 hover cursor。
- 2026-05-27: Order Review / Execution Lens 研究分支启动：新增 Phase 8 TODO，确认订单复盘不从“下单记录表”开始，而是先设计 Opportunity Review / Execution Lens 层；该层以 09:30、09:50、Silver Bullet 等窗口作为 event anchor，引用现有 1H segment / Composite Move / PDA / SMT / Reaction Evidence，再向下挂 Entry Review。第一版保持人工复盘，不做自动信号、不自动判断 reversal/Silver Bullet 是否成立、不替代 1H structure backbone。
- 2026-05-28: Order Review MVP 已合并回 `main`：`research/order-review` fast-forward 到 `6fe4a87 fix(v4): remap composite refs in order review imports`。已完成 store、localStorage、Inspector list/create/locate/delete/result/note、primary chart marker/helper lines、Review JSON `orderReviews` export/import、文档与验证。合并前运行相关 `node --check` 与 `git diff --check`；review 中发现的 Composite Move linked ref import remap 问题已修复。下一阶段建议进入 Phase 8C：图表点选 setup/entry/exit、完整编辑表单、真实历史样例视觉验收。
- 2026-05-27: 副图 Viewport Controls 完成：`#secondary-chart` 内新增 `#secondary-viewport-controls`，新增 `chart/secondary-viewport-controller.js`，并在 `secondary-chart-manager.js` 暴露副图 logical range、active data count、price scale reset API；`viewport-controls.js` 统一初始化主图/副图控制条。副图支持 zoom in/out、scroll left/right、reset secondary chart view，Split 未开启或副图无数据时 disabled；`Alt+R` 仍只控制主图 reset。
- 2026-05-28: Phase 8C Order Review Editing UI 已合并回 `main`：`feature/order-review-editing-ui` fast-forward 到 `468dd28 fix(v4): clear order review price pick on cancel`。已完成 Inspector 完整编辑表单、Setup/Entry/Result 字段保存、linked refs 管理、setup/entry/exit 时间 pick、entry/stop/final target 价格 pick，并保留人工复盘边界：不做拖拽、不做自动信号、不做统计页。合并前全量 `v4/src/**/*.js` 语法检查、`git diff --check main...HEAD`、API health、headless Chrome smoke 均通过；review 中发现的 price pick cancel 后状态残留问题已修复。
- 2026-05-22: Inspector render 层拆分为 `ui/inspector/*-panel.js` 与 `render-utils.js`；`inspector-sidebar.js` 保留 panel 状态、事件监听、store update、selection refresh
- 2026-05-22: Fib PDA MVP 完成：新增 `type: fib` / `shape: fib-retracement`，右键 Start Fib + Shift 右键终点创建，固定 levels `1/0.79/0.705/0.62/0.5/0.236/0`，支持渲染、hit-test、selection/segment-linked 高亮、Inspector level price、export/import；`Show current PDA label` 对 Fib 表示左侧 level 数值显示/隐藏
- 2026-05-22: Clear PDA 现在会同步清空所有 segment 的 `pdaResponses`，避免 PDA 删除后 segment 组里残留 orphan response
- 2026-05-28: PDA `extend` 语义从“当前周期 K 线根数”升级为“真实影响时长”：Inspector 在当前周期输入 N 根时保存 `display.extendSeconds = N * 当前周期秒数` 与 `extendTimeframe`；主图、副图、hit-test 按当前周期换算为渲染根数。旧标注若无 `extendSeconds`，优先从 `display.extendTimeframe/sourceTimeframe/timeframe/contexts` 推断原周期后兼容换算。Primitive 小数延伸使用 `barSpacing` 像素级计算，避免 `logicalToCoordinate(logical + 小数)` 造成反向漂移；Fib 始终保留原始左右边界，只在右边界追加 extend。
- 2026-05-28: Phase 9 Calendar Navigator 第一轮完成：Inspector Calendar 默认覆盖当前加载图表 start/end，日期点击定位到当天 09:30；日期列表显示当天 Order Setup / SMT / PDA / Segment / Composite / Killzone / Time Line，并支持每个对象 `Locate`，定位后通过临时 flash primitive 高亮目标时间范围；有 Order Setup 的日期显示红色角标。
- 2026-05-28: Calendar 对象操作拆分为 `Locate` 与 `Open`：`Locate` 只定位 + 快闪，不切换 Inspector 面板；PDA / Segment / Composite 行单独提供 `Open`，需要查看细节时才进入对应详情面板。从 Calendar Open 进入详情后，详情顶部提供 `Back to Calendar` 返回按钮，并保留原 selected date / view month。
- 2026-05-29: Split Replay 主副图同步补强：Replay Bar On 时副图不再显示完整未来 K 线，而是按主图 `cursorTimestamp` 截断到副图当前周期 bucket；Replay Off/Close 恢复完整副图数据；副图 `showSecondaryEndOfData()` 继承上一帧 logical range width 与右侧 anchor，修复主图 1M / 副图 1H replay 时副图最新 K 线逐步变细并向右漂移的问题。
- 2026-05-29: Split Replay 高周期副图渐进 K 线完成：副图 Replay On 时额外加载同品种 1M replay source；若副图周期高于 1M，当前未完成高周期 K 线按 replay cursor 聚合 1M bars 生成 partial OHLC，避免主图 1M 播到 07:13 时副图 1H 提前显示完整 07:00-07:59 K 线。Replay Off 仍显示完整副图 K 线。
- 2026-05-29: Date Range Calendar 易用性补强完成：成功加载 range 后自动写入 `localStorage` 历史范围，记录 `start/end/timeframe`，支持 Load History Range、单条删除、清空历史、最多保留 8 条并去重置顶；Date Range popover 增加 `<<` / `>>` 年切换按钮，`<` / `>` 继续切换月。
- 2026-05-29: Phase 9 Step 91 Calendar Day Details 第一版 UI 完成：Inspector Calendar 的当天对象列表改为 `details` 分组，顺序固定为 Order Setups、SMT、PDA、Segments、Composite、Killzones / Time Lines；Order Setups 默认展开，其余默认折叠；对象行拆成时间、类型标签、摘要与 Locate/Open 动作区，避免长文本/长 ID 占据整行。Headless Chrome smoke 验证 6 组顺序、Order Setups 唯一默认展开、8 条对象行、Locate/Open 按钮存在。
- 2026-05-29: Phase 9 Step 92 Calendar 对象级操作增强完成：Day Details 的 `Open` 现在覆盖 Order Setup、PDA、Segment、Composite、SMT；可选中对象会进入对应 selected/active 状态并打开 Inspector，Order Setup 与 SMT 从 Calendar Open 进入时保留 `Back to Calendar`；`Locate` 继续只定位不切换详情，并在状态栏显示对象摘要。Focus 行为本轮暂不接入，避免和现有 Structure Sets focus 语义混用。
- 2026-05-29: Phase 9 Step 93 月历对象概览完成：Inspector Calendar 日期格保留 Order Setup 红色重点角标，并新增当天对象总数与类型色点概览；SMT / PDA / Structure(Segment+Composite) / Time(Killzone+Time Line) 使用不同颜色小点，日期 title 显示各类型计数；无对象日期不显示额外概览。点击日期后的 Day Details 与 Locate/Open 行为不变。
- 2026-05-29: Phase 9 Step 93A 副图同步补强完成：Inspector Calendar 选中日期或对象 Locate 时，主图和副图都会跳转并快闪对应时间范围；副图 `secondary-viewport-controller` 使用与主图一致的 locate flash primitive。Time Overlay Renderer 现在分别维护主图/副图 primitives，`Days`、Killzone、Time Line 会在副图 bars 加载与 overlay 设置变化时同步渲染，副图清空/关闭时同步清理；`Grid` 仍通过共享 grid visibility state 同时作用于两张图。
- 2026-05-29: Phase 9 Step 94 Calendar selectedDate 与 overlays 联动完成：点击 Inspector Calendar 日期会写入 `timeOverlaySettings.selectedDate`，手工 Time Lines 与 Killzones 只渲染该自然日；Days/day-boundary 不再受 selectedDate 过滤，始终显示当前加载区间内全部自然日边界，避免刚加载后首次换日时其它 day 竖线消失。Calendar 面板显示当前 overlay filter，并提供 `All loaded days` 按钮清空 selectedDate、恢复手工 overlay 全日期显示。对象级 `Locate` 不改变 selectedDate，避免仅为定位对象时意外隐藏其它日期上下文。
- 2026-06-06: Step 264 Result Target Progress 完成：`Result` 继续表示最高/最终市场结果；新增 target ladder 派生层，让 `Target 3` 自动展示 T1/T2/T3 均已到达，`Target 2` 自动展示 T1/T2 已到达；Inspector 增加每个 target 的 hit/price/points/R 与执行动作（None/Partial/Final/Manual Exit），图表 target label 同步显示 hit/partial/final 状态。记录见 `v4/sessions/session_20260606_result_target_progress.md`
- 2026-06-06: Target Progress 窄面板截断修复完成：Inspector 中 Target Progress 行改为两行布局，第一行显示 Target / Hit-Final 状态 / action select，第二行显示 price / points / R，避免 select 遮挡 points/R 文本。
- 2026-06-07 handoff: 当前 `main` HEAD 为 `2893fc3 fix(v4): refresh inspector on time overlays`，ahead `origin/main` 24 commits。已合并并提交 Chart Notes Calendar checkbox、replay 主副图 crosshair 同步、time overlay 变更刷新 Inspector。Step 267 Calendar 跟随 crosshair/replay 的尝试已按要求回退，并且已决定放弃，不再计划执行；未保留代码或文档计划。工作区只剩 runtime/tmp 未跟踪文件，见 session checkpoint。
- 2026-06-08 Step 268 plan: Inspector Calendar Click-Date Follow。新方案只做 Inspector Calendar 对“图表左键单击所在 K 线日期”的轻量跳转，不恢复 Step 267 的 crosshair move / replay 自动跟随。目标是零 mousemove 负担：复用主图/副图现有 click 事件或增加一次 click-only handler，通过坐标解析 bar timestamp，只有日期变化且 Inspector 处于 Calendar/Home 场景时才更新 `calendarSelectedDate/calendarViewDate` 并刷新；对象详情、手动选择历史日期、pick/draft 状态不被强制覆盖。验证重点：点击主图/副图不同日期、Replay on/off、Split on/off、Calendar 对象详情不被打断、无每帧/鼠标移动监听。
- 2026-06-08 Step 268 completed: Inspector Calendar 现在订阅主图/副图 click-only 事件，按点击 K 线 `param.time` 解析日期并仅在 Inspector 已打开且处于 Calendar/Home 或 Archive 时刷新 Calendar；不监听 mousemove/crosshair move，不改 `timeOverlaySettings.selectedDate`，不影响对象详情页。Replay pick、SMT pick、Order exit pick、Daily Time ref pick、Reaction Evidence actor pick 等选择流程有 guard，副图 click 订阅通过 callback set 支持副图重建后继续生效。
- 2026-06-08 Step 269 completed: Chart Notes mousemove hit-test 降负载完成。`mousemove` 改为 RAF throttle；hit-test layout 缓存按 timeframe、visible date、expanded note、chart size、visible logical range、bars signature、chart notes version 复用，避免同一图表状态下重复重建 bar map、过滤 notes、计算坐标与文本布局。验证：语法检查、diff check、headless Chrome Chart Note hover/click smoke 通过。
- 2026-06-08 Step 270 completed: Replay overlay 重绘降负载完成。PDA 与 Chart Notes 的 `replay:changed` heavy render 改为 RAF 合并，同一帧内连续 replay tick 最多触发一次全量 primitive 重建；移除 objective gaps 在每个 replay tick 上额外 emit `pda:changed` 的重复放大路径，保留 PDA renderer 自身按 replay-visible bars 计算 NDOG/NWOG 边界的显示语义。验证：语法检查、diff check、calendar smoke、headless Chrome replay smoke 通过。
- 2026-06-08 Step 271 plan: 统一 UTC date key helper。抽出全局 `dateKeyFromTimestamp()` / 必要的 compact UTC time helper，替换 Calendar、Daily Regime、Economic Calendar、Review Archive、Chart Notes、Secondary menu 等重复实现，保持当前 UTC/ET wall-clock 语义不变。验收：全量搜索不再有散落重复实现；date key smoke 覆盖无效 timestamp、秒级 epoch、日线 tradingDay 场景。
- 2026-06-08 Step 271 completed: UTC date key helper 已统一到 `v4/src/utils.js`，新增 `dateKeyFromTimestamp()`、`dateKeyFromUtcParts()`、`dateKeyFromTradingDay()`、`dateKeyFromInput()`、`dateKeyFromBar()` 与 `compactUtcTime()`；Calendar/Inspector、Daily Regime、Economic Calendar、Review Archive、Chart Notes、Secondary menu、Replay/Secondary trading day 等散落实现已替换。验证：`rg "function dateKeyFromTimestamp|const dateKeyFromTimestamp|dateKeyFromTimestamp =" v4/src` 只剩共享 helper；`node v4/tests/date-key-smoke.js`、`node v4/tests/calendar-visibility-smoke.js`、全量 `node --check`、`git diff --check` 通过。
- 2026-06-08 Step 272 plan: `/v4/bars` 大范围请求保护。为 `v4_api.py` 与前端 Date Range 加 bar 数/时间范围 guard，特别限制 1M 超大区间，必要时提示用户缩小范围或明确确认。验收：正常常用区间不受影响；超大 1M 请求不会直接触发 DuckDB 大查询和前端大 JSON 渲染。
- 2026-06-08 Step 272 completed: `/v4/bars` 后端已在查询前按 timeframe 估算 bars 并做硬保护，超限返回 413 JSON error，不进入 DuckDB；前端 `load-range-policy` 增加估算 bars/max bars 字段与 smoke test，Date Range 继续在请求前提示或进入 1m 窗口模式；副图高周期的 1m replay source 现在先过 1m guard，超限时跳过辅助 source 而不阻断副图主数据加载。验证：`node v4/tests/load-range-policy-smoke.js`、`node v4/tests/date-key-smoke.js`、全量 `node --check`、`python3 -m py_compile v4/v4_api.py`、`git diff --check` 通过；重启 API 后，超大 1m HTTP 请求返回 413，正常短区间仍返回 bars。
- 2026-06-08 Step 273 plan: localStorage persistence helper。抽一个小型 browser-local persistence helper，复用 read/restore/save/clear/restoring guard/status error 模式，逐步替换 PDA、Segment、Order Review、Daily Time Review、Chart Notes 的重复持久化代码。验收：刷新恢复、clear saved、Review JSON import/export 不回退。
  - 2026-06-08 Step 273.1 completed: 新增 `storage/local-persistence.js`，提供安全 JSON read/write/remove 与 `createLocalPersistence()` restoring guard；新增 `local-persistence-smoke` 覆盖缺失 key、坏 JSON、写入、删除、restore 期间禁止写入。暂不迁移业务模块，作为后续子步骤底座。
  - 2026-06-08 Step 273.2 completed: Chart Notes persistence 已迁移到 `createLocalPersistence()`；保留 `v4:chart-notes:NQ` key 与 `{ version, savedAt, chartNotes }` payload schema，恢复期间继续阻止 `chart-notes:changed` 触发保存覆盖。验证：local persistence smoke、Chart Notes persistence 语法检查、全量 JS `node --check`、`git diff --check` 通过。
  - 2026-06-08 Step 273.3 completed: Daily Time Review 与 Order Review persistence 已迁移到 `createLocalPersistence()`；保留各自 storage key/payload schema 与恢复时 `preserveUpdatedAt`、draft 过滤语义。验证：order review types smoke、order setup smoke、local persistence smoke、相关文件语法检查、全量 JS `node --check`、`git diff --check` 通过。
  - 2026-06-08 Step 273.4 completed: PDA 与 Segment/Composite persistence 已迁移到 `createLocalPersistence()`；保留 `v4:pda-annotations:NQ`、`v4:market-segments:NQ` 与 payload schema，保留 draft/source 过滤和 Composite Move `segmentGroups` 保存语义。SMT 当前无独立 persistence。验证：calendar visibility smoke、order setup smoke、local persistence smoke、相关文件语法检查、全量 JS `node --check`、`git diff --check` 通过；主迁移目标文件不再有散落 `localStorage`/`restoring` 样板。
- 2026-06-08 Step 274 plan: 主副图 renderer / hit-test 复用整理。只在继续触碰 renderer 或 selection 行为时执行：抽 shared projection primitive builder、CE fallback、hit-test context/coordinate/distance helper，避免主图/副图 PDA、Segment、Order Setup 命中逻辑漂移；不为整洁单独大重构。

- [x] Step 275: Display Setup 手动字体/密度控制。目标是在 Windows 4K 与 Linux 1080p 之间提供可控、可持久化的 UI 文字大小，不做自动分辨率/DPI 推断，避免误判导致布局撑爆。
  - [x] Step 275.1: 定义 display preferences 边界与默认值：新增 `display/display-preferences.js`，管理 `uiScale`、`chartTextScale`、`inspectorDensity`、`toolbarDensity` 等纯手动选项；第一版默认保持当前 Linux 1080p 视觉，不改变既有用户。
  - [x] Step 275.2: 建立 CSS 变量层：在全局样式中引入 `--ui-font-size`、`--compact-font-size`、`--toolbar-font-size`、`--inspector-font-size`、`--chart-label-font-size`、`--control-height`、`--panel-row-gap` 等变量；先覆盖 toolbar、buttons、inputs、context menu、Inspector、Calendar、Archive，不做逐个内联 style 硬改。
  - [x] Step 275.3: 增加纯手动 Setup 面板入口：在 Inspector Archive/Settings 或 toolbar 增加 `Display Setup` 折叠面板，提供 UI Scale `100% / 110% / 125% / 140%`、Chart Text `Normal / Large / XL`、Inspector Density `Compact / Normal / Comfortable`；提供 Reset defaults，不使用 alert。
  - [x] Step 275.4: 持久化 display preferences：使用现有 local persistence helper 保存到 `v4:display-preferences:NQ` 或全局 key；启动时尽早恢复并应用 CSS class/variables，避免页面先小字后跳变；Review JSON/export 不包含该设置，因为它是本机显示偏好。
  - [x] Step 275.5: 接入图表文字对象：让 Chart Notes、PDA/Segment/Composite/SMT labels、Order Setup helper labels、Time Lines/Killzones labels 读取 chart text scale；保持线条、颜色、价格坐标、对象时间逻辑不变。
  - [x] Step 275.6: 响应式与防截断修复：检查 125%/140% 下 toolbar 控件、Date Range、Sub/Sub TF/Layout、Replay bar、Inspector target progress、Calendar day cell、三点菜单是否溢出；必要时用 flex wrap、min-width、line-height 和密度变量调整。
  - [x] Step 275.7: 验证与收口：覆盖 Linux 1920x1080 默认值、模拟 Windows 4K 大 viewport、浏览器 zoom 100%/125%、Split on/off、Replay bar、Inspector Calendar、Chart Notes、右键菜单；运行全量 `node --check`、targeted UI smoke、`git diff --check`。

- 2026-06-08 hotfix completed: Time Overlay 同值更新 no-op guard。修复 Daily Time Review detail 输入后卡顿与 `time-overlays:changed` 最大调用栈溢出：`renderDailyTimeReviewDetail()` 渲染时会同步 `selectedDate`，此前 `updateTimeOverlaySettings({ selectedDate })` 即使值未变也会 emit，导致 `time-overlays:changed -> refreshSelection -> renderDailyTimeReviewDetail -> updateTimeOverlaySettings` 递归。现在规范化后的 settings 无变化时直接返回，不再 emit。验证：相关语法检查、全量 `v4/tests/*.js` smoke、重复设置同一 `selectedDate` 只触发一次事件。记录见 `v4/sessions/session_20260608_time_overlay_noop_guard.md`

- [x] Step 276: Fib Inspector level controls。目标是在每个 Fib 实例的 Inspector 中提供类似 TradingView 的 level 设置面板，允许按实例控制 Fib 线显示、level 数值与颜色；第一版只改当前 Fib，不做全局模板保存。
  - [x] Step 276.1: 定义 Fib level 数据边界：继续使用每个 Fib annotation 自带 `levels[]`，每项保持 `{ value, visible, color }`；确认现有 renderer、hit-test、archive/localStorage 都能保存实例级 levels。
  - [x] Step 276.2: 抽 Fib level preset/helper：提供 `getDefaultFibLevels()`、`normalizeFibLevels(levels)`、`updateFibLevel(levels, index, patch)`；默认启用 `1/0.79/0.705/0.62/0.5/0.236/0`，备用线包含 `-0.272/-0.62/-1/-1.5/-2/-2.5/-3/-3.5/-4/1.5/2/2.5/3/3.5/4/5/6`，备用线默认不勾选。
  - [x] Step 276.3: 新建 Fib 时使用完整 preset：修改 `addManualFib()`，让新 Fib 创建时带完整 levels；常用线默认 `visible=true`，备用/扩展线默认 `visible=false`，保持每个实例 Inspector 行数稳定。
  - [x] Step 276.4: 兼容旧 Fib：Inspector 渲染或 normalize 时对旧的 7 条 levels 自动补齐默认 preset；不强制立即写回，用户编辑后再保存完整 levels。
  - [x] Step 276.5: Inspector Fib detail 增加可编辑 levels UI：每行包含 visible checkbox、level 数值输入、color swatch/color input；布局支持左右两列或 compact grid，避免窄 Inspector 下文本/控件重叠。
  - [x] Step 276.6: 接入 Inspector actions：新增 Fib level visible/value/color/reset 操作，更新对应 annotation 的 `levels` 并触发 `pda:changed`，主图和副图立即重绘。
  - [x] Step 276.7: Undo/redo 策略：checkbox/color 改动立即记录 history；level 数值输入按 `change` 或 blur 记录，不在每个 keypress 生成 undo step。
  - [x] Step 276.8: Reset Levels：第一版提供 `Reset Levels`，恢复当前 Fib 到默认 preset；暂不做 `Save as Default`、拖拽排序、批量套用模板或无限新增/删除行。
  - [x] Step 276.9: 验证与测试：新增 smoke test 覆盖旧 levels 补齐、visible/value/color 更新、hidden level 不参与 renderer levels；运行相关 `node --check`、全量 `v4/tests/*.js`、`git diff --check`。

- 2026-06-09 follow-up: Fib 详情框默认正数备用 levels 已补 `3`，正数 8 个位置调整为 `1.5/2/2.5/3/3.5/4/5/6`，移除 `4.5` 以保持 8 个位置；`v4/tests/fib-levels-smoke.js` 已同步断言。Economic Event note 详情页主体此前已在 `3c60baf feat(v4): add economic event notes` 完成，但 Calendar 的 Economic Events 行未出现 `Open` 入口；已将 `economic-event` 加入 Calendar object 可打开类型，使每个 economic event 可进入只包含 note 的详情页。
- 2026-06-09 recent Order Setup / Notes closeout: Chart Notes 已改为默认隐藏 guide/range 干扰信息，并通过 Inspector checkbox 与图表双击同步显隐；note label 样式收敛为无填充、暗金色边框/文字、时间与文本分栏。Order Setup 新增 Summary note，MSS 线段，Shift-only `Set All End Here`，OB/Breaker endpoint 语义修正，Escape 不再退出 Replay。Target 菜单扩展为第三层并收敛为 `Target Internal 1/2/3`、`Target Swing Point`、`Target External 1/2/3`；Result 下拉现在自动同步当前 setup execution 中实际存在的 targets，Target Progress action 选项为 `None/Fruit/Neutral/Best`。记录见 `v4/sessions/session_20260609_order_setup_targets_notes.md`。

- [ ] Step 277: Daily Time Review schema simplification。目标是把 Daily Time 中真正成组使用的信息重新命名和收敛：`Opening Thesis Review` 合并 09:30 前状态分析、09:30-11:00 summary、full day summary，表达“开盘前预判 -> 上午验证 -> 全天验证”；`Bias` 合并周/日 bias 并增加事后验证文本；`Fixed Time State` 继续作为统计数据保持不变。
  - [x] Step 277.1: 命名与边界确认：新对象命名为 `Opening Thesis Review`，包含 `preOpenThesis`、`morningSummary0930To1100`、`fullDaySummary`、`thesisReview`；`Bias` 包含 `weeklyBias`、`dailyBias`、`biasReview`；`Fixed Time State` 不改 schema、不改 UI 语义。
  - [x] Step 277.2: Store schema：在 Daily Time Review 中新增/规范 `openingThesisReview` 与 `bias` 结构；保留旧 `weeklyBias`、`dailyBias`、`pre0930Analysis`、`summary0930To1100`、`fullDaySummary` 读取兼容，旧数据迁移/normalize 到新结构。
  - [ ] Step 277.3: UI 改造：Daily Time detail 中显示三个主块：`Bias`、`Opening Thesis Review`、`Fixed Time State`；`Opening Thesis Review` 内按预判、09:30-11:00 summary、full day summary、事后验证排列。
  - [ ] Step 277.4: Persistence / Archive / Calendar：保持 `v4:daily-time-reviews:NQ` key；Review JSON 包含新结构；Calendar 对象概览使用 `Bias` 与 `Opening Thesis Review` 的摘要；空白草稿不计入对象概览。
  - [ ] Step 277.5: 验收：旧 Daily Time note 正常恢复；Bias 可同时记录周/日并填写事后验证；Opening Thesis Review 可完成预判和两段 summary 验证；Fixed Time State 行为不变。
