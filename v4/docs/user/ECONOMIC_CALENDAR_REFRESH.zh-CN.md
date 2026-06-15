# Economic Calendar 更新流程

V4 的经济日历数据文件是：

```text
v4/data/economic_calendar/economic_calendar_usd_events.csv
```

当前数据源使用 ForexFactory 日历页面。更新脚本默认只读；正式写入必须显式使用 `--write --confirm-write`，并且写入前会自动备份原 CSV。

## 当前边界

- 当前主 CSV 已有历史：`2007-01-01` 到 `2025-01-05`
- 正常补数起点：`2025-01-06`
- 写入策略：append-only
- 旧日期的差异只报告，不自动覆盖
- `forecast` / `previous` 当前可能为空，因为 ForexFactory 列表页测试中没有稳定暴露这两列

## 依赖

经济日历抓取需要 Chrome 和 Selenium。

```bash
python -m pip install -r v4/requirements-data.txt
```

如果只运行 verifier，不需要访问网络。

## 查看当前状态

```bash
python v4/scripts/verify_economic_calendar.py
```

正常输出会显示：

```text
economic_calendar_verify_status: ok
rows: ...
date_min: ...
date_max: ...
duplicate_keys: 0
malformed_rows: 0
```

## Dry Run

预览从 `2025-01-06` 到今天需要补多少行：

```bash
python v4/scripts/update_economic_calendar.py \
  --dry-run \
  --from-date 2025-01-06 \
  --to-date 2026-06-15
```

Dry-run 会抓取对应月份，写 raw cache 到：

```text
v4/data/economic_calendar/forex_factory_raw/
```

但不会修改主 CSV。

重点看这些字段：

- `existing_date_max`
- `requested_range`
- `months`
- `candidate_rows`
- `would_append_rows`
- `skipped_overlap_rows`
- `actual_nonempty`
- `forecast_nonempty`
- `previous_nonempty`

## Write

确认 dry-run 输出后执行写入：

```bash
python v4/scripts/update_economic_calendar.py \
  --write \
  --confirm-write \
  --from-date 2025-01-06 \
  --to-date 2026-06-15
```

写入前会备份到：

```text
v4/data/economic_calendar/backups/
```

写入只追加：

- key 不存在
- 且 `event_date` 晚于当前主 CSV 最新日期

不会覆盖旧日期里的事件。

## Data Maintenance 页面

打开：

```text
http://127.0.0.1:8001/data-maintenance.html
```

Economic Calendar 区块提供：

- `Status`：运行 verifier，查看当前范围
- `Dry Run`：预览补数
- `Verify`：重新验证主 CSV
- `Write Calendar`：正式写入

页面写入前必须在确认框输入：

```text
WRITE ECONOMIC
```

## 常见问题

如果提示缺少 Selenium：

```text
selenium is required for ForexFactory fetching
```

安装：

```bash
python -m pip install -r v4/requirements-data.txt
```

如果页面抓取失败，先确认：

- 当前机器可以访问 `https://www.forexfactory.com`
- Chrome 可以启动
- ForexFactory 页面结构没有变化

如果 `forecast_nonempty` 和 `previous_nonempty` 为 0，这是当前数据源限制，不代表抓取失败。Calendar UI 主要依赖日期、时间、标题和 impact，这些字段仍可正常使用。

## 验证建议

每次写入后运行：

```bash
python v4/scripts/verify_economic_calendar.py
```

然后重启 V4 API，使 `/v4/economic_events` 读取新的 CSV。

