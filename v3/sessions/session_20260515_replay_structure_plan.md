# Session 2026-05-15 - K 线回放与市场结构标注功能规划

**日期**：2026-05-15  
**分支**：`feature/chart-display-control`  
**状态**：方案调整与确认

---

## 会话目标

调整图表显示控制功能方向，重新聚焦到核心需求：
- K 线回放（Replay）
- PDA 标注工作流
- 行情段（Swing Leg）标注
- 市场结构（Market Structure）标注

---

## 需求澄清

### 原计划 vs 实际需求

**原计划**（偏离）：
- PDA 显示控制（按类型/周期过滤）
- 标签显示控制（字体/位置/样式）
- K 线回放

**实际需求**（核心）：
1. **K 线回放**：按时间顺序逐步显示 K 线，模拟实盘观察
2. **PDA 标注工作流**：
   - 回放到关键节点，点击图表标注 PDA
   - 击中已扫描 PDA → 确认
   - 未击中 → 手动录入新 PDA
3. **行情段标注**：
   - 在 1H 周期上，手动点击 Swing Low/High
   - 连线形成行情段
   - 关联导致反转的 PDA
4. **市场结构标注**：
   - 连接多个行情段
   - 标注结构类型（HH/HL、LH/LL）
   - 记录结构转换点
### 核心使用场景

**场景描述**：
> 使用 1H 周期回放 K 线，在 Swing Low/High 之间连线标记行情段，每个行情段尽可能寻找使其反转的理由（各种 PDA）。连接行情段形成市场结构，忠实记录 HH/HL 或 LH/LL 等情况，并入库保存。

---

## 方案决策

### 1. 数据存储方案

**对比三种方案**：
- 方案 A：纯 YAML 文件
- 方案 B：纯 DuckDB 表
- 方案 C：混合方案（YAML + DuckDB 镜像）

**决策**：✅ **方案 C（混合方案）**

**理由**：
- 与现有 Layer 2 架构一致（YAML 为真相源，DuckDB 为查询层）
- YAML 人类可读，易于审查和手动修正
- DuckDB 支持复杂查询和统计分析
- 渐进式实施：初期只用 YAML，后期加入 DuckDB 镜像

**数据结构**：
```yaml
# v2/data/swing_analysis/2012-01-09.yaml
session:
  date: "2012-01-09"
  timeframe: "1H"
  
swing_legs:
  - id: leg_20120109_001
    start:
    time: "2012-01-09 09:30"
      price: 2300.50
      type: swing_low
    end:
      time: "2012-01-09 14:00"
      price: 2310.75
      type: swing_high
    direction: bullish
    related_pdas:
      - pda_id: bsl_1h_20120109_0930
        role: support
      - pda_id: fvg_4h_20120109_0800
        role: support
    notes: "FVG 支撑后反弹，突破 BSL"

market_structures:
  - id: ms_20120109_001
    legs: [leg_20120109_001, leg_20120109_002]
    structure_type: HH_HL
    start_time: "2012-01-09 09:30"
    end_time: "2012-01-09 16:00"
    notes: "上升结构"
```

**DuckDB 表结构**：
```sql
-- 行情段表
CREATE TABLE swing_legs (
  id VARCHAR PRIMARY KEY,
  session_date DATE,
  timeframe INTEGER,
  start_time TIMESTAMP,
  start_price DECIMAL(10,2),
  start_type VARCHAR,
  end_time TIMESTAMP,
  end_price DECIMAL(10,2),
  end_type VARCHAR,
  direction VARCHAR,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PDA 关联表
CREATE TABLE swing_leg_pdas (
  swing_leg_id VARCHAR,
  pda_id VARCHAR,
  role VARCHAR,
  PRIMARY KEY (swing_leg_id, pda_id)
);

-- 市场结构表
CREATE TABLE market_structures (
  id VARCHAR PRIMARY KEY,
  session_date DATE,
  structure_type VARCHAR,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 市场结构-行情段关联表
CREATE TABLE market_structure_legs (
  structure_id VARCHAR,
  leg_id VARCHAR,
  leg_order INTEGER,
  PRIMARY KEY (structure_id, leg_id)
);
```

### 2. 其他待定决策

**需要通过交互 demo 确认**：
- ✅ Swing 点识别：手动点击（已确认）
- ⏸ PDA 关联交互方式（待 demo）
- ⏸ 行情段标注交互方式（待 demo）
- ⏸ 回放进度保存方式（待 demo）

---

## 实施计划

### 阶段 0：交互 Demo（0.5 天）
**目标**：通过 demo 确认交互方式

- [ ] Demo 1: PDA 关联交互
  - 方案 A：时间范围内 PDA 列表勾选
  - 方案 B：先选 PDA 再关联
  - 方案 C：输入 PDA ID
  
- [ ] Demo 2: 行情段标注交互
  - 方案 A：点击 K 线自动识别 Swing 点
  - 方案 B：手动点击两个点连线
  - 方案 C：右键菜单标记
  
- [ ] Demo 3: 回放进度保存
  - 方案 A：自动保存进度，下次恢复
  - 方案 B：手动保存检查点
  - 方案 C：不保存，每次从头开始

### 阶段 1：K 线回放基础（0.5 天）
- [ ] 回放控制栏 UI
- [ ] 播放/暂停/停止功能
- [ ] 速度控制（1x/2x/5x）
- [ ] 进度条和时间标记
- [ ] 单步前进/后退

### 阶段 2：PDA 标注工作流（1 天）
- [ ] 点击检测（击中已扫描 PDA）
- [ ] PDA 确认状态标记
- [ ] 手动 PDA 录入表单
- [ ] 保存到 `pda_registry` 表（Manual 类型）

### 阶段 3：行情段标注（1.5 天）
- [ ] Swing Low/High 手动标记
- [ ] 行情段连线渲染
- [ ] PDA 关联（根据 demo 确定的方式）
- [ ] 保存到 YAML 文件
- [ ] 同步脚本（YAML → DuckDB）

### 阶段 4：市场结构标注（1 天）
- [ ] 行情段组合
- [ ] 结构类型标注（HH_HL/LH_LL）
- [ ] 保存到 YAML 文件
- [ ] 同步脚本更新

---

## 技术要点

### 1. 回放状态管理
```javascript
const replayState = {
  isPlaying: false,
  speed: 1,
  currentIndex: 0,
  totalBars: 0,
  allBars: [],
  allPdas: [],
  intervalId: null
};
```

### 2. 行情段数据结构
```javascript
const swingLeg = {
  id: 'leg_20120109_001',
  start: { time, price, type: 'swing_low' },
  end: { time, price, type: 'swing_high' },
  direction: 'bullish',
  relatedPdas: [
    { pdaId: 'bsl_1h_...', role: 'support' }
  ],
  notes: ''
};
```

### 3. 市场结构数据结构
```javascript
const marketStructure = {
  id: 'ms_20120109_001',
  legs: ['leg_20120109_001', 'leg_20120109_002'],
  structureType: 'HH_HL',
  startTime: '2012-01-09 09:30',
  endTime: '2012-01-09 16:00',
  notes: ''
};
```

---

## 文件清单

### 已创建
- `v3/docs/demo_display_control_dropdown.html` - 下拉面板方案（已废弃）
- `v3/docs/demo_display_control_sidebar.html` - 侧边栏方案（已废弃）
- `v3/docs/demo_display_control_functional.html` - 功能验证 demo（已废弃）

### 待创建
- `v3/docs/demo_pda_association.html` - PDA 关联交互 demo
- `v3/docs/demo_swing_annotation.html` - 行情段标注交互 demo
- `v3/docs/demo_replay_progress.html` - 回放进度保存 demo
- `v3/docs/REPLAY_STRUCTURE_PLAN.md` - 详细技术方案文档
---

## 下一步

1. ✅ 更新 TODO.md，固定方案
2. ⏸ 创建三个交互 demo
3. ⏸ 根据 demo 反馈确定交互方式
4. ⏸ 开始实施阶段 1

---

## 备注

- 原 `CHART_DISPLAY_CONTROL_PLAN.md` 方向偏离，需要重写
- 三个已创建的 demo 文件可以删除或归档
- 新方案更聚焦核心需求：回放 + 标注 + 入库
