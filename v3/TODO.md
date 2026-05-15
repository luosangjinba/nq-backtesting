# V3 开发 TODO

## 当前分支：`feature/chart-display-control`

**最后更新**：2026-05-15 下午  
**当前状态**：🔄 K 线回放与市场结构标注功能开发中（方案调整完成）

---

## 进行中功能 🔄

### K 线回放与市场结构标注（当前分支）

**分支**：`feature/chart-display-control`  
**创建时间**：2026-05-15  
**预计时长**：4 天  
**计划文档**：`v3/docs/REPLAY_STRUCTURE_PLAN.md`  
**会话记录**：`v3/sessions/session_20260515_replay_structure_plan.md`

**核心需求**：
- K 线回放，模拟实盘观察
- PDA 标注工作流（确认已扫描 PDA / 手动录入新 PDA）
- 行情段标注（Swing Low/High 连线，关联 PDA）
- 市场结构标注（连接行情段，标注 HH/HL、LH/LL）

**数据存储方案**：✅ 混合方案（YAML + DuckDB 镜像）
- YAML 为真相源：`v2/data/swing_analysis/*.yaml`
- DuckDB 为查询层：`v2_research.duckdb` 新增表
- 同步脚本：`v2/scripts/sync_swing_analysis.py`

#### 阶段 0：交互 Demo - 0.5 天
**状态**：✅ 已完成
- [x] Demo 1: PDA 关联交互（3 种方案对比）
- [x] Demo 2: 行情段标注交互（3 种方案对比）
- [x] Demo 3: 回放进度保存（3 种方案对比）
- [ ] 根据 demo 反馈确定最终交互方式（待用户体验后确认）

**已创建文件**：
- `v3/docs/demo_pda_association.html` - PDA 关联交互 demo
- `v3/docs/demo_swing_annotation.html` - 行情段标注交互 demo
- `v3/docs/demo_replay_progress.html` - 回放进度保存 demo

#### 阶段 1：K 线回放基础 - 0.5 天
**状态**：✅ 已完成（2026-05-15）

- [x] 创建回放控制栏 UI
- [x] 实现播放/暂停/停止功能
- [x] 实现速度控制（1x/2x/5x）
- [x] 实现进度条和时间标记
- [x] 实现单步前进/后退
- [x] 实现自动保存/恢复进度
- [x] 实现空格键播放/暂停快捷键

**已创建文件**：
- `v3/modules/replay.js` - 回放模块（322 行）
- `v3/sessions/session_20260515_replay_stage1.md` - 实施记录

**用户反馈与修复**：
- ✅ 修复图表自动缩放问题（commit: eed6aeb）
  - 问题：每次播放 K 线时图表自动缩放，用户无法保持视图比例
  - 解决：首次加载时自动缩放，回放过程中保持用户视图
- ✅ 修复首次加载后视图缝隙不足（commit: 1f93b34）
  - 问题：K 线从右侧出现时无缝隙，不符合视觉习惯
  - 解决：首次加载时右侧预留 10 根 K 线空间

**已知问题**：
- PDA 渲染需要根据 occurrence_time 过滤（待修复）

#### 阶段 2：PDA 标注工作流 - 1 天
**状态**：⏸ 待开始

- [ ] 点击检测（击中已扫描 PDA）
- [ ] PDA 确认状态标记
- [ ] 手动 PDA 录入表单
- [ ] 保存到 `pda_registry` 表（Manual 类型）

#### 阶段 3：行情段标注 - 1.5 天
**状态**：⏸ 待开始

- [ ] Swing Low/High 手动标记
- [ ] 行情段连线渲染
- [ ] PDA 关联（根据 demo 确定的方式）
- [ ] 保存到 YAML 文件
- [ ] 同步脚本（YAML → DuckDB）

#### 阶段 4：市场结构标注 - 1 天
**状态**：⏸ 待开始

- [ ] 行情段组合
- [ ] 结构类型标注（HH_HL/LH_LL）
- [ ] 保存到 YAML 文件
- [ ] 同步脚本更新

---

## 已完成功能 ✅

### 右键菜单功能（已合并到 main - 2026-05-15）

**合并提交**：`2d54dc5`  
**提交数**：16 次  
**净增代码**：~10,650 行

#### 阶段 A：清理 + 配置化修正
- [x] 增强时间格式化（支持 8/12 位输入）
- [x] 容差自适应（timeframe 动态计算）
- [x] 窗口 resize 关闭菜单
- [x] 去掉假快捷键提示

#### 阶段 B：PDA 详情浮窗
- [x] 设计浮窗 HTML 结构和 CSS 样式
- [x] 实现浮窗定位和关闭逻辑
- [x] 替换菜单中的 alert 调用

#### 阶段 C：键盘导航 + 真快捷键
- [x] 菜单内键盘导航（↑↓ Enter）
- [x] 全局快捷键真实绑定（F5：刷新数据）
- [x] 恢复快捷键提示 UI

#### 阶段 D：扩展 PDA 类型支持
- [x] NWOG / NDOG 矩形渲染（紫色/青色半透明）
- [x] Daily High / Low 渲染（实线）
- [x] ICT Midnight Day High/Low 渲染（虚线）
- [x] 扩展点击检测（6 种新类型）
- [x] 添加 D/W 周期支持
- [x] 15M+ 周期叠加显示日级 PDA
- [x] 日级 PDA 使用 occurrence_time 定位
- [x] 日级 PDA 时间映射到最近 K 线

#### 阶段 F：模块化拆分
- [x] 原 1683 行单文件 → 2011 行 8 个模块
- [x] 主 HTML 减少 85%（251 行）
- [x] 使用 ES6 module 架构
- [x] 所有功能验证通过

---
### PDA 工作台预研（已合并到 main - 2026-05-15）

**合并提交**：`24c262c`  
**文件数**：13 个  
**净增代码**：~6,000 行

**完成内容**：
- [x] CLAUDE.md 重写（融合 Karpathy 规范，95 行 → 401 行）
- [x] 技术预研文档（CONTEXTUAL_PANEL_RESEARCH.md、PLAN_PDA_WORKBENCH.md、TECH_RESEARCH_REPORT.md）
- [x] 7 个 demo 文件（点击检测、重叠选择、侧边栏布局、API 测试）
- [x] 会话记录（session_20260512_evening.md）
- [x] 分支说明（BRANCH_README.md）

**已确认决策**：
- ✅ 采用三阶段拆分方案
- ✅ 侧边栏宽度 360px 固定
- ✅ PDA 列表首选时序排序
- ✅ 重叠 PDA 采用循环切换策略
- ✅ 右键菜单：短期采用块状菜单
- ✅ Contextual Panel：使用纯 HTML/CSS 自定义侧边栏

---

### Git 分支整理（2026-05-15）

**提交**：`abcf855`

**删除的分支**：
- ✅ `feature/context-menu-research` - 已合并到 main
- ✅ `feature/pda-workbench-research` - 内容重复
- ✅ `feature/contextual-panel-research` - 内容已提取

**当前状态**：
- main 分支领先远程 113 commits
- 所有 feature 分支已清理完毕
- 待推送：`git push origin main`

---

## 待完成功能 🔄

### 阶段 E：PDA 工作台实现（下一步）

**状态**：待开始  
**优先级**：高  
**预计时长**：1.5-2 天

#### 阶段 1：基础 UI 和 PDA 选择（0.5 天）
- [ ] 在 `kline_viewer.html` 中添加侧边栏 HTML 结构
- [ ] 在 `v3/styles/kline_viewer.css` 中添加侧边栏样式
- [ ] 实现 PDA 列表渲染逻辑（按时间排序，按类型分组）
- [ ] 实现点击检测和选择逻辑（循环切换策略）
- [ ] 实现 PDA 详情显示（只读）
- [ ] 实现重叠 PDA 视觉提示（数字徽章或其他方案）

#### 阶段 2：Manual PDA 录入（0.5 天）
- [ ] 添加"新建 PDA"按钮
- [ ] 实现表单 UI（侧边栏内展开或弹出对话框）
- [ ] 实现表单验证逻辑
- [ ] 调用 `POST /v2/pda_manual_add` 保存
- [ ] 保存成功后刷新列表和图表

#### 阶段 3：PDA 编辑和删除（0.5 天）
- [ ] 选中 Manual PDA 后显示"编辑"和"删除"按钮
- [ ] 实现编辑功能（复用阶段 2 的表单）
- [ ] 实现删除功能（确认对话框）
- [ ] 权限控制：只能编辑/删除 Manual PDA

**参考资料**：
- `v3/docs/PLAN_PDA_WORKBENCH.md` - 方案规划
- `v3/docs/TECH_RESEARCH_REPORT.md` - 技术预研报告
- `v3/docs/demo_02_sidebar_layout.html` - 侧边栏布局 demo
- `v3/docs/demo_03_api_test.html` - API 调用测试 demo

---

### 优化任务（后续）

**状态**：待开始  
**优先级**：中

- [ ] PDA 标签防重叠
  - [ ] 检测同价位的标签（时间窗口 + 价格容差）
  - [ ] 水平错开排列，避免遮挡
  - [ ] 扩展 LiquidityPrimitive 支持 labelOffsetX 参数
  - [ ] 全局坐标收集和布局算法

- [ ] 性能优化
  - [ ] PDA 渲染性能测试（1000+ PDA）
  - [ ] 大数据集下的点击检测性能

- [ ] 文档更新
  - [ ] 更新 README.md（新增右键菜单功能）
  - [ ] 更新 QUICKSTART.md（新增快捷键说明）

---

## 技术债务

### 代码质量
- [ ] 考虑拆分过长的函数（如有）
- [ ] 考虑抽取重复的配置

### 已知问题
- 无

---

## 版本历史

| 版本 | 日期 | 提交 | 说明 |
|---|---|---|---|
| v1.0 | 2026-05-15 | `abcf855` | Git 分支整理完成 |
| v0.9 | 2026-05-15 | `24c262c` | 合并 PDA 工作台预研内容 |
| v0.9 | 2026-05-15 | `2d54dc5` | 合并右键菜单功能到 main |
| v0.8 | 2026-05-15 | `171425f` | NWOG/NDOG 改为矩形渲染 |
| v0.7 | 2026-05-14 | `6ee7d65` | 日级 PDA 时间映射到最近 K 线 |
| v0.6 | 2026-05-14 | `b348202` | 日级 PDA 使用 occurrence_time 定位 |
| v0.5 | 2026-05-14 | `0db07e9` | 15M+ 周期叠加日级 PDA |

---

## 参考资料

### 会话记录
- `v3/sessions/session_20260515_modularization.md` - 模块化拆分完整过程
- `v3/sessions/session_20260515_nwog_ndog_fix.md` - NWOG/NDOG 修复
- `v3/sessions/session_20260514_*.md` - 右键菜单开发过程
- `v3/sessions/session_20260512_evening.md` - PDA 工作台技术预研

### 设计文档
- `v3/docs/CONTEXT_MENU_DESIGN.md` - 右键菜单设计探讨
- `v3/docs/CONTEXT_MENU_FEASIBILITY.md` - 技术可行性报告
- `v3/docs/PLAN_PDA_WORKBENCH.md` - PDA 工作台方案规划
- `v3/docs/TECH_RESEARCH_REPORT.md` - 技术预研报告
- `v3/docs/CONTEXTUAL_PANEL_RESEARCH.md` - Contextual Panel 技术预研
