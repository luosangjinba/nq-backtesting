# Layer2 Recorder V2

Path / Group 记录工具，用于记录 NQ 期货的结构路径和关键价格行为。

## 文件说明

| 文件 | 说明 |
|------|------|
| `layer2_recorder_v2.html` | 主工具，Path/Group 编辑器 |
| `LAYER2_RECORDER_V2_GUIDE.md` | 使用指南 |
| `pda_review.html` | PDA 审查工具 |
| `pda_manager.html` | PDA Manager，CRUD + 搜索过滤 |
| `kline_viewer.html` | K线查看器（KLineChart v9.8.12），支持 PDA overlay |
| `params_quick_ref.html` | 参数快速参考 |
| `yamls/` | YAML 示例文件 |
| `snap/` | 截图存档 |
| `archive/` | 旧文档归档 |

## 核心概念

### Path（路径）

一段有明确起点和终点的行情记录。

**基础字段：**
- Path ID / Primary TF / Direction
- Start Time / End Time
- 流畅度 / Ratio to Prev
- Start Origin / Prev Path ID

**核心部分：**

1. **Path Encounters（路径遭遇）** — 这段行情遇到了什么 PDA
   - Encounter Reason：遇到哪个 PDA（liquidity/fvg/ndog/nwog/ob/ob_last_bar/breaker/key_level/wick_ce/other）
   - Respect Type：尊重类型
     - liquidity：突破 / 接近
     - fvg/ndog/nwog/ob/ob_last_bar/breaker/key_level/wick_ce：影线尊重 / 实体尊重
   - Respect Extent：尊重程度（如 0.35 = 到了 35% 位置）
   - Ref Source：引用来源（free_text/manual_pda/auto_pda）

### Group（组）

多个 Path 组合成的更大结构。

- Group ID / Group Type / Direction
- Member Paths：包含的 Path 列表
- Structure Pattern：结构模式（如 2 legs / 3 drives）

### Manual PDA - OB（订单块）

- **Analysis TF**：下拉选择（1m/5m/15m/30m/1H/4H/1D），全页面统一
- **Direction**：bullish / bearish
- **Start / End Time**：手工录入，支持紧凑格式（`201201091120` → `2012-01-09 11:20`），失焦自动对齐到 TF 整数倍边界
- **Price High / Low**：按 K 线柱聚合计算——枚举 Start 到 End 范围内每根 K 线，取 max(high) 和 min(low)；Start=End 时为单根 K 线
- **取值**：每次点击都重新计算，修改时间后可反复取值

### 时间周期统一

全页面时间周期选项统一为 `TF_OPTIONS`（1m/5m/15m/30m/1H/4H/1D），兼容旧数据格式（15M/30M/D）。

## 数据存储

- **YAML 为真相源**：所有数据以 YAML 格式存储
- **DuckDB 只做对照**：用于匹配和验证自动 PDA 记录
- **LocalStorage 草稿**：浏览器本地保存未提交的编辑

## YAML 结构示例

```yaml
date: "2012-01-10"
instrument: "NQ"

structure_paths:
  - id: "path_20120110_001"
    start_time: "2012-01-10 09:30:00"
    end_time: "2012-01-10 10:15:00"
    primary_timeframe: "1H"
    direction: "bullish"
    smoothness: 75
    
    end_factors:
      - end_reason: "liquidity"
        end_respect_type: "breakthrough"
        end_respect_extent: "1.0"
        ref_source: "manual_pda"
        ref_id: "manual_001"
    
    manual_pdas: []

structure_groups:
  - group_id: "group_20120110_001"
    group_type: "impulse"
    member_paths:
      - "path_20120110_001"
```

## 使用流程

1. 点击「加载对照」从 DuckDB 加载自动 PDA 数据
2. 点击「新增 Path」创建新路径
3. 填写基础信息（时间、方向、流畅度等）
4. 添加 Path Encounters 记录遭遇的 PDA
5. 如需要，在左侧 Manual PDA 记录手工 PDA
6. 点击「下载 Path YAML」或「下载 Groups YAML」导出数据

## 快捷操作

- **流畅度计算**：填写 Start/End Time 后点击「计算」
- **PDA 匹配**：在 Manual PDA List 中点击「匹配」
- **YAML 导入**：点击「导入 Path YAML」或「导入 groups.yaml」

## 向后兼容

旧版 YAML 中的以下字段会自动迁移：
- `main_actions` 中的 `respect_*` 类型 → `end_factors`
- `end_reason` / `end_respect_type` / `end_respect_extent` → `end_factors`
- `path_actions` 中的 `cross_liquidity` → `end_factors`（end_reason=liquidity, respect_type=breakthrough）
- `path_actions` 中的 `approach_or_equal_liquidity` → `end_factors`（end_reason=liquidity, respect_type=approach）
- `sweep_reversal` → `breakthrough`，`approach_reversal` → `approach`
