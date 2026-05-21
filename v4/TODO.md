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
- [x] Step 10: PDA context 实时计算器（完整交易日 1M 源数据 + 1M/5M/15M/30M/1H/4H/D 精确 TF 极值）
- [ ] Step 11: PDA 渲染器（初版 SSL/BSL 线段；待补矩形 / 点位集合）
- [ ] Step 12: 客观 PDA 显示/隐藏命令（NDOW/NWOG 等）
- [ ] Step 13: EQH/EQL 点位集合打包

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

## 已知问题
- 系统 Python 无 duckdb，需用 /home/leo/miniconda3/bin/python3
- 手动标注刷新后丢失（后续可加 localStorage 持久化）
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
- 2026-05-20: PDA HTF context 使用完整 CME trading day 的 1M bars 作为唯一聚合源，在前端聚合 15M/30M/1H/4H/D 后判断手动点是否为对应周期 high/low
- 2026-05-20: PDA HTF context 缓存键为 `instrument:source:1M:tradingDay`，例如 `NQ:source:1M:2012-01-09`
- 2026-05-20: PDA HTF 聚合边界与后端保持一致：15M/30M/1H 用 00:00 anchor，4H 用 02:00/06:00/10:00/14:00/18:00/22:00 anchor，D 用 CME 18:00 trading day
- 2026-05-20: 跨 timeframe 对齐规则：以被右键选中的当前图表 K 线时间区间为准，检查所有与其重叠的目标 HTF bucket；若所选 BSL/SSL 价格等于目标 bucket high/low，则追加对应 HTF context 标签
- 2026-05-21: PDA context 层级补齐为 1M/5M/15M/30M/1H/4H/D，完整 context 保存在 annotation 和状态栏；图上 PDA 标签只显示最高 TF context，并保留 session/midnight 等补充 context
- 2026-05-21: PDA 跨周期 context 遇到同一 HTF bucket 内多个当前周期等高/等低点时，只取最晚出现的当前周期 bar 作为该 HTF high/low 的代表点
- 2026-05-21: 手动 PDA 标注按 source/type/price/canonicalTimestamp 归并；不同周期标注同一高/低点时合并 contexts 并更新当前图表 anchor，不重复渲染
