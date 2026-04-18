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

- 浏览 `bsl / ssl / fvg / nwog / ndog`
- `review_state` 三态：
  - `pending`
  - `main`
  - `parked`
- 单独提交 `Review State`
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

这次 PDA/review 主线已经提交过一次：

- commit: `133596b`
- message: `Add PDA review workflow and restore points`

如果新会话要快速接上，优先参考这个提交点。

## 下次开新会话时怎么说

最推荐直接贴这段：

```text
继续 PDA review 主线。
参考 commit 133596b。
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
- 注意它取点不只来自 `main`
- 也可能来自：
  - `parked`
  - `manual added`

当前建议优先顺序：

- 先继续把 `PDA 筛选` 做顺
- 再做 `EQH / EQL`
