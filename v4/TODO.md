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

## 架构决策记录
- 2026-05-19: 所有 PDA 前端实时计算，不存 DB
- 2026-05-19: LightweightCharts v5.2.0，用内置 Markers 插件替代部分自定义 Primitive
- 2026-05-19: v4_api.py 从 price_lookup_api.py 导入查询函数，不复制代码
- 2026-05-19: 日线聚合使用 CME 交易日分界 22:00 UTC (6:00 PM ET)，不走 query_v2_bars 默认的 00:00 UTC
- 2026-05-19: OHLCV 悬停 legend 用 subscribeCrosshairMove 实现
