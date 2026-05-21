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
- 2026-05-21: Inspector 增加 PDA 标识文字显示设置；`showLabels` 作为浏览器本地显示偏好保存，只影响渲染，不改变 annotation 数据或 export 内容
- 2026-05-21: Inspector 增加 `showCurrentLabel` 显示偏好；可在隐藏全局 PDA 标签时保留当前选中 PDA 的标签，便于定位侧边栏正在编辑的对象
