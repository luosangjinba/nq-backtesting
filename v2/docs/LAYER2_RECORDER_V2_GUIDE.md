# Layer2 Recorder V2 使用说明

## 概述

Layer2 Recorder V2 是 NQ 期货 ICT 方法论结构路径录入工具，用于记录和统计 9:30-10:30 NY Open 窗口内的价格行为。

**核心定位：**
- YAML 为真相源，DuckDB 只做对照和匹配
- 积累结构化样本，为后续统计研究做准备
- 不追求实时交易，专注于历史复盘

---

## 页面布局

### 三栏结构

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: 标题 + 日期 + 操作按钮                                   │
├────────────────┬────────────────────────┬───────────────────────┤
│                │                        │                       │
│  左栏          │  中栏                  │  右栏                 │
│  Manual PDA    │  Path/Group Editor     │  Compare              │
│                │                        │                       │
├────────────────┴────────────────────────┴───────────────────────┤
│  Chips Bar: Path 切换 + Group 切换                               │
└─────────────────────────────────────────────────────────────────┘
```

**响应式：** 宽度 < 900px 时切换为单栏堆叠。

---

## 左栏：Manual PDA 录入

### PDA 类型

| 类型 | 说明 | 字段 |
|------|------|------|
| BSL/SSL | 单点流动性 | timeframe, event_time, price |
| FVG | 公允价值缺口（区间） | timeframe, event_time, price_high, price_low, direction |
| OB | 订单块（区间） | timeframe, start_time, end_time, price_high, price_low, direction |
| EQH/EQL | 等高点/等低点（集合） | timeframe, event_time, price, member_refs |

### 录入流程

1. 选择 PDA 类型卡片（可折叠）
2. 填写字段
3. 点击"取值"按钮可自动从 API 获取价格
4. 点击"新增"添加到当前 Path
5. Manual PDA List 显示已录入列表

---

## 中栏：Path Editor

### 基本信息

| 字段 | 说明 | 类型 |
|------|------|------|
| Path ID | 自动生成 | `path_YYYYMMDD_001` |
| Primary TF | 主时间框架 | 默认 1H |
| Start Time | 起始时间 | 1m 精度 |
| End Time | 结束时间 | 1m 精度 |
| Direction | 方向 | bullish / bearish / range |

### 行情特征（新设计）

| 字段 | 说明 | 类型 |
|------|------|------|
| Smoothness | 流畅度 1-5 | 5=非常流畅, 1=非常犹豫，可自动计算 |
| Ratio to Prev | 与上一段幅度比值 | 数值，如 1.5 = 比上一段长 50% |
| Start Origin | 起点 | 接上一段结尾 / 独立起点 |
| Prev Path ID | 关联上一段 | 可选 |

#### 流畅度自动计算

点击"计算"按钮，系统会根据 Start Time / End Time 调用 API 计算 K 线流畅度。

**时间对齐：** 输入时间会自动按所选周期向下取整对齐：
- 1H 周期：`16:23 → 16:00`，`01:45 → 01:00`
- 15m 周期：`16:23 → 16:15`，`01:47 → 01:45`
- 5m 周期：`16:23 → 16:20`，`01:47 → 01:45`

**首根 K 线剔除：** 计算时自动剔除首根 K 线（首根可能是反转 K 线，影响流畅度评分）。

**可选周期：** 1m / 5m / 15m / 1H / 4H / 1D

**计算公式（5 个指标加权）：**

| 指标 | 权重 | 说明 |
|------|------|------|
| 方向一致性 | 30% | 同方向 K 线数 / 总 K 线数 |
| 实体占比 | 25% | 平均实体大小 / 平均 K 线范围 |
| 连续性 | 20% | 最大连续同方向 K 线数 / 总 K 线数 |
| 推进效率 | 15% | 净推进距离 / 总价格变化 |
| 斜率稳定性 | 10% | 斜率波动程度的一致性 |

**API 端点：** `GET /v2/smoothness?start=...&end=...`

**命令行工具：** `v2/scripts/smoothness_calculator.py`

```bash
python3 v2/scripts/smoothness_calculator.py \
    --db trading_data.duckdb --table futures_1m \
    --start "2012-01-10 09:30:00" --end "2012-01-10 10:15:00"
```

**返回示例：**
```json
{
  "smoothness": 2.25,
  "barCount": 46,
  "details": {
    "directionConsistency": 0.478,
    "bodyRatio": 0.556,
    "continuity": 0.109,
    "efficiency": 0.051,
    "slopeStability": 0.0
  }
}
```

### 结束原因

| 字段 | 说明 | 类型 |
|------|------|------|
| End Reason | 遇到哪个 PDA | liquidity / fvg / ndog / nwog / ob / other |
| End Interaction | 交互方式 | 突破 / 尊重 / 反转未突破 |
| End Breakout Extent | 突破程度 | 点数或百分比 |
| End Respect Type | 尊重类型 | 影线 / 实体 |
| End Respect Extent | 尊重程度 | 如 0.35 = 到了 PDA 的 35% 位置 |

### Main Actions

记录这段路径中的关键动作，如：
- 突破某个 BSL
- 回测某个 FVG
- 形成新的 OB

每个 Action 包含：type, ref, ref_source, ref_id, ref_label, note

---

## 中栏：Group Editor

将多个 Path 组合成更大的结构单元。

| 字段 | 说明 |
|------|------|
| Group ID | 自动生成 |
| Group Type | range / trend / reversal |
| Primary TF | 主时间框架 |
| Direction | 方向 |
| Member Paths | 组成成员的 path_id 列表 |
| Note | 说明 |

---

## 右栏：Compare（自动 PDA 对照）

### API 配置

| 字段 | 默认值 |
|------|--------|
| API Base | http://127.0.0.1:8765 |
| Instrument | NQ |
| Sample Date | 2012-01-10 |
| Context Window | lookback 2 天, lookahead 1 天 |

### Match Result

1. 在 Manual PDA List 中选中一条手工 PDA
2. 点击"匹配"按钮
3. 显示与 DuckDB 中自动 PDA 的匹配结果

匹配类型：
- **exact**: 时间、价格、类型完全匹配
- **near**: 时间/价格接近，类型或方向匹配
- **context**: 在容忍范围内但类型不匹配

### Auto Context

显示按 date window 加载的自动 PDA 列表，支持搜索过滤。

---

## 操作按钮

| 按钮 | 功能 |
|------|------|
| 加载对照 | 从 API 加载 Auto Context |
| 新增 Path | 创建新的结构路径 |
| 导入 Path YAML | 从 YAML 文件导入 |
| 导入 groups.yaml | 从 YAML 文件导入 Group |
| 复制 Groups YAML | 复制到剪贴板 |
| 下载 Groups YAML | 下载为文件 |

---

## YAML 输出格式

```yaml
date: "2012-01-10"
instrument: "NQ"

structure_paths:
  - id: "path_20120110_001"
    start_time: "2012-01-10 09:30:00"
    end_time: "2012-01-10 10:15:00"
    primary_timeframe: "1H"
    direction: "bullish"
    smoothness: "4"
    ratio_to_prev: "1.8"
    start_origin: "prev_path_end"
    prev_path_id: "path_20120110_000"
    end_reason: "fvg"
    end_interaction: "respect"
    end_respect_type: "wick"
    end_respect_extent: "0.35"
    note: "这段行情观察要点"
    tags:
      - "ny_open"
      - "displacement"
    main_actions:
      - type: "breakout"
        ref: "bsl_20120110_001"
        note: "突破前高 BSL"
    manual_pdas:
      - id: "manual_001"
        pda_type: "bsl"
        timeframe: "1H"
        event_time: "2012-01-10 09:35:00"
        price: "2363.50"
    reconciliation:
      matched_auto: [...]
      manual_only: [...]
      auto_only_in_window: [...]

structure_groups:
  - group_id: "group_20120110_001"
    group_type: "range"
    member_paths:
      - "path_20120110_001"
      - "path_20120110_002"
```

---

## 数据持久化

- **localStorage**: 自动保存草稿，页面刷新后恢复
- **YAML 导出**: 手动导出为文件保存

---

## 后续计划

### Phase 1（当前）
- 搭建框架，主观评分录入
- 积累 50-100 个样本

### Phase 2
- 分析样本分布，调整字段设计

### Phase 3
- 设计 ratio_to_prev 自动计算公式
- 用已有样本验证公式

### Phase 4
- 公式成熟后改为自动计算 + 人工微调
- 入库到 v2_research.duckdb

---

## 技术细节

### API 端点

| 端点 | 功能 |
|------|------|
| GET /v2/pda_records | 加载自动 PDA |
| GET /v2/pda_match | 匹配手工 PDA |
| GET /v2/smoothness | 计算流畅度评分 |
| GET /price | 获取价格（用于自动填充） |

### 文件位置

- 页面: `v2/docs/layer2_recorder_v2.html`
- API: `price_lookup_api.py`
- 数据库: `v2/data/v2_research.duckdb`
- 流畅度脚本: `v2/scripts/smoothness_calculator.py`

### 配色方案

暖棕系：
- 背景: `#1e1b18`
- 面板: `#2a2520`
- 强调色: `#d4a056`（琥珀）
- 成功: `#7db87d`
- 危险: `#c87070`