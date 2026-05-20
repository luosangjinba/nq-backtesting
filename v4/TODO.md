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
- [ ] Step 8: PDA 类型注册表
- [ ] Step 9: PDA 扫描器（前端实时计算 FVG/BSL/SSL/EQH/EQL）
- [ ] Step 10: PDA 渲染器 + 存储

### Phase 3: 交互
- [ ] Step 11: 逐根播放
- [ ] Step 12: 右键菜单 + PDA 详情 + 手动标注
- [ ] Step 13: 键盘快捷键 + CSS 整合

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
- 2026-05-20: barSpacing=6, minBarSpacing=2, rightOffset=5
- 2026-05-20: 日线 time 字段用交易日日期（YYYY-MM-DD），新增 tradingDay 字段；前端按 tf 区分 time 来源
