# V4 数据维护页面使用说明

这个页面用于替代容易输错的长命令，集中处理数据维护、手动换季、dry-run、写库和验证。

打开地址：

```text
http://127.0.0.1:8001/data-maintenance.html
```

需要先确保服务正在运行：

- V4 API：`http://127.0.0.1:8766/v4/health`
- Web 服务：`http://127.0.0.1:8001`
- 如果要跑 Databento dry-run 或写库，API 进程环境里必须有 `DATABENTO_API_KEY`
- 推荐把本机参数写入 `v4/.env.local`，启动脚本会自动加载；说明见 `v4/docs/user/LOCAL_ENVIRONMENT.zh-CN.md`

从仓库目录启动或重启：

```bash
bash v4/start.sh restart
```

## 页面区域

Roll Calendar：

- `Roll Report`：查看当前哪些 roll entries 需要处理。
- `Preview Confirm`：只预览换季确认会怎样改 calendar，不写文件。
- `Write Confirm`：把换季确认写入 `futures_roll_calendar.yml`。

Refresh Range：

- `Preflight`：检查选定时间范围内的 roll segments 是否全部 write-eligible。
- `Dry Run`：从 Databento 下载候选数据，只报告将会写入什么，不写库。
- `Write Data`：在 clean dry-run 后写入缺失数据。

Verification：

- `Verify Data`：检查 DB/VIX freshness，不跑 API smoke。
- `Verify Data + API`：检查 DB/VIX freshness，并验证 `/v4/bars`。

Economic Calendar：

- `Status`：查看当前 economic calendar CSV 范围和完整性。
- `Dry Run`：预览 ForexFactory economic calendar 会追加多少行。
- `Verify`：验证主 CSV header、日期、timestamp、重复 key 和排序。
- `Write Calendar`：输入 `WRITE ECONOMIC` 后执行 append-only 写入。

详细说明见：

```text
v4/docs/user/ECONOMIC_CALENDAR_REFRESH.zh-CN.md
```
- `ES API Smoke` / `NQ API Smoke`：单独验证 API 能否读到最新 ES/NQ bars。

## 手动换季流程

如果你的交易系统已经切到新合约，例如 June 2026：

- ES：`ESM6 -> ESU6`
- NQ：`NQM6 -> NQU6`

每个品种按这个顺序做：

1. 在 `Preset` 里选择对应 preset。
2. 确认 `Roll date` 是你实际切换的日期，例如 `2026-06-15`。
3. 确认 `Status` 是 `manual_validated`。
4. 检查 `Note` 里写清楚为什么确认这次换季。
5. 点击 `Preview Confirm`。
6. 认真看输出里的 diff，只确认目标 entry 被修改。
7. diff 正确后，再点 `Write Confirm`。
8. 最后点 `Roll Report`，确认该 entry 不再以 `future_candidate` 出现。

不要跳过 preview。`Write Confirm` 是真实写入 calendar。

## 数据刷新流程

换季确认完成后，再刷新数据：

1. 在 `Refresh Range` 里选择 `ES` 或 `NQ`。
2. 设置 `End`，它是 exclusive end。例如 `2026-06-16T00:00:00` 表示刷新到 6 月 16 日 00:00 之前。
3. 点击 `Preflight`。
4. 只有看到 `preflight_status: write-eligible` 才继续。
5. 点击 `Dry Run`。
6. 检查输出：
   - `duplicate_candidate_keys`
   - `existing_candidate_keys`
   - `would_insert_rows`
   - `would_insert_first_ts`
   - `would_insert_last_ts`
   - `databento warnings`
7. 如果 dry-run 输出合理，在确认框输入：
   - ES 写库输入 `WRITE ES`
   - NQ 写库输入 `WRITE NQ`
8. 点击 `Write Data`。
9. 写入后点击 `Verify Data + API`。

确认文字必须完全匹配，否则页面不会执行写库。

## 输出怎么判断

比较好的结果：

- `preflight_status: write-eligible`
- `duplicate_candidate_keys: 0`
- `write_status: committed insert-only transaction`
- `data_freshness_status: ok`
- `api_status: ok`

表示阻断或需要处理的结果：

- `preflight_status: blocked`
- `WARNING blocked`
- `future_candidate`
- `inferred_no_db_overlap`
- `inferred_volume_conflict`

Databento 可能会提示某些日期是 `degraded`。这不一定代表数据不能用，但必须人工判断，不要静默忽略。

## 安全规则

- 先 `Preview Confirm`，再 `Write Confirm`。
- 先 `Preflight`，再 `Dry Run`。
- 先 `Dry Run`，再 `Write Data`。
- 不要跨过 `future_candidate` 的 roll boundary 写库。
- 如果 roll date 或刷新范围不确定，不要点写入按钮。
- 页面后端是白名单动作，不会执行任意 shell 命令。

## 当前 NQ 状态

当前已知状态：

- `NQZ5 -> NQH6`：`2025-12-15`，`volume_validated`
- `NQH6 -> NQM6`：`2026-03-16`，`volume_validated`
- NQ 已通过 guarded selected-range write 刷新到 `2026-06-12 16:59`
- 如果你的交易系统在 `2026-06-15` 切到 `NQU6`，需要手动确认 `NQM6 -> NQU6`

`NQM6 -> NQU6` 确认为 `manual_validated` 后，NQ 才能 preflight/dry-run 跨过 June roll boundary。

## 常见问题

页面显示 `Failed to fetch`：

- 检查 API：`curl -s http://127.0.0.1:8766/v4/health`
- 重启服务：`bash v4/start.sh restart`

Databento dry-run/write 失败：

- 确认 API 进程环境里有 `DATABENTO_API_KEY`
- 修改环境变量后要重启 API
- 如果 Databento 提示 available range 或 license window，缩小 `End` 时间

验证有 warning 但没有 hard error：

- ES/VIX stale warning 在周末、假日或数据源延迟时可能可以接受
- duplicate timestamps 不能接受，必须先排查
