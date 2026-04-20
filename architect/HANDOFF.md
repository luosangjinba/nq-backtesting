# HANDOFF

## 当前主线

当前在做的是 `PDA review` 主线，不是 `pendulum` 主线。

核心目标：

- 维护一套可筛选、可人工修订、可手工补录、可回退的 `PDA Registry`
- 当前研究重点是：
  - `bsl`
  - `ssl`
  - `fvg`
  - `nwog`
  - `ndog`

当前共识：

- `PDA` 是原子点 / 原子区间池
- `EQH / EQL` 不是单条 PDA 的 tag，而是后续独立的组合结构层
- `daily_high / daily_low` 是客观日线极值快照，自动入库，不参与人工修订
- `bsl / ssl` 候选扫描遇到连续相邻等高 / 等低时，统一只保留最右边那个点作为代表点继续参与 swing 判断
- 这不保证该代表点一定最终入库；它仍然可能被外部更大的高点 / 更低的低点压掉
- 当前顺序是：
  1. 先把 `PDA 筛选层` 做顺
  2. 再做 `EQH / EQL` 模块

## 当前关键文件

- [readme.md](/home/leo/myworkspace/trading/backtesting/readme.md:1)
- [architect/20260417分步实施方案.md](/home/leo/myworkspace/trading/backtesting/architect/20260417分步实施方案.md:1)
- [architect/全量扫描前抽查清单.md](/home/leo/myworkspace/trading/backtesting/architect/全量扫描前抽查清单.md:1)
- [v2/docs/pda_review.html](/home/leo/myworkspace/trading/backtesting/v2/docs/pda_review.html:1)
- [price_lookup_api.py](/home/leo/myworkspace/trading/backtesting/price_lookup_api.py:1)
- [v2/scripts/scan_layer1_pda.py](/home/leo/myworkspace/trading/backtesting/v2/scripts/scan_layer1_pda.py:1)
- [v2/scripts/check_pda_scan.py](/home/leo/myworkspace/trading/backtesting/v2/scripts/check_pda_scan.py:1)
- [v2/schema/pda_registry.sql](/home/leo/myworkspace/trading/backtesting/v2/schema/pda_registry.sql:1)

## 当前正式库

- 正式 PDA 库：
  - [v2/data/v2_research.duckdb](/home/leo/myworkspace/trading/backtesting/v2/data/v2_research.duckdb:1)

- 还原点目录：
  - [v2/data/restore_points](/home/leo/myworkspace/trading/backtesting/v2/data/restore_points:1)

## 当前页面能力

`pda_review.html` 已支持：

- 浏览 `daily_high / daily_low / bsl / ssl / fvg / nwog / ndog`
- `review_role` 归类：
  - `unclassified`
  - `daily_high / daily_low`
  - `d_short_high / d_short_low`
  - `h4_short_high / h4_short_low`
  - `h1_short_high / h1_short_low`
- 单独提交 `Review Role`
- 单独提交 `Note`
- 手工新增：
  - `bsl`
  - `ssl`
  - `fvg`
- `30m` 手工补录
- 当前结果集的状态统计
- 整库还原点：
  - 创建
  - 列出
  - 恢复
- 小型快速 K 线预览：
  - 放在人工修订区右侧
  - `bsl / ssl` 画单线
  - `fvg / nwog / ndog` 画上下边界线

## 最近关键变化

- 已把“连续相邻等高 / 等低只取最右边”的规则落进 [scan_layer1_pda.py](/home/leo/myworkspace/trading/backtesting/v2/scripts/scan_layer1_pda.py:1)
- 为避免覆盖现有人工修订，没有整库重扫正式库；而是先扫临时库，再把正式库缺失的 `bsl / ssl` 自动点安全补录
- 本次已补录漏点共 `1365` 条：
  - `D`: `bsl 6` / `ssl 8`
  - `4H`: `bsl 86` / `ssl 75`
  - `1H`: `bsl 600` / `ssl 590`
- 本次补录前创建了快照：
  - [v2_research_before_equal_extreme_backfill_20260419_070716.duckdb](/home/leo/myworkspace/trading/backtesting/v2/data/restore_points/v2_research_before_equal_extreme_backfill_20260419_070716.duckdb:1)
- 之后又按 `equal_extrema_right` 规则追加补录了 `245` 条：
  - `4H`: `bsl 7` / `ssl 3`
  - `1H`: `bsl 122` / `ssl 113`
- 这次批量补录前创建了快照：
  - [v2_research_before_equal_extrema_batch_backfill_20260419_082014.duckdb](/home/leo/myworkspace/trading/backtesting/v2/data/restore_points/v2_research_before_equal_extrema_batch_backfill_20260419_082014.duckdb:1)
- `2012-04-02 02:00 4H high` 现在已作为：
  - `pda_20120402_4H_bsl_002`
  - `note = equal_extrema_right`
  入正式库
- `2012` 年 `D / 4H / 1H` 的自动短期高低点测试，已经按“同一候选 K 线内用 1 分钟极值先后顺序决定 `bsl/ssl` 轮动顺序”的新逻辑回写到正式库
- 这轮测试前创建了快照：
  - [v2_research_before_2012_auto_short_test_intrabar_order_20260419_200638.duckdb](/home/leo/myworkspace/trading/backtesting/v2/data/restore_points/v2_research_before_2012_auto_short_test_intrabar_order_20260419_200638.duckdb:1)
- 当前 `2012` 自动测试结果数量：
  - `D`: `d_short_high 45` / `d_short_low 46`
  - `4H`: `h4_short_high 167` / `h4_short_low 167`
  - `1H`: `h1_short_high 469` / `h1_short_low 469`
- 之后用户确认逻辑可行，已把这套自动短期高低点逻辑应用到正式主库全历史
- 全历史应用前创建了快照：
  - [v2_research_before_full_auto_short_apply_20260419_202657.duckdb](/home/leo/myworkspace/trading/backtesting/v2/data/restore_points/v2_research_before_full_auto_short_apply_20260419_202657.duckdb:1)
- 全历史应用后的主库数量：
  - `D`: `d_short_high 808` / `d_short_low 808` / `unclassified 401`
  - `4H`: `h4_short_high 2966` / `h4_short_low 2965` / `unclassified 1795`
  - `1H`: `h1_short_high 8105` / `h1_short_low 8105` / `unclassified 4650`
- 这轮全历史自动应用写回的记录会带：
  - `note = auto_short_apply_full`

## Linux 启动方式

```bash
cd /home/leo/myworkspace/trading/backtesting
python3 price_lookup_api.py \
  --host 127.0.0.1 \
  --port 8765 \
  --db-file trading_data.duckdb \
  --table futures_1m \
  --v2-db-file v2/data/v2_research.duckdb
```

然后打开：

- [v2/docs/pda_review.html](/home/leo/myworkspace/trading/backtesting/v2/docs/pda_review.html:1)

页面里的 `API Base`：

```text
http://127.0.0.1:8765
```

## Windows 启动方式

Windows 继续用：

- [start_all.bat](/home/leo/myworkspace/trading/backtesting/start_all.bat:1)

如果只重启 API：

- [restart_api.bat](/home/leo/myworkspace/trading/backtesting/restart_api.bat:1)

Windows 上 `pda_review` 页面地址：

```text
http://127.0.0.1:8000/v2/docs/pda_review.html
```

## 当前 git 基线

这条主线目前至少有这些关键提交：

- `133596b` `Add PDA review workflow and restore points`
- `188f1c1` `Add PDA review handoff notes`
- `e703769` `Refine PDA review roles and add daily extremes`

如果新会话要快速接上，优先参考最新这几个提交和本文件。

## 下次开新会话时怎么说

最推荐直接贴这段：

```text
继续 PDA review 主线。
参考 architect/HANDOFF.md 和 commit e703769。
API 用 8765，正式库是 v2/data/v2_research.duckdb。
我上次筛到 XXXX 年，下一步想做 XXXX。
```

如果你刚做完一轮人工筛选，再补 3 句话会更顺：

- 你筛的是哪一年
- 哪类 PDA 最常被抛出
- 哪类最常需要手工补录

## 现在最自然的下一步

有两个最合理的后续方向：

1. 继续做一年期 `PDA 筛选`
- 用当前页面持续筛选
- 收集规则不顺的地方
- 形成 `PDA 筛选阶段完成标准`

2. 在筛选阶段稳定后，开始 `EQH / EQL` 模块
- 注意它取点不只来自“已归类短期点”
- 也可能来自：
  - `unclassified`
  - `manual added`

当前建议优先顺序：

- 先继续把 `PDA 筛选` 做顺
- 再做 `EQH / EQL`
