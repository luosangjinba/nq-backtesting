# Layer2 Recorder V2

Path / Group 记录工具，用于记录 NQ 期货的结构路径和关键价格行为。

## 文件说明

| 文件 | 说明 |
|------|------|
| `layer2_recorder_v2.html` | 主工具，Path/Group 编辑器 |
| `LAYER2_RECORDER_V2_GUIDE.md` | 使用指南 |
| `pda_review.html` | PDA 审查工具 |
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

**两大部分：**

1. **End Factors（终点因素）** — 为什么停在这里
   - End Reason：遇到哪个 PDA（liquidity/fvg/ndog/nwog/ob/breaker/key_level/wick_ce/other）
   - End Respect Type：尊重类型（wick/body 或 sweep_reversal/approach_reversal）
   - End Respect Extent：尊重程度（如 0.35 = 到了 35% 位置）
   - Ref Source：引用来源（free_text/manual_pda/auto_pda）

2. **Path Actions（路径行为）** — 这段行情干了什么
   - Type：cross_liquidity / approach_or_equal_liquidity
   - Ref Source：引用来源
   - Ref ID：引用的 PDA ID

### Group（组）

多个 Path 组合成的更大结构。

- Group ID / Group Type / Direction
- Member Paths：包含的 Path 列表
- Structure Pattern：结构模式（如 2 legs / 3 drives）

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
      - end_reason: "fvg/1H"
        end_respect_type: "wick"
        end_respect_extent: "0.35"
        ref_source: "auto_pda"
        ref_id: "pda_xxx"
    
    path_actions:
      - type: "cross_liquidity"
        ref: "D BSL"
    
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
4. 添加 End Factors 记录终点原因
5. 添加 Path Actions 记录路径行为
6. 如需要，在左侧 Manual PDA 记录手工 PDA
7. 点击「下载 Groups YAML」导出数据

## 快捷操作

- **流畅度计算**：填写 Start/End Time 后点击「计算」
- **PDA 匹配**：在 Manual PDA List 中点击「匹配」
- **YAML 导入**：点击「导入 Path YAML」或「导入 groups.yaml」

## 向后兼容

旧版 YAML 中的以下字段会自动迁移：
- `main_actions` 中的 `respect_*` 类型 → `end_factors`
- `end_reason` / `end_respect_type` / `end_respect_extent` → `end_factors`
