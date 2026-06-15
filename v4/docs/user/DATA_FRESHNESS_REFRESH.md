# V4 Data Freshness Refresh

This workflow refreshes the data needed before Journal review and Live Record entry.

Current production boundary:

- ES 1m futures data is refreshed from Databento Historical through the guarded insert-only path.
- NQ 1m full refresh remains intentionally blocked until all selected roll calendar segments are write-eligible.
- VIX daily data is refreshed from Cboe official `VIX_History.csv`.
- Manual refresh can be run any time and any number of times.
- Automatic refresh is designed for once per trading day after the regular session is closed.
- No scheduler is enabled by this document.

## Data Sources

ES 1m:

- Source: Databento Historical `GLBX.MDP3` / `ohlcv-1m`.
- Target: `v4/data/trading_data.duckdb`, table `futures_1m`.
- Write policy: insert-only and guarded.
- Freshness: Databento available end is discovered by the updater; do not assume a fixed delay.

VIX daily:

- Source: `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`
- Target: `v4/data/vix-daily.csv`.
- Schema: `DATE,OPEN,HIGH,LOW,CLOSE`.
- Write policy: merge, dedupe by `DATE`, sort ascending, atomic replace.

NQ 1m:

- Current status: guarded write for explicitly selected write-eligible ranges only.
- Latest controlled selected-range write refreshed NQ through `2026-06-12 16:59`.
- `NQZ5 -> NQH6` is resolved as `2025-12-15`, `volume_validated`.
- `NQH6 -> NQM6` is resolved as `2026-03-16`, `volume_validated`.
- Full default NQ refresh remains blocked by `NQM6 -> NQU6` `future_candidate` coverage.
- Use `v4/docs/user/ROLL_CALENDAR_WORKFLOW.md` before any NQ write discussion.

## Environment

Databento ES refresh requires:

```bash
export DATABENTO_API_KEY=...
```

Do not save API keys in repo files.

VIX refresh does not require a key.

## Manual Refresh

Manual refresh is the normal command when you want data before review, including after the 09:30-11:00 main trading window.

Dry-run plus verification:

```bash
python3 v4/scripts/daily_data_refresh.py --manual
```

Write ES and VIX after reviewing dry-run output:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py \
  --manual \
  --write-es \
  --write-vix \
  --confirm-write
```

VIX-only manual dry-run:

```bash
python3 v4/scripts/daily_data_refresh.py --manual --skip-es
```

VIX-only manual write:

```bash
python3 v4/scripts/daily_data_refresh.py \
  --manual \
  --skip-es \
  --write-vix \
  --confirm-write
```

ES-only manual dry-run:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py --manual --skip-vix
```

ES-only manual write:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py \
  --manual \
  --skip-vix \
  --write-es \
  --confirm-write
```

If Databento has not published recent bars yet, the ES stage should report the clamped available range or no-op instead of writing bad data.

## Automatic Refresh

Automatic mode is intended for one run after the regular session is closed, for example after 18:30 Eastern.

Dry-run command:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py --auto
```

Write command:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py \
  --auto \
  --write-es \
  --write-vix \
  --confirm-write
```

Auto mode uses these default files outside the repo:

- lock: `/tmp/v4_daily_data_refresh.lock`
- state: `/tmp/v4_daily_data_refresh_state.json`

After a successful auto run, another same-day auto run is skipped. Use `--force-auto` only for troubleshooting.

## Verification

Run verification only:

```bash
python3 v4/scripts/verify_data_freshness.py
```

Optional API smoke, when V4 API is already running:

```bash
python3 v4/scripts/verify_data_freshness.py --api-url http://127.0.0.1:8766
```

Verifier behavior:

- stale ES or VIX data is a warning;
- duplicate DB timestamps are a hard error;
- malformed or missing VIX CSV is a hard error;
- requested API smoke failure is a hard error;
- NQ is reported as deferred, not failed.

## Scheduler Examples

These examples are not enabled automatically.

Cron example, running at 18:45 Eastern if the machine timezone is Eastern:

```cron
45 18 * * 1-5 cd /home/leo/myworkspace/trading/backtesting && DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py --auto --write-es --write-vix --confirm-write >> /tmp/v4_daily_data_refresh.log 2>&1
```

Systemd service example:

```ini
[Unit]
Description=V4 daily data refresh

[Service]
Type=oneshot
WorkingDirectory=/home/leo/myworkspace/trading/backtesting
Environment=DATABENTO_API_KEY=...
ExecStart=/usr/bin/python3 v4/scripts/daily_data_refresh.py --auto --write-es --write-vix --confirm-write
```

Systemd timer example:

```ini
[Unit]
Description=Run V4 daily data refresh after market close

[Timer]
OnCalendar=Mon..Fri 18:45:00
Persistent=true

[Install]
WantedBy=timers.target
```

If the machine timezone is not Eastern, convert the timer time before enabling it.

## Failure Checklist

If ES refresh fails:

- confirm `DATABENTO_API_KEY` is set;
- rerun without write flags and inspect dry-run output;
- check Databento warnings;
- do not use `--allow-degraded` unless the degraded days are manually accepted.

If VIX refresh fails:

- verify Cboe CSV is reachable;
- run `python3 v4/scripts/update_vix_daily.py` directly;
- confirm the target CSV still has `DATE,OPEN,HIGH,LOW,CLOSE`.

If verification fails:

- hard errors must be fixed before relying on the data;
- stale warnings can be acceptable during weekends, holidays, or provider delay;
- duplicate DB timestamps require DB/data investigation before further writes.

If NQ refresh is considered:

- run `python3 v4/scripts/scan_roll_volume_candidates.py --report-calendar`;
- run `python3 v4/scripts/update_databento_1m.py --instrument NQ --start ... --end ... --roll-status-preflight`;
- proceed only when the selected range is write-eligible, Databento dry-run is clean, and the user explicitly confirms.

If auto mode skips unexpectedly:

- inspect `/tmp/v4_daily_data_refresh_state.json`;
- use `--force-auto` only when rerunning intentionally.

If auto mode reports a lock:

- inspect `/tmp/v4_daily_data_refresh.lock`;
- remove it only after confirming no refresh process is running.
