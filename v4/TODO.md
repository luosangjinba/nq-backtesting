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
- [ ] Step 46: 验证 5-10 个真实样例后，再决定是否做 controlled review selection 与 Review JSON 持久化

### Phase 8A: Order Review / Execution Lens 设计
- [x] Step 47: 整理订单复盘设计文档 `v4/docs/ORDER_REVIEW_DESIGN.md`，参考 `v4/sessions/session_20260525_930_execution_lens.md`、旧 YAML schema 与 pendulum 示例，但不把旧 YAML 一比一搬进 V4
- [x] Step 48: 定义 `Order Review` 对象边界：不是简单 entry/exit 表，而是 `Setup Thesis -> Entry Plan -> Result Review`；订单理由不限制为上一段行情结束原因，允许前面多段结构、Composite Move、PDA、SMT、Reaction Evidence 的组合拳
- [x] Step 49: 定义 `Setup Thesis`：记录 primary event 的 1M 精确时间、事件周期、事件类型（sweep liquidity / touch FVG / touch NWOG/NDOG / SMT / other），并支持 `linkedObjectRefs[]` 引用多个 segment / composite / PDA / SMT / reactionEvidence；低周期 1M/5M 事件要提示是否违反“跟随高周期事件做单”的原则
- [x] Step 50: 定义 `Entry Plan` 子对象：direction、entry time/price（1M 精度）、entry model（OB / FVG / OTE / OTE+OB / sweep / manual）、stoploss、target internal/swing/external、selected target、final target；第一版人工录入，MAE/MFE 与自动 target hit 计算延后
- [x] Step 51: 定义 `Result Review` 子对象：expected target reached、final target reached、exit time/price、result、note；支持 skipped / invalidated / managed-out 等非标准结果
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
  - [x] Step 56.5: 实现 `normalizeResultReview()`：expected/final target reached、exit timestamp/price、result、exitReason、outcomePoints/outcomeR 派生
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
- [x] Step 68: 实现 Result Review 编辑：expected/final target reached、exit time/price、result、exitReason、note，并确认 outcomePoints/outcomeR 派生刷新
- [x] Step 69: 实现 linked refs 管理第一版：显示 refs，支持删除 ref；从当前选中的 PDA / segment / Composite Move / SMT 追加 ref
- [x] Step 70: 实现图表 pick 第一版：从 Inspector 按钮进入 pick mode，点击主图 K 线填入 setup / entry / exit timestamp；Escape 取消
- [x] Step 71: 实现价格 pick 第一版：点击主图 K 线后可选择 OHLC 或当前价格，填入 entryPrice / stopLoss / finalTarget；暂不做拖拽
- [x] Step 72: 验证完整录入链路：blank order、segment-derived order、composite-derived order、09:30/09:50/Silver Bullet 手工样例、localStorage 恢复、Review JSON 导出/导入

## 已知问题
- 系统 Python 无 duckdb，需用 /home/leo/miniconda3/bin/python3
- localStorage 只作为浏览器工作草稿保存；跨设备/正式研究归档仍待后续 YAML/export 或 DB 方案
- 1W 周线聚合逻辑待实现（暂搁置）
- 假日异常收盘时间（如13:14）暂不特殊处理

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
