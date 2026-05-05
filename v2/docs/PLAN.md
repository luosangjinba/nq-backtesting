# Layer2 Recorder V2 开发计划

## 当前状态

- ✅ Path/Group 基础结构完成
- ✅ End Factors / Path Actions 合并为 Path Encounters
- ✅ liquidity Respect Type 改为 突破/接近
- ✅ 向后兼容旧 YAML 格式
- ✅ K线查看器（kline_viewer.html）
- ✅ 文档整理完成
- 🔲 Manual PDA 入库（待收口）
- 🔲 YAML 入库（待收口）

---

## 收口工作（优先执行）

### 收口 1：Manual PDA 入库

**目标：手动录入的 PDA 存入 v2_research.duckdb，与自动 PDA 统一管理**

- [ ] 设计 manual PDA 表结构（复用 pda_registry？还是独立表？）
- [ ] 实现 API 端点：CRUD manual PDA
- [ ] layer2_recorder_v2 页面集成：Manual PDA 录入后自动保存到 DB
- [ ] Pick Ref 列表合并 auto_pda + manual_pda 数据源

### 收口 2：YAML 入库

**目标：Path 数据从 YAML 同步到 DuckDB，支持查询和统计**

- [ ] 实现 YAML → DuckDB 同步（单向：YAML 仍是真相源）
- [ ] API 端点：Path CRUD + 查询
- [ ] 确认表结构（见下方 SQL，需更新 path_actions → end_factors）
- [ ] 入库触发方式：手动同步 or 录入时自动同步？

---

## 远期规划：K线一体化录入

**目标：将 layer2_recorder_v2 的全部功能整合到 K线页面，用鼠标操作替代手输**

**前置条件：收口 1、2 完成后再启动** — 数据模型和入库流程稳定后，再做 UI 一体化，避免返工。

### 可行性

- ✅ 点击K线设时间 — `subscribeClick` 获取坐标/时间
- ✅ PDA 单点标注 — BSL/SSL 点击标记
- ⚠️ PDA 区间标注 — FVG/OB 需自定义绘制（v5 primitive），稍复杂
- ✅ Path 切换 — 左侧面板保留列表，切换时图表跳转
- ✅ 流畅度 — 选区自动计算
- ✅ Path Encounters — 点击图上 PDA 标注关联

### 分步实施

1. **Phase 1**：时间选择 + Path 管理 — 点击K线填入 start/end，Path 列表面板
2. **Phase 2**：PDA 标注 — 单点（BSL/SSL）+ 区间（FVG/OB）可视化标注
3. **Phase 3**：完整交互 — 拖拽选区、Encounter 关联、所有表单操作图表化

### 布局设想

```
┌─────────────────┬──────────────────────────────┐
│  Recorder Panel  │        K-Line Chart          │
│  ─────────────  │                              │
│  Path 列表       │    (点击K线设时间)            │
│  当前 Path 字段  │    (点击标注 PDA)             │
│  Encounters 列表 │                              │
│  YAML 导入/导出  │                              │
└─────────────────┴──────────────────────────────┘
```

---

## 近期计划（优先执行）

### 阶段 1：数据录入验证

**目标：录入 50-100 个 Path 数据，验证工具可用性**

- [ ] 录入 50-100 个 Path
- [ ] 验证 Path Encounters 录入流程
- [ ] 验证 Ref Source 选择流程
- [ ] 验证 YAML 导出/导入
- [ ] 记录录入过程中的问题和改进点

### 阶段 2：Group 录入验证

**目标：跑通 Group 录入流程**

- [ ] 研究 Group 录入的最佳实践
- [ ] 录入若干 Group（每个包含多个 Path）
- [ ] 验证 Member Paths 关联
- [ ] 验证 Group YAML 导出/导入
- [ ] 记录问题和改进点

---

## 数据库入库方案（已确定）

### 方案：使用现有 v2_research.duckdb，新建表

**理由：**
1. 数据关联方便 — Path 可直接引用 `pda_registry` 中的 PDA
2. 备份简单 — 一个文件包含所有数据
3. 已有基础设施 — `price_lookup_api.py` 已连接此库

### 表结构设计

```
v2_research.duckdb
├── pda_registry        # 自动 PDA（已有）
├── pda_events          # PDA 事件（已有）
├── pd_extremes         # PD 极值（已有）
├── reference_groups    # 引用组（已有）
│
├── paths               # 新增：Path 记录
├── path_encounters     # 新增：Path Encounters（原 end_factors + path_actions 合并）
├── structure_groups    # 新增：Group 记录
├── structure_group_members  # 新增：Group 成员
├── manual_pda          # 新增：手动录入 PDA（待设计）
```

### 表结构 SQL

```sql
-- Path 主表
CREATE TABLE paths (
    path_id VARCHAR PRIMARY KEY,
    instrument VARCHAR,
    trade_date DATE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    primary_timeframe VARCHAR,
    direction VARCHAR,
    smoothness INTEGER,
    ratio_to_prev DOUBLE,
    start_origin VARCHAR,
    prev_path_id VARCHAR,
    tags VARCHAR[],
    note VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Path Encounters（合并后的 End Factors + Path Actions）
CREATE TABLE path_encounters (
    encounter_id VARCHAR PRIMARY KEY,
    path_id VARCHAR,
    encounter_index INTEGER,
    end_reason VARCHAR,
    end_reason_tf VARCHAR,
    end_respect_type VARCHAR,
    end_respect_extent DOUBLE,
    ref_source VARCHAR,
    ref_id VARCHAR,        -- 可关联 pda_registry.pda_id 或 manual_pda.pda_id
    ref_label VARCHAR,
    note VARCHAR
);

-- Structure Groups
CREATE TABLE structure_groups (
    group_id VARCHAR PRIMARY KEY,
    instrument VARCHAR,
    trade_date DATE,
    group_type VARCHAR,
    primary_timeframe VARCHAR,
    direction VARCHAR,
    role VARCHAR,
    structure_pattern VARCHAR,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    note VARCHAR
);

-- Group Members
CREATE TABLE structure_group_members (
    group_id VARCHAR,
    path_id VARCHAR,
    member_index INTEGER,
    PRIMARY KEY (group_id, path_id)
);
```

### 设计原则

1. **YAML 仍是真相源** — DuckDB 是查询/统计层，不是存储层
2. **通过 ref_id 关联** — `path_end_factors.ref_id` 可 JOIN `pda_registry.pda_id`
3. **手工录入与自动 PDA 联动** — 同一库方便关联查询

---

## 下一步规划

### 1. 数据验证与校验

**优先级：高**

- [ ] End Time 必须晚于 Start Time
- [ ] 流畅度范围 0-100
- [ ] End Respect Extent 范围 0-1
- [ ] Prev Path ID 存在性检查
- [ ] Group Member Paths 存在性检查
- [ ] YAML 导入时格式校验

### 2. 统计与汇总功能

**优先级：高**

- [ ] 按 End Reason 统计出现频率
- [ ] 按 Path Action Type 统计
- [ ] 流畅度分布统计
- [ ] 时间段分布统计（如 9:30-10:00 vs 10:00-10:30）
- [ ] 导出统计报告（Markdown/CSV）

### 3. 批量操作

**优先级：中**

- [ ] 批量修改 Direction
- [ ] 批量修改 Primary TF
- [ ] 批量添加 Tag
- [ ] 批量删除 Path
- [ ] 批量重新计算流畅度

### 4. 可视化增强

**优先级：中**

- [ ] Path 时间线视图（横向展示多个 Path）
- [ ] Group 结构图（树形展示 member paths）
- [ ] End Reason 饼图
- [ ] 流畅度柱状图
- [ ] 与 fxreplay 截图关联（已有 snap 目录）

### 5. 数据导出增强

**优先级：中**

- [ ] 导出单个 Path YAML
- [ ] 导出选中 Paths（而非全部）
- [ ] 导出 Markdown 报告（人类可读）
- [ ] 导出 CSV（用于 Excel 分析）
- [ ] 导出时包含统计摘要

### 6. 搜索与过滤

**优先级：中**

- [ ] 按 Direction 过滤 Path
- [ ] 按 End Reason 过滤
- [ ] 按 时间范围 过滤
- [ ] 按 流畅度范围 过滤
- [ ] 全文搜索（note/tag/ref）

### 7. 用户体验

**优先级：低**

- [ ] 键盘快捷键（如 Ctrl+S 保存）
- [ ] 拖拽调整 Path 顺序
- [ ] 自动保存提示
- [ ] 撤销/重做（至少单步）
- [ ] 暗色/亮色主题切换

### 8. 与其他工具集成

**优先级：低**

- [ ] 与 pda_review.html 联动
- [ ] 从 pda_review 选择 PDA 自动填入 End Factor
- [ ] 与 fxreplay 截图工具集成
- [ ] API 批量查询优化

---

## 技术债务

- [ ] 单元测试：关键函数需要测试覆盖
- [ ] 错误处理：API 调用失败时的用户提示
- [ ] 性能优化：大量 Path 时的渲染性能

---

## 版本规划

| 版本 | 内容 | 状态 |
|------|------|------|
| v2.0 | 基础结构 + End Factors/Path Actions 分离 | ✅ 完成 |
| v2.1 | Path Encounters 合并 + K线查看器 | ✅ 完成 |
| v2.2 | Manual PDA 入库 + YAML 入库 | 🔲 收口中 |
| v2.3 | 数据验证 + 统计功能 | 规划中 |
| v2.4 | K线一体化录入 | 远期规划 |

---

## 待讨论

1. **统计维度的优先级**：哪些统计对交易决策最有帮助？
2. **可视化形式**：是否需要引入图表库（如 Chart.js）？
3. **数据存储**：是否需要支持云端同步？
4. **与 Layer3 Journal 的关系**：如何衔接？
