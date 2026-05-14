# V3 开发 TODO

## 当前分支：`feature/context-menu-research`

**最后更新**：2026-05-14 下午  
**当前状态**：阶段 A & B & C 已完成

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

---

## 待完成功能 🔄

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
**状态**：待开始  
**预计时长**：2-3 天

- [ ] D1. NWOG / NDOG 渲染
  - [ ] Custom Primitive 水平线
  - [ ] 颜色：NWOG 紫 / NDOG 青
- [ ] D2. Daily High / Low 渲染
  - [ ] 水平线延伸到当日结束
  - [ ] 颜色：实绿 / 实红
- [ ] D3. ICT Midnight Day High/Low 渲染
  - [ ] 类似 Daily H/L，虚线区分
- [ ] D4. EQH / EQL 渲染
  - [ ] 多点 + 连线
  - [ ] 扩展 API 查询 `pda_members`
- [ ] D5. 扩展点击检测
  - [ ] `findPdaAtPosition` 增加各类型分支

---

## 合并计划

**目标**：阶段 D 完成后合并到 main

**合并前检查清单**：
- [ ] 所有功能验证通过
- [ ] 代码格式化完成（Prettier）
- [ ] 会话记录更新
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
