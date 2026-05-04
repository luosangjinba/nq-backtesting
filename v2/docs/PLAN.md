# Layer2 Recorder V2 开发计划

## 当前状态

- ✅ Path/Group 基础结构完成
- ✅ End Factors / Path Actions 分离完成
- ✅ 向后兼容旧 YAML 格式
- ✅ 文档整理完成

---

## 近期计划（优先执行）

### 阶段 1：数据录入验证

**目标：录入 50-100 个 Path 数据，验证工具可用性**

- [ ] 录入 50-100 个 Path
- [ ] 验证 End Factors 录入流程
- [ ] 验证 Path Actions 录入流程
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

### 阶段 3：数据库入库

**前置条件：阶段 1、2 完成**

- [ ] 设计表结构
- [ ] 实现 YAML → DuckDB 同步
- [ ] 实现查询接口

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
├── path_end_factors    # 新增：Path 的 End Factors
├── path_actions        # 新增：Path 的 Path Actions
├── structure_groups    # 新增：Group 记录
├── structure_group_members  # 新增：Group 成员
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

-- End Factors
CREATE TABLE path_end_factors (
    factor_id VARCHAR PRIMARY KEY,
    path_id VARCHAR,
    factor_index INTEGER,
    end_reason VARCHAR,
    end_reason_tf VARCHAR,
    end_respect_type VARCHAR,
    end_respect_extent DOUBLE,
    ref_source VARCHAR,
    ref_id VARCHAR,        -- 可关联 pda_registry.pda_id
    ref_label VARCHAR,
    note VARCHAR
);

-- Path Actions
CREATE TABLE path_actions (
    action_id VARCHAR PRIMARY KEY,
    path_id VARCHAR,
    action_index INTEGER,
    action_type VARCHAR,
    ref_source VARCHAR,
    ref_id VARCHAR,
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

- [ ] 代码重构：renderEndFactors 与 renderPathActions 有大量重复，可抽取公共函数
- [ ] 单元测试：关键函数需要测试覆盖
- [ ] 错误处理：API 调用失败时的用户提示
- [ ] 性能优化：大量 Path 时的渲染性能

---

## 版本规划

| 版本 | 内容 | 状态 |
|------|------|------|
| v2.0 | 基础结构 + End Factors/Path Actions 分离 | ✅ 完成 |
| v2.1 | 数据验证 + 统计功能 | 规划中 |
| v2.2 | 批量操作 + 搜索过滤 | 规划中 |
| v2.3 | 可视化增强 | 规划中 |

---

## 待讨论

1. **统计维度的优先级**：哪些统计对交易决策最有帮助？
2. **可视化形式**：是否需要引入图表库（如 Chart.js）？
3. **数据存储**：是否需要支持云端同步？
4. **与 Layer3 Journal 的关系**：如何衔接？
