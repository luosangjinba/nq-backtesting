# K 线回放与市场结构标注 - 技术方案

**版本**：v1.0  
**日期**：2026-05-15  
**状态**：方案确认

---

## 目录

1. [功能概述](#功能概述)
2. [数据模型](#数据模型)
3. [技术架构](#技术架构)
4. [交互设计](#交互设计)
5. [实施计划](#实施计划)

---

## 功能概述

### 核心使用场景

在 1H 周期上回放 K 线，手动标注市场结构：
1. **回放 K 线**：按时间顺序逐步显示，模拟实盘观察
2. **标注 PDA**：在关键节点确认或录入 PDA
3. **标注行情段**：连接 Swing Low/High，关联导致反转的 PDA
4. **标注市场结构**：连接行情段，标注 HH/HL、LH/LL 等结构

### 设计原则

- **手动优先**：Swing 点、PDA 关联、结构类型均手动标注
- **数据可审查**：YAML 文件人类可读，易于审查和修正
- **渐进式实施**：先实现基础功能，后续优化

---

## 数据模型

### 1. YAML 数据结构

**文件路径**：`v2/data/swing_analysis/YYYY-MM-DD.yaml`

```yaml
# 会话元数据
session:
  date: "2012-01-09"
  timeframe: "1H"
  created_at: "2026-05-15 14:30:00"
  updated_at: "2026-05-15 16:45:00"

# 行情段列表
swing_legs:
  - id: leg_20120109_001
    start:
      time: "2012-01-09 09:30:00"
      price: 2300.50
      type: swing_low  # swing_low / swing_high
    end:
      time: "2012-01-09 14:00"
      price: 2310.75
      type: swing_high
    direction: bullish  # bullish / bearish
    related_pdas:
      - pda_id: bsl_1h_20120109_093000
        role: support  # support / resistance / trigger
        notes: "突破后回踩确认"
      - pda_id: fvg_4h_20120109_080000
        role: support
        notes: "FVG 支撑"
    notes: "FVG 支撑后反弹，突破 BSL 形成上涨段"
    
  - id: leg_20120109_002
    start:
      time: "2012-01-09 14:00:00"
      price: 2310.75
      type: swing_high
    end:
      time: "2012-01-09 18:00:00"
      price: 2305.25
      type: swing_low
    direction: bearish
    related_pdas:
      - pda_id: ssl_1h_20120109_140000
      role: resistance
        notes: "遇阻回落"
    notes: "遇 SSL 阻力回落"

# 市场结构列表
market_structures:
  - id: ms_20120109_001
    legs:
      - leg_20120109_001
      - leg_20120109_002
      - leg_20120109_003
    structure_type: HH_HL  # HH_HL / LH_LL / HH_LL / LH_HL
    start_time: "2012-01-09 09:30:00"
    end_time: "2012-01-09 18:00:00"
    key_points:
      - type: structure_break  # structure_break / bos / choch
        time: "2012-01-09 15:30:00"
        price: 2308.50
      notes: "突破前高，确认上升结构"
    notes: "上升结构，HH 和 HL 清晰"
```

### 2. DuckDB 表结构

**表 1：swing_legs（行情段）**
```sql
CREATE TABLE swing_legs (
  id VARCHAR PRIMARY KEY,
  session_date DATE NOT NULL,
  timeframe INTEGER NOT NULL,
  start_time TIMESTAMP NOT NULL,
  start_price DECIMAL(10,2) NOT NULL,
  start_type VARCHAR NOT NULL,  -- swing_low / swing_high
  end_time TIMESTAMP NOT NULL,
  end_price DECIMAL(10,2) NOT NULL,
  end_type VARCHAR NOT NULL,
  direction VARCHAR NOT NULL,  -- bullish / bearish
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_swing_legs_date ON swing_legs(session_date);
CREATE INDEX idx_swing_legs_time ON swing_legs(start_time, end_time);
```

**表 2：swing_leg_pdas（行情段-PDA 关联）**
```sql
CREATE TABLE swing_leg_pdas (
  swing_leg_id VARCHAR NOT NULL,
  pda_id VARCHAR NOT NULL,
  role VARCHAR NOT NULL,  -- support / resistance / trigger
  notes TEXT,
  PRIMARY KEY (swing_leg_id, pda_id)
);

CREATE INDEX idx_swing_leg_pdas_leg ON swing_leg_pdas(swing_leg_id);
CREATE INDEX idx_swing_leg_pdas_pda ON swing_leg_pdas(pda_id);
```

**表 3：market_structures（市场结构）**
```sql
CREATE TABLE market_structures (
  id VARCHAR PRIMARY KEY,
  session_date DATE NOT NULL,
  structure_type VARCHAR NOT NULL,  -- HH_HL / LH_LL / ...
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_structures_date ON market_structures(session_date);
```

**表 4：market_structure_legs（市场结构-行情段关联）**
```sql
CREATE TABLE market_structure_legs (
  structure_id VARCHAR NOT NULL,
  leg_id VARCHAR NOT NULL,
  leg_order INTEGER NOT NULL,  -- 行情段在结构中的顺序
  PRIMARY KEY (structure_id, leg_id)
);

CREATE INDEX idx_ms_legs_structure ON market_structure_legs(structure_id);
```

**表 5：structure_key_points（结构关键点）**
```sql
CREATE TABLE structure_key_points (
  id VARCHAR PRIMARY KEY,
  structure_id VARCHAR NOT NULL,
  point_type VARCHAR NOT NULL,  -- structure_break / bos / choch
  time TIMESTAMP NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT
);

CREATE INDEX idx_key_points_structure ON structure_key_points(structure_id);
```

### 3. 数据同步

**同步脚本**：`v2/scripts/sync_swing_analysis.py`

```python
# 伪代码
def sync_yaml_to_duckdb(yaml_file, db_conn):
    """同步单个 YAML 文件到 DuckDB"""
    data = load_yaml(yaml_file)
    
    # 同步行情段
    for leg in data['swing_legs']:
        upsert_swing_leg(db_conn, leg)
        for pda in leg['related_pdas']:
            upsert_swing_leg_pda(db_conn, leg['id'], pda)
    
    # 同步市场结构
    for ms in data['market_structures']:
        upsert_market_structure(db_conn, ms)
        for i, leg_id in enumerate(ms['legs']):
            upsert_ms_leg(db_conn, ms['id'], leg_id, i)
        for kp in ms.get('key_points', []):
            upsert_key_point(db_conn, ms['id'], kp)

# 使用
python3 v2/scripts/sync_swing_analysis.py --file v2/data/swing_analysis/2012-01-09.yaml
python3 v2/scripts/sync_swing_analysis.py --all
python3 v2/scripts/sync_swing_analysis.py --rebuild
```

---
## 技术架构

### 1. 前端状态管理

```javascript
// 回放状态
const replayState = {
  isPlaying: false,
  speed: 1,  // 1x, 2x, 5x
  currentIndex: 0,
  totalBars: 0,
  allBars: [],
  allPdas: [],
  intervalId: null
};

// 标注状态
const annotationState = {
  mode: 'idle',  // idle / marking_swing / marking_leg / marking_structure
  selectedSwingPoints: [],  // 已选中的 Swing 点
  selectedLegs: [],  // 已选中的行情段
  currentLeg: null,  // 当前正在标注的行情段
  currentStructure: null  // 当前正在标注的市场结构
};

// 会话数据
const sessionData = {
  date: '2012-01-09',
  timeframe: 60,
  swingLegs: [],
  marketStructures: []
};
```

### 2. API 端点

**新增端点**：

```python
# 保存行情段
POST /v2/swing_leg/save
{
  "session_date": "2012-01-09",
  "timeframe": 60,
  "start": {"time": "...", "price": 2300.50, "type": "swing_low"},
  "end": {"time": "...", "price": 2310.75, "type": "swing_high"},
  "direction": "bullish",
  "related_pdas": [...],
  "notes": "..."
}

# 加载会话数据
GET /v2/swing_analysis/load?date=2012-01-09&timeframe=60

# 保存市场结构
POST /v2/market_structure/save
{
  "session_date": "2012-01-09",
  "legs": ["leg_20120109_001", "leg_20120109_002"],
  "structure_type": "HH_HL",
  "notes": "..."
}

# 删除行情段
DELETE /v2/swing_leg/delete?id=leg_20120109_001

# 删除市场结构
DELETE /v2/market_structure/delete?id=ms_20120109_001
```

### 3. 渲染层

**Lightweight Charts 扩展**：

```javascript
// 行情段渲染（使用 LineSeries）
function renderSwingLeg(leg) {
  const line = chart.addLineSeries({
    color: leg.direction === 'bullish' ? '#26a69a' : '#ef5350',
    lineWidth: 2,
    lineStyle: 0  // solid
  });
  
  line.setData([
    { time: leg.start.time, value: leg.start.price },
    { time: leg.end.time, value: leg.end.price }
  ]);
  
  // 添加标签
  addSwingLabel(leg.start, leg.start.type);
  addSwingLabel(leg.end, leg.end.type);
}

// 市场结构渲染（使用不同颜色/样式）
function renderMarketStructure(structure) {
  structure.legs.forEach((legId, index) => {
    const leg = findLegById(legId);
    renderSwingLeg(leg, {
      color: getStructureColor(structure.structure_type),
      lineWidth: 3,
      opacity: 0.8
    });
  });
}
```

---

## 交互设计

### 待定问题（需要 Demo 确认）

#### 1. PDA 关联交互

**方案 A：时间范围内 PDA 列表勾选**
- 标注行情段时，自动显示该时间范围内的所有 PDA
- 用户勾选相关的 PDA，选择角色（support/resistance/trigger）
- 优点：直观，不需要记忆 PDA ID
- 缺点：PDA 列表可能很长

**方案 B：先选 PDA 再关联**
- 用户先在图表上点击选中 PDA
- 然后在行情段表单中点击"关联已选 PDA"
- 优点：灵活，可以跨时间范围关联
- 缺点：需要两步操作

**方案 C：输入 PDA ID**
- 在行情段表单中手动输入 PDA ID
- 优点：最灵活
- 缺点：需要记忆或查找 PDA ID

#### 2. 行情段标注交互

**方案 A：点击 K 线自动识别 Swing 点**
- 点击 K 线，自动识别最近的局部极值
- 优点：快速
- 缺点：可能识别错误

**方案 B：手动点击两个点连线**
- 点击第一个点（Swing Low/High）
- 点击第二个点（Swing High/Low）
- 自动连线并弹出表单
- 优点：精确
- 缺点：需要两次点击

**方案 C：右键菜单标记**
- 右键点击 K 线，选择"标记为 Swing Low/High"
- 标记两个点后，自动连线
- 优点：明确
- 缺点：操作步骤多

#### 3. 回放进度保存

**方案 A：自动保存进度**
- 回放过程中自动保存当前位置
- 下次打开自动恢复
- 优点：无需手动操作
- 缺点：可能不需要恢复

**方案 B：手动保存检查点**
- 用户手动点击"保存进度"
- 下次可选择恢复或从头开始
- 优点：灵活
- 缺点：需要手动操作

**方案 C：不保存**
- 每次从头开始
- 优点：简单
- 缺点：长时间回放不便

---

## 实施计划

### 阶段 0：交互 Demo（0.5 天）

**目标**：通过 demo 确认交互方式

- [ ] `demo_pda_association.html` - PDA 关联交互 demo
- [ ] `demo_swing_annotation.html` - 行情段标注交互 demo
- [ ] `demo_replay_progress.html` - 回放进度保存 demo

### 阶段 1：K 线回放基础（0.5 天）

- [ ] 回放控制栏 UI（播放/暂停/停止/速度/进度条）
- [ ] 回放逻辑（逐根显示 K 线）
- [ ] 单步前进/后退
- [ ] PDA 同步显示（显示当前时间点之前的 PDA）

### 阶段 2：PDA 标注工作流（1 天）

- [ ] 点击检测（击中已扫描 PDA）
- [ ] PDA 确认状态标记（在 `pda_registry` 表增加 `confirmed` 字段）
- [ ] 手动 PDA 录入表单
- [ ] 保存到 `pda_registry` 表（`source='Manual'`）

### 阶段 3：行情段标注（1.5 天）

- [ ] Swing Low/High 手动标记（根据 demo 确定的方式）
- [ ] 行情段连线渲染
- [ ] PDA 关联表单（根据 demo 确定的方式）
- [ ] 保存到 YAML 文件
- [ ] API 端点实现
- [ ] 同步脚本（YAML → DuckDB）

### 阶段 4：市场结构标注（1 天）

- [ ] 行情段选择和组合
- [ ] 结构类型标注（HH_HL/LH_LL/...）
- [ ] 关键点标注（structure_break/bos/choch）
- [ ] 保存到 YAML 文件
- [ ] 同步脚本更新

---

## 技术挑战

### 1. 回放性能

**问题**：大量 K 线逐根显示可能卡顿  
**解决方案**：
- 使用 `requestAnimationFrame` 而非 `setInterval`
- 批量更新（每次更新 5-10 根）
- 虚拟滚动（只渲染可见区域）

### 2. 行情段渲染

**问题**：Lightweight Charts 不直接支持斜线  
**解决方案**：
- 使用 `LineSeries` 模拟（两个点的折线）
- 或使用 Canvas 自定义绘制

### 3. 数据一致性

**问题**：YAML 修改后 DuckDB 未同步  
**解决方案**：
- 前端保存时同时更新 YAML 和 DuckDB
- 或前端只保存 YAML，后台定时同步
- 提供手动同步命令

---

## 参考资料

- Lightweight Charts API: https://tradingview.github.io/lightweight-charts/
- 现有代码：`v3/modules/chart.js`, `v3/modules/pda-renderer.js`
- 会话记录：`v3/sessions/session_20260515_replay_structure_plan.md`
