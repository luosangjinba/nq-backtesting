# PDA 工作台功能开发 - 分支说明

> **分支名称**：`feature/pda-workbench-research`  
> **创建时间**：2026-05-12  
> **基于提交**：`23a6b68` (feat: 解除 timeframe 硬编码，联动 tfSelect)

---

## 📋 分支目的

本分支用于 **PDA 工作台功能的技术预研和开发**，包括：
- 技术预研 demo
- 方案验证和决策
- 阶段性实现

**采用独立分支的原因：**
- 保持 `main` 分支干净，只包含稳定、可发布的代码
- 预研工作独立，不污染主线
- 可以随时切换回 `main` 做其他工作
- 预研完成后，选择性合并成熟代码到 `main`

---

## 🎯 开发计划

### 阶段 0：技术预研 ✅（当前）

**目标**：验证关键技术点的可行性

**完成内容：**
1. ✅ 方案规划文档（`PLAN_PDA_WORKBENCH.md`）
2. ✅ 技术预研报告（`TECH_RESEARCH_REPORT.md`）
3. ✅ Demo 1: Primitive 点击检测（`demo_01_click_detection_v2.html`）
4. ✅ Demo 1 扩展: 重叠 PDA 选择策略测试（`demo_01_overlap_test.html`）
5. ✅ Demo 1 扩展: 重叠 PDA 视觉提示方案（`demo_01_overlap_indicator.html`）
6. ✅ Demo 2: 侧边栏布局（`demo_02_sidebar_layout.html`）
7. ✅ Demo 3: API 调用测试（`demo_03_api_test.html`）

**已确认决策：**
- ✅ 采用三阶段拆分方案
- ✅ 侧边栏宽度 360px 固定
- ✅ PDA 列表首选时序排序
- ✅ 重叠 PDA 采用循环切换策略
- ⏳ 重叠 PDA 视觉提示方案（待用户测试选择）

---

### 阶段 1：基础 UI 和 PDA 选择（计划）

**目标**：实现右侧侧边栏 + PDA 列表 + 点击交互

**工作内容：**
1. 在 `kline_viewer.html` 中添加侧边栏 HTML 结构
2. 在 `chart-viewer.css` 中添加侧边栏样式
3. 实现 PDA 列表渲染逻辑（按时间排序，按类型分组）
4. 实现点击检测和选择逻辑（循环切换策略）
5. 实现 PDA 详情显示（只读）
6. 实现重叠 PDA 视觉提示（数字徽章或其他方案）

**预计时间**：0.5 天

---

### 阶段 2：Manual PDA 录入（计划）

**目标**：实现手动创建 PDA 的表单和保存逻辑

**工作内容：**
1. 添加"新建 PDA"按钮
2. 实现表单 UI（侧边栏内展开或弹出对话框）
3. 实现表单验证逻辑
4. 调用 `POST /v2/pda_manual_add` 保存
5. 保存成功后刷新列表和图表

**预计时间**：0.5 天

---

### 阶段 3：PDA 编辑和删除（计划）

**目标**：支持修改和删除已有的 Manual PDA

**工作内容：**
1. 选中 Manual PDA 后显示"编辑"和"删除"按钮
2. 实现编辑功能（复用阶段 2 的表单）
3. 实现删除功能（确认对话框）
4. 权限控制：只能编辑/删除 Manual PDA

**预计时间**：0.5 天

---

## 📂 文件结构

```
v3/
├── docs/
│   ├── PLAN_PDA_WORKBENCH.md          # 方案规划文档
│   ├── TECH_RESEARCH_REPORT.md        # 技术预研报告
│   ├── demo_01_click_detection.html   # Demo 1: 点击检测（初版）
│   ├── demo_01_click_detection_v2.html # Demo 1: 点击检测（规范版）
│   ├── demo_01_overlap_test.html      # Demo 1 扩展: 重叠选择策略
│   ├── demo_01_overlap_indicator.html # Demo 1 扩展: 重叠视觉提示
│   ├── demo_02_sidebar_layout.html    # Demo 2: 侧边栏布局
│   ├── demo_03_api_test.html        # Demo 3: API 调用测试
│   └── kline_viewer.html           # 主文件（待实现工作台）
├── styles/
│   └── chart-viewer.css               # 样式文件（待添加侧边栏样式）
└── TODO.md                            # 任务清单
```

---

## 🔄 分支工作流

### 日常开发

```bash
# 1. 切换到预研分支
git checkout feature/pda-workbench-research

# 2. 进行开发和测试
# ...

# 3. 提交更改
git add .
git commit -m "feat: 实现 XXX 功能"

# 4. 如需切换回 main 做其他工作
git checkout main
```

### 合并到 main

**阶段 1 完成后：**
```bash
# 1. 切换到 main
git checkout main

# 2. 合并阶段 1 的实现（不包括 demo 文件）
git merge --no-ff feature/pda-workbench-research

# 或者选择性合并（cherry-pick）
git cherry-pick <commit-hash>

# 3. 删除 demo 文件（如果不小心合并进来）
git rm v3/docs/demo_*.html
git commit -m "chore: 移除预研 demo 文件"
```

**全部完成后：**
```bash
# 1. 确认所有功能稳定
# 2. 合并整个分支到 main
git checkout main
git merge --no-ff feature/pda-workbench-research

# 3. 清理 demo 文件
git rm v3/docs/demo_*.html
git commit -m "chore: 清理预研 demo 文件"

# 4. 删除预研分支（可选）
git branch -d feature/pda-workbench-research
```

---

## 📝 提交记录

### 技术预研阶段

```
b89b5a3 feat: 添加重叠 PDA 视觉提示方案对比 demo
006ee9d docs: 更新技术预研报告 - 确认采用循环切换策略
e295ef4 test: 添加重叠 PDA 点击测试 - 4 种选择策略
13ec47d feat: 添加 demo_01_v2 - 按 kline_viewer 规范绘制 PDA
338433d fix: 修复 demo_01 中的 typo (BslRender -> BslRenderer)
abe4455 docs: 更新 SESSIONS.md - 追加技术预研会话记录
fdd6801 docs: 技术预研 - PDA 工作台关键技术验证
```

---

## 🧪 测试 Demo

**启动服务：**
```bash
cd /home/leo/myworkspace/trading/backtesting
bash restart_api.sh
python3 -m http.server 8000
```

**访问 Demo：**
- Demo 1 (规范版): http://127.0.0.1:8000/v3/docs/demo_01_click_detection_v2.html
- Demo 1 (重叠测试): http://127.0.0.1:8000/v3/docs/demo_01_overlap_test.html
- Demo 1 (视觉提示): http://127.0.0.1:8000/v3/docs/demo_01_overlap_indicator.html
- Demo 2: http://127.0.0.1:8000/v3/docs/demo_02_sidebar_layout.html
- Demo 3: http://127.0.0.1:8000/v3/docs/demo_03_api_test.html

---

## ⚠️ 注意事项

1. **不要在 main 分支上开发工作台功能**，所有工作在 `feature/pda-workbench-research` 分支进行
2. **Demo 文件不合并到 main**，只合并实际实现的代码
3. **定期同步 main 的更新**：如果 main 有新提交，及时合并到预研分支
4. **保持提交清晰**：每个功能点独立提交，方便后续 cherry-pick

---

## 📞 联系

如有问题，请查看：
- 方案规划：`v3/docs/PLAN_PDA_WORKBENCH.md`
- 技术报告：`v3/docs/TECH_RESEARCH_REPORT.md`
- 任务清单：`v3/TODO.md`
