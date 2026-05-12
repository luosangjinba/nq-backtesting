# V3 快速开始指南

## 已完成的工作

✅ 创建 v3 目录结构
✅ 实现基于 Lightweight Charts 的 K线查看器
✅ 配置文件 (v3_config.yaml)
✅ 启动脚本 (start.sh)

## 目录结构

```
v3/
├── README.md                      # 项目说明
├── v3_config.yaml          # 配置文件
├── start.sh                       # 快速启动脚本
├── docs/
│   └── kline_viewer.html        # K线查看器（主界面）
├── scripts/                  # 脚本目录（待添加）
├── data/                       # 数据目录（待添加）
└── schema/                  # 数据库架构（待添加）
```

## 快速启动

### 方式 1: 使用启动脚本（推荐）

```bash
cd v3
bash start.sh
```

脚本会自动：
1. 检查 API 服务器状态
2. 如需要，启动 API 服务器
3. 启动 Web 服务器
4. 打开浏览器访问 http://127.0.0.1:8000/v3/docs/kline_viewer.html

### 方式 2: 手动启动

```bash
# 1. 启动 API 服务器（如果未运行）
bash restart_api.sh

# 2. 启动 Web 服务器
python3 -m http.server 8000

# 3. 打开浏览器
open http://127.0.0.1:8000/v3/docs/kline_viewer.html
```

## 功能说明

### 当前已实现（Phase 1 - 核心图表）

1. **K线图表展示**
   - 基于 Lightweight Charts v4.1.3
   - 深色主题（TradingView 风格）
   - 响应式布局
   - 自动缩放到合适视图

2. **工具栏**
   - 开始/结束时间输入（格式: 2012-01-09 09:30）
   - 周期选择（1m/5m/15m/1H/4H）
   - 加载按钮
   - 状态显示
   - 回车键快速加载

3. **数据加载**
   - 复用 v2 API (`/v2/bars`)
   - 错误处理和提示
   - 加载状态显示

### 待实现功能

- [ ] PDA 覆盖层渲染
- [ ] PDA 工作台（右侧面板）
- [ ] PDA 创建/编辑
- [ ] 流畅度计算
- [ ] Reference Groups
- [ ] 键盘快捷键

## API 端点

系统复用 v2 的 API 服务器 (`price_lookup_api.py`)：

- `GET /api/bars` - 获取 K线数据
- `GET /api/pda/list` - 获取 PDA 列表
- `POST /api/pda/create` - 创建 PDA
- `PUT /api/pda/update` - 更新 PDA
- `DELETE /api/pda/delete` - 删除 PDA

## 技术栈

### 前端
- **Lightweight Charts** v4.1.3 - TradingView 官方图表库
- **Day.js** v1.11.10 - 时间处理
- **原生 JavaScript** - 无需构建工具

### 后端
- **Python 3.11** - API 服务器
- **DuckDB** - 数据查询
- **PyYAML** - 配置管理

## 与 v2 的主要区别

| 特性 | v2 (KLineChart) | v3 (Lightweight Charts) |
|------|----------------|----------------------|
| 图表库 | KLineChart v9 | Lightweight Charts v4 |
| 包大小 | ~200KB | ~50KB |
| 性能 | 良好 | 优秀 |
| 时区处理 | 内置 | 手动（Day.js） |
| 代码量 | ~4000 行 | ~1500 行（目标） |
| 构建工具 | 无 | 无 |

## 开发计划

### Phase 1: 基础功能（当前阶段）
- [x] 创建项目结构
- [x] 实现基础 K线图表
- [x] 实现工具栏
- [x] 实现 PDA 面板框架
- [ ] 实现 PDA 覆盖层渲染

### Phase 2: PDA 功能
- [ ] PDA 创建/编辑
- [ ] PDA 预览
- [ ] PDA 保存/删除
- [ ] Reference Groups

### Phase 3: 高级功能
- [ ] 流畅度计算
- [ ] 键盘快捷键
- [ ] 性能优化
- [ ] 移动端适配

## 测试数据
使用 v2 的数据库：
- Layer 0: `trading_data.duckdb` (1分钟 OHLCV)
- API: `http://127.0.0.1:8765/v2/bars`

### 测试步骤

1. **启动服务**
   ```bash
   cd v3
   bash start.sh
   ```

2. **打开浏览器**
   访问 http://127.0.0.1:8000/v3/docs/kline_viewer.html

3. **加载数据**
   - 开始时间: `2012-01-09 09:30`
   - 结束时间: `2012-01-09 16:00`
   - 周期: `1H`
   - 点击"加载"按钮

4. **验证功能**
   - ✓ K线图表正常显示
   - ✓ 可以拖动图表
   - ✓ 可以缩放图表（鼠标滚轮）
   - ✓ 十字光标正常工作
   - ✓ 切换周期后重新加载

## 常见问题

### Q: 为什么选择 Lightweight Charts？
A: 更轻量、更快、TradingView 官方维护、更适合外盘期货（24小时交易）

### Q: 是否需要迁移 v2 数据？
A: 不需要，v3 直接复用 v2 的数据库和 API

### Q: v2 和 v3 可以同时使用吗？
A: 可以，它们共享同一个 API 服务器和数据库

### Q: 如何切换回 v2？
A: 访问 http://127.0.0.1:8000/v2/docs/kline_viewer.html

## 下一步

1. **测试基础功能**
   ```bash
   bash v3/start.sh
   # 选择一个日期，点击"加载"
   ```

2. **实现 PDA 覆盖层**
   - 使用 Lightweight Charts 的 Price Lines API
   - 实现不同 PDA 类型的渲染逻辑

3. **完善 PDA 工作台**
   - 添加 PDA 创建表单
   - 实现 PDA 预览功能

## 参考资料

- [Lightweight Charts 官方文档](https://tradingview.github.io/lightweight-charts/)
- [Lightweight Charts GitHub](https://github.com/tradingview/lightweight-charts)
- [Day.js 文档](https://day.js.org/)
