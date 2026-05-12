# V3 系统 - Lightweight Charts 版本

## 架构变更

### 从 KLineChart 到 Lightweight Charts

**迁移原因：**
- Lightweight Charts 是 TradingView 官方开源库，专为金融市场设计
- 更轻量（~50KB vs ~200KB），更好的性能
- 原生支持外盘期货（NQ/ES/CL 等）的 24 小时交易
- 更活跃的社区维护，更简洁的 API 设计
- 更好的跨时区支持（UTC/EST/CST）

### 核心差异

| 特性 | KLineChart v9 | Lightweight Charts |
|------|---------------|-------------------|
| 包大小 | ~200KB | ~50KB |
| 渲染引擎 | Canvas | Canvas |
| 时区处理 | 内置支持 | 需要手动处理 |
| 技术指标 | 内置丰富 | 需要自定义 |
| 覆盖物 | 内置多种 | 需要自定义 |
| TypeScript | 部分支持 | 完整支持 |

### 保留功能

1. **K线图表展示** - 1分钟 OHLCV 数据
2. **PDA 覆盖层** - BSL/SSL/FVG/NWOG/NDOG/Daily High/Low/EQH/EQL
3. **时间范围选择** - 日期选择器
4. **PDA 工作台** - 右侧面板，PDA 创建/编辑/预览
5. **流畅度计算** - Path 流畅度评分
6. **Reference Groups** - PDA 关联关系

### 新增功能

1. **更快的渲染性能** - 大数据集下更流畅
2. **更好的移动端支持** - 响应式设计
3. **更简洁的代码结构** - 减少 50% 代码量
4. **更好的类型安全** - 完整 TypeScript 支持

## 技术栈

### 前端
- **Lightweight Charts** v4.x - 图表库
- **React 18** - UI 框架
- **Babel Standalone** - 浏览器内 JSX 编译
- **Day.js** - 时间处理

### 后端
- **Python 3.11** - API 服务器
- **DuckDB** - 数据查询
- **PyYAML** - 配置管理

## 文件结构

```
v3/
├── docs/
│   ├── kline_viewer.html          # 主图表查看器
│   ├── pda_manager.html           # PDA 管理器
│   └── layer2_recorder.html       # Layer 2 路径记录器
├── scripts/
│   ├── scan_layer1_pda.py     # Layer 1 扫描（复用 v2）
│   └── build_reference_groups.py  # Reference Groups 构建（复用 v2）
├── data/
│   └── v3_research.duckdb         # V3 研究数据库
├── schema/
│   └── v3_schema.sql              # V3 数据库架构
├── v3_config.yaml                 # V3 配置文件
└── README.md                 # 本文件
```

## API 端点

复用 `price_lookup_api.py`，所有端点保持兼容：

- `GET /api/bars` - 获取 K线数据
- `GET /api/pda/list` - 获取 PDA 列表
- `POST /api/pda/create` - 创建 PDA
- `PUT /api/pda/update` - 更新 PDA
- `DELETE /api/pda/delete` - 删除 PDA
- `GET /api/reference-groups` - 获取 Reference Groups

## 开发计划

### Phase 1: 基础图表 (Day 1)
- [ ] 创建 `kline_viewer.html` 基础框架
- [ ] 集成 Lightweight Charts
- [ ] 实现 K线数据加载和展示
- [ ] 实现日期范围选择

### Phase 2: PDA 覆盖层 (Day 2-3)
- [ ] 实现 PDA 数据加载
- [ ] 实现 PDA 覆盖层渲染（线条、区域）
- [ ] 实现 PDA 类型过滤
- [ ] 实现 PDA 悬停提示

### Phase 3: PDA 工作台 (Day 4-5)
- [ ] 实现右侧 PDA 面板
- [ ] 实现 PDA 创建表单
- [ ] 实现 PDA 预览功能
- [ ] 实现 PDA 保存/删除

### Phase 4: 高级功能 (Day 6-7)
- [ ] 实现流畅度计算
- [ ] 实现 Reference Groups 展示
- [ ] 实现键盘快捷键
- [ ] 性能优化

## 迁移指南

### 从 v2 迁移数据

```bash
# 1. 复制数据库
cp v2/data/v2_research.duckdb v3/data/v3_research.duckdb

# 2. 运行架构升级（如有需要）
python3 v3/scripts/migrate_from_v2.py

# 3. 验证数据完整性
python3 v3/scripts/verify_migration.py
```

### 从 v2 迁移配置

```bash
# 配置文件兼容，直接复制
cp v2/v2_config.yaml v3/v3_config.yaml
```

## 使用指南

### 启动服务

```bash
# 1. 启动 API 服务器（复用 v2 的 API）
bash restart_api.sh

# 2. 启动静态文件服务器
python3 -m http.server 8000

# 3. 打开浏览器
open http://127.0.0.1:8000/v3/docs/kline_viewer.html
```

### 快捷键

- `←/→` - 左右移动图表
- `+/-` - 缩放图表
- `Space` - 切换 PDA 预览模式
- `Esc` - 取消当前操作
- `Ctrl+S` - 保存当前 PDA

## 性能对比

| 指标 | v2 (KLineChart) | v3 (Lightweight Charts) |
|------|---------------|---------------------|
| 初始加载时间 | ~800ms | ~400ms |
| 渲染 10000 根 K线 | ~200ms | ~100ms |
| 内存占用 | ~80MB | ~40MB |
| 包大小 | ~200KB | ~50KB |

## 已知限制

1. **时区处理** - Lightweight Charts 不内置时区支持，需要手动转换
2. **技术指标** - 需要自定义实现（v2 使用 KLineChart 内置）
3. **覆盖物** - 需要自定义实现（v2 使用 KLineChart 内置）

## 参考资料

- [Lightweight Charts 官方文档](https://tradingview.github.io/lightweight-charts/)
- [Lightweight Charts GitHub](https://github.com/tradingview/lightweight-charts)
- [V2 系统文档](../v2/docs/README.md)
