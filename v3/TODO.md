# V3 开发 TODO

## 当前分支：`feature/context-menu-research`

**最后更新**：2026-05-14 下午调试修复  
**当前状态**：日级 PDA 时间映射已完成，待浏览器验证

---

## 已完成功能 ✅

### 阶段 A：清理 + 配置化修正
**状态**：✅ 完成（2026-05-14）  
**提交**：`f777265`, `6e17771`

- [x] A1. 增强时间格式化（支持 8/12 位输入）
- [x] A2. 容差自适应（timeframe 动态计算）
- [x] A3. 窗口 resize 关闭菜单
- [x] A4. 去掉假快捷键提示（7 处）

### 阶段 B：PDA 详情浮窗
**状态**：✅ 完成（2026-05-14）  
**提交**：`d3cd332`

- [x] B1. 设计浮窗 HTML 结构和 CSS 样式
- [x] B2. 实现 showPdaDetail 函数
- [x] B3. 实现浮窗定位逻辑
- [x] B4. 实现浮窗关闭逻辑
- [x] B5. 替换菜单中的 alert 调用

### 阶段 C：键盘导航 + 真快捷键
**状态**：✅ 完成（2026-05-14）  
**提交**：`1d3ba57`, `45df8f0`, `98bffde`

- [x] C1. 菜单内键盘导航（↑↓ Enter）
  - [x] 上下移动（跳过 disabled / divider）
  - [x] Enter 触发选中项
  - [x] 鼠标 hover 同步 selectedIndex
- [x] C2. 全局快捷键真实绑定
  - [x] F5：刷新数据
  - [x] 输入框冲突避免
- [x] C3. 恢复快捷键提示 UI
  - [x] 菜单项显示 shortcut 字段

### 阶段 D：扩展 PDA 类型支持
**状态**：✅ 完成（2026-05-14）  
**提交**：`01925ec`, `3ea9742`, `1da802f`, `71a5972`, `1c5a7e0`, `5678783`, `0db07e9`, `b348202`, `6ee7d65`

- [x] D1. NWOG / NDOG 渲染
  - [x] Custom Primitive 水平线
  - [x] 颜色：NWOG 紫 / NDOG 青
  - [x] 在 loadPdaData 中添加渲染分支
- [x] D2. Daily High / Low 渲染
  - [x] 水平线延伸到当日结束
  - [x] 颜色：实绿 / 实红
  - [x] 在 loadPdaData 中添加渲染分支
- [x] D3. ICT Midnight Day High/Low 渲染
  - [x] 类似 Daily H/L，虚线区分
  - [x] 扩展 LiquidityPrimitive 支持 lineStyle
  - [x] 在 loadPdaData 中添加渲染分支
- [ ] D4. EQH / EQL 渲染（跳过，数据逻辑尚未实现）
  - [ ] 多点 + 连线
  - [ ] 扩展 API 查询 `pda_members`
- [x] D5. 扩展点击检测
  - [x] `findPdaAtPosition` 增加 6 种新类型分支
  - [x] 更新 `showPdaDetail` 支持新类型
- [x] D6. 添加 D/W 周期支持（`5678783`）
- [x] D7. 15M+ 周期叠加显示日级 PDA（`0db07e9`）
  - [x] 当周期 >= 15M 且 < D 时，额外请求 D 周期的 6 种日级 PDA
  - [x] 合并主请求和日级请求的 records
  - [x] 1M/5M 不叠加，D/W 主请求已包含
- [x] D8. 日级 PDA 使用 occurrence_time 定位（`b348202`）
  - [x] daily_high/low, ict_midnight_*, nwog, ndog 改用 occurrence_time
  - [x] 修复标签显示在统计周期起点（18:00/00:00）而非实际高低点的问题
- [x] D9. 日级 PDA 时间映射到最近 K 线（`6ee7d65`）
  - [x] 添加 findNearestBarTime() 函数
  - [x] 存储 K 线时间戳到 state.barTimestamps
  - [x] 日级 PDA 渲染前映射到最近的 K 线时间
  - [x] 添加时间偏移调试日志
  - [x] 修复 anchorCoord 为 null 导致标记不显示的问题

**Bug 修复**：
- [x] 修复语法错误（多余/缺失的大括号）
- [x] 时间格式化和加载功能恢复正常
- [x] 日级 PDA 时间定位错误（显示在 anchor_time 而非 occurrence_time）
- [x] 日级 PDA 不显示（occurrence_time 不在 K 线时间点上，导致 anchorCoord 为 null）

---

## 待完成功能 🔄

### 待验证（P0）
**状态**：待测试  
**优先级**：高

- [ ] 浏览器测试日级 PDA 显示
  - [ ] 刷新浏览器（Ctrl+Shift+R 强制刷新）
  - [ ] 加载数据：2012-01-09 00:00 到 2012-01-15 00:00，周期 1H
  - [ ] 验证 Daily High/Low 标记显示
  - [ ] 验证 ICT Midnight High/Low 标记显示
  - [ ] 验证 NWOG/NDOG 标记显示
  - [ ] 检查控制台时间映射日志
  - [ ] 确认无 "anchorCoord 为 null" 警告（或大幅减少）

### 优化任务（后续）
**状态**：待开始  
**优先级**：中

- [ ] PDA 标签防重叠
  - [ ] 检测同价位的标签（时间窗口 + 价格容差）
  - [ ] 水平错开排列，避免遮挡
  - [ ] 扩展 LiquidityPrimitive 支持 labelOffsetX 参数
  - [ ] 全局坐标收集和布局算法

### 阶段 E：Manual PDA 编辑/删除/导出/新建
**状态**：待开始（移至 `feature/pda-workbench` 分支）  
**预计时长**：3-5 天

**原因**：阶段 E 功能更适合放在侧栏工作台，而不是右键菜单

**内容**：
- [ ] 侧栏 UI 设计
- [ ] 新建 Manual PDA 表单
- [ ] 编辑 Manual PDA
- [ ] 删除 Manual PDA
- [ ] PDA 列表展示
- [ ] 导出/导入 YAML

---

## 合并计划

**目标**：阶段 D 完成后合并到 main

**合并前检查清单**：
- [ ] 所有功能验证通过（浏览器测试）
- [x] 代码格式化完成（Prettier）
- [x] 会话记录更新
- [x] TODO 更新
- [x] 无 console.log 残留（保留 warn/error）
- [x] 无 TODO/FIXME 注释
- [x] 语法检查通过

---

## 后续分支计划

### `feature/pda-workbench`（阶段 E 内容）
**目标**：实现右侧 PDA 工作台

**原因**：阶段 E（Manual PDA 编辑/删除/导出/新建）功能更适合放在侧栏工作台，而不是右键菜单

**内容**：
- [ ] 侧栏 UI 设计
- [ ] 新建 Manual PDA 表单
- [ ] 编辑 Manual PDA
- [ ] 删除 Manual PDA
- [ ] PDA 列表展示
- [ ] 导出/导入 YAML

---

## 技术债务

### 代码质量
- [ ] `findPdaAtPosition` 函数过长（~150 行），考虑拆分
- [ ] 菜单项配置有重复，考虑抽取公共配置
- [ ] **模块化拆分**（阶段 D 后执行）
  - [ ] 拆分为 6 个模块文件（chart / pda-renderer / pda-detector / context-menu / pda-detail / utils）
  - [ ] 每个文件 < 300 行
  - [ ] 使用 ES6 module 或 `<script type="module">`

### 性能优化
- [ ] PDA 渲染性能测试（1000+ PDA）
- [ ] 大数据集下的点击检测性能

### 文档
- [ ] 更新 README.md（新增右键菜单功能）
- [ ] 更新 QUICKSTART.md（新增快捷键说明）

---

## 已知问题

### 已修复 ✅
- [x] PDA 标志初次加载不显示（需要移动鼠标才显示）— 已修复（`bf0ebaa`）
- [x] 左键点击图表后 PDA 标志消失 — 已修复（`bf0ebaa`）
- [x] 语法错误导致时间格式化和加载功能失效 — 已修复（`1c5a7e0`）

### 待修复
- 无

### 浏览器缓存问题
**现象**：修改代码后，浏览器仍运行旧代码  
**解决方案**：
1. 关闭标签页，重新打开
2. 换端口启动服务（8000 → 8001）
3. 清空浏览器缓存

### 代码循环 bug
**现象**：修改代码时破坏结构，导致语法错误  
**预防措施**：
1. 每次修改后立即测试
2. 使用 Edit 工具 > Python 脚本 > sed
3. 遇到问题立即回退到稳定版本
4. 使用 `node --check` 验证语法

---

## 参考资料

- [会话记录 - 下午](./sessions/session_20260514_afternoon.md)
- [会话记录 - 晚上](./sessions/session_20260514_evening.md)
- [会话记录 - 深夜](./sessions/session_20260514_late_evening.md)
- [会话记录 - 深夜续](./sessions/session_20260514_late_night.md)
- [会话记录 - 调试修复](./sessions/session_20260514_debug_fix.md)
- [设计文档](./docs/CONTEXT_MENU_DESIGN.md)
- [技术可行性](./docs/CONTEXT_MENU_FEASIBILITY.md)
- [集成记录](./docs/CONTEXT_MENU_INTEGRATION.md)

---

## 版本历史

| 版本 | 日期 | 提交 | 说明 |
|---|---|---|---|
| v0.8 | 2026-05-14 下午 | `6ee7d65` | 日级 PDA 时间映射到最近 K 线 |
| v0.7 | 2026-05-14 深夜 | `b348202` | 日级 PDA 使用 occurrence_time 定位 |
| v0.6 | 2026-05-14 晚 | `0db07e9` | 15M+ 周期叠加日级 PDA |
| v0.5 | 2026-05-14 晚 | `5678783` | 添加 D/W 周期支持 |
| v0.5 | 2026-05-14 晚 | `1c5a7e0` | 修复语法错误 |
| v0.4 | 2026-05-14 晚 | `71a5972` | 完成阶段 D5 |
| v0.4 | 2026-05-14 晚 | `1da802f` | 完成阶段 D3 |
| v0.4 | 2026-05-14 晚 | `3ea9742` | 完成阶段 D2 |
| v0.4 | 2026-05-14 晚 | `01925ec` | 完成阶段 D1 |
| v0.3 | 2026-05-14 下午 | `98bffde` | 完成阶段 C |
| v0.3 | 2026-05-14 下午 | `d3cd332` | 完成阶段 A & B |
| v0.2 | 2026-05-14 上午 | `6e17771` | 完成阶段 A |
| v0.1 | 2026-05-13 | `145624a` | 右键菜单基础功能 |


---

## 合并计划

**目标**：阶段 D 完成并验证后合并到 main

**合并前检查清单**：
- [ ] 浏览器测试日级 PDA 显示（P0）
- [x] 代码格式化完成（Prettier）
- [x] 会话记录更新
- [ ] README 更新
- [ ] 无 console.log 残留（保留 warn/error）
- [ ] 无 TODO/FIXME 注释

---

## 后续分支计划

### `feature/pda-workbench`（阶段 E 内容）
**目标**：实现右侧 PDA 工作台

**原因**：阶段 E（Manual PDA 编辑/删除/导出/新建）功能更适合放在侧栏工作台，而不是右键菜单

**内容**：
- [ ] 侧栏 UI 设计
- [ ] 新建 Manual PDA 表单
- [ ] 编辑 Manual PDA
- [ ] 删除 Manual PDA
- [ ] PDA 列表展示
- [ ] 导出/导入 YAML

---

## 技术债务

### 代码质量
- [ ] `findPdaAtPosition` 函数过长（~100 行），考虑拆分
- [ ] 菜单项配置有重复，考虑抽取公共配置
- [ ] **模块化拆分**（阶段 D 后执行）
  - [ ] 拆分为 6 个模块文件（chart / pda-renderer / pda-detector / context-menu / pda-detail / utils）
  - [ ] 每个文件 < 300 行
  - [ ] 使用 ES6 module 或 `<script type="module">`

### 性能优化
- [ ] PDA 渲染性能测试（1000+ PDA）
- [ ] 大数据集下的点击检测性能

### 文档
- [ ] 更新 README.md（新增右键菜单功能）
- [ ] 更新 QUICKSTART.md（新增快捷键说明）

---

## 已知问题
### 已修复 ✅
- [x] PDA 标志初次加载不显示（需要移动鼠标才显示）— 已修复（`bf0ebaa`）
- [x] 左键点击图表后 PDA 标志消失 — 已修复（`bf0ebaa`）

### 待修复
- 无
**现象**：修改代码后，浏览器仍运行旧代码  
**解决方案**：
1. 关闭标签页，重新打开
2. 换端口启动服务（8000 → 8001）
3. 清空浏览器缓存

### 代码循环 bug
**现象**：修改代码时破坏结构，导致语法错误  
**预防措施**：
1. 每次修改后立即测试
2. 使用 Edit 工具 > Python > sed
3. 遇到问题立即回退到稳定版本

---

## 参考资料

- [会话记录](./sessions/session_20260514.md)
- [设计文档](./docs/CONTEXT_MENU_DESIGN.md)
- [技术可行性](./docs/CONTEXT_MENU_FEASIBILITY.md)
- [集成记录](./docs/CONTEXT_MENU_INTEGRATION.md)

---

## 版本历史

| 版本 | 日期 | 提交 | 说明 |
|---|---|---|---|
| v0.3 | 2026-05-14 | `d3cd332` | 完成阶段 A & B |
| v0.2 | 2026-05-14 | `6e17771` | 完成阶段 A |
| v0.1 | 2026-05-13 | `145624a` | 右键菜单基础功能 |
