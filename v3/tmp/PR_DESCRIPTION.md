# Pull Request: K线回放与PDA手动标注完整功能

## 概述

实现了 K 线回放功能和 PDA（Price Delivery Area）手动标注完整工作流，包括：
- K 线回放控制（播放/暂停/停止/单步/速度控制/进度保存）
- PDA 手动添加侧边栏表单（FVG/BSL/SSL）
- FVG 自动识别逻辑
- 后端 API 集成和图表刷新

## 功能特性

### 阶段 1：K 线回放基础功能 ✅

- **回放控制栏**：播放/暂停/停止/单步前进/单步后退
- **速度控制**：1x/2x/5x 三档速度
- **进度条**：拖动跳转 + 时间显示
- **自动保存/恢复**：刷新页面后恢复上次进度
- **快捷键**：空格键播放/暂停
- **视图保持**：回放过程中不自动缩放图表

**关键文件**：
- `v3/modules/replay.js` - 回放模块（322 行）

### 阶段 2：PDA 标注工作流 ✅

#### 任务 #1：PDA 录入侧边栏 UI

- **Flex 布局侧边栏**：400px 宽，使用 margin-right 负值折叠
- **表单字段**：FVG（起始/结束时间、上下边界）、BSL/SSL（时间、价格）、备注
- **表单验证**：必填字段检查、价格范围验证
- **自动填充**：根据点击位置和识别结果自动填充
- **时间格式化**：支持 8 位和 12 位输入
- **ESC 键关闭** + **图表自动调整大小**

**关键文件**：
- `v3/modules/pda-form.js` - 表单模块（285 行）

#### 任务 #2：FVG 自动识别逻辑

- **identifyFvg() 函数**：检查点击位置前后 K 线是否形成 FVG
- **支持 3 种情况**：点击 K1/K2/K3 任意位置都能识别
- **自动填充**：锚点时间（K2）、上下边界、direction（bullish/bearish）
- **时区处理**：使用 UTC 时间

**关键文件**：
- `v3/modules/pda-identifier.js` - PDA 识别模块（135 行）

#### 任务 #3：后端 API 集成

- **savePda() 函数**：调用 `POST /v2/pda_manual_add` API
- **字段名转换**：下划线 → 驼峰
- **timeframe 转换**：数字 → 字符串（60 → "1H"）
- **FVG direction 处理**：使用识别结果的 direction
- **错误处理** + **成功处理**

#### 任务 #4：刷新图表显示新 PDA

- **reloadPdaData() 函数**：重新加载 PDA 数据
- **保存成功后自动刷新**：调用 `loadPdaData(start, end)`
- **强制图表重绘** + **状态栏更新**

## 代码统计

**新增文件**：
- `v3/modules/replay.js` - 322 行
- `v3/modules/pda-form.js` - 285 行
- `v3/modules/pda-identifier.js` - 135 行

**修改文件**：
- `v3/docs/kline_viewer.html` - +270 行
- `v3/styles/kline_viewer.css` - +200 行
- `v3/modules/chart.js` - +15 行
- `v3/modules/context-menu.js` - +30 行

**总计**：约 1260 行新增代码  
**提交数量**：28 个提交

## 测试验证 ✅

- ✅ 回放功能：播放/暂停/停止/单步/速度/进度/快捷键
- ✅ PDA 表单：展开/折叠/自动填充/验证/格式化/ESC 关闭
- ✅ FVG 识别：K1/K2/K3 识别/时间正确/价格正确/direction 正确
- ✅ API 集成：FVG 创建成功/BSL/SSL 创建成功/图表刷新

## 使用说明

### 启动服务
```bash
bash restart_api.sh start
python3 -m http.server 8000
```

### 访问页面
http://127.0.0.1:8000/v3/docs/kline_viewer.html

### 使用流程
1. 加载 K 线数据（输入时间范围 → 点击加载）
2. K 线回放（点击播放 → 调整速度 → 拖动进度条）
3. 手动添加 PDA（右键点击 → 选择类型 → 自动识别 → 保存）

## 会话记录

- `v3/sessions/session_20260515_replay_structure_plan.md` - 方案规划
- `v3/sessions/session_20260515_replay_stage1.md` - 阶段 1 实施
- `v3/sessions/session_20260515_pda_form_sidebar.md` - PDA 表单侧边栏
- `v3/sessions/session_20260515_fvg_identification.md` - FVG 自动识别
- `v3/sessions/session_20260515_pda_api_integration.md` - API 集成

## 后续计划

- 阶段 3：行情段标注（Swing Low/High 连线）
- 阶段 4：市场结构标注（HH/HL、LH/LL）
