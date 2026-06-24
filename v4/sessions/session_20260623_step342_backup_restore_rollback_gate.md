# Step 342 - Backup, Restore, and Rollback Gate

## Goal

Make backup, restore smoke, and rollback explicit gates before server maintenance writes become routine or automated.

Step 342 builds on Step 341's decision:

```text
Writes remain manual until backup/restore is verified.
```

## Baseline

Current conservative server baseline:

```text
Web URL: http://192.168.1.111:8001/index.html
API URL: http://192.168.1.111:8766
Canonical DB: v4/data/trading_data.duckdb
Canonical data dir: v4/data
```

## Step 342.1 - Select Backup Destination

Status: complete.

Short-term smoke backup destination:

```text
/tmp/v4-step342-backups
```

Rationale:

- Writable in the current environment.
- Outside the live data directory.
- Safe for validating the backup script and restore smoke without requiring root/system setup.

Production backup destination:

```text
/var/backups/trading/v4
```

or an external disk / network backup location.

Production notes:

- `/tmp/v4-step342-backups` is not durable and is not a production backup destination.
- Before daily reliance, choose a persistent location outside the repo and outside the live data directory.
- Once `data/users/default` exists, it must be included in the backup scope.

Retention recommendation for the first production cut:

```text
Keep at least 7 daily backups and 4 weekly backups.
```

This can be refined after actual disk usage is known.

## Step 342.2 - Backup Canonical Data

Status: complete.

Command:

```bash
python3 v4/scripts/backup_v4_data.py \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data \
  --backup-dir /tmp/v4-step342-backups \
  --label step342
```

Result:

```text
backup_status: ok
database_source: /home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
data_dir_source: /home/leo/myworkspace/trading/backtesting/v4/data
database_backup: /tmp/v4-step342-backups/trading_data.20260623_204307-step342.duckdb
data_backup: /tmp/v4-step342-backups/v4-data.20260623_204307-step342.tar.gz
database_backup_size: 945303552
data_backup_size: 211705951
```

Observation:

- Full `v4/data` archive completed successfully but took several minutes.
- This reinforces that production backups should be scheduled deliberately and stored outside `/tmp`.

## Step 342.3 - Restore Smoke

Status: complete.

Restore target:

```text
/tmp/v4-step342-restore-test
```

Commands:

```bash
mkdir -p /tmp/v4-step342-restore-test
tar -xzf /tmp/v4-step342-backups/v4-data.20260623_204307-step342.tar.gz \
  -C /tmp/v4-step342-restore-test
python3 v4/scripts/server_status.py \
  --skip-http \
  --db /tmp/v4-step342-restore-test/data/trading_data.duckdb \
  --data-dir /tmp/v4-step342-restore-test/data
```

Result:

```text
database_status: ok
db_es_status: ok
db_es_detail: ES rows=6460984 max_ts=2026-06-23 02:18:00
db_nq_status: ok
db_nq_detail: NQ rows=6127515 max_ts=2026-06-23 02:19:00
data_dir_status: ok
economic_calendar/economic_calendar_usd_events.csv ok
vix-daily.csv ok
vix-monthly.csv ok
daily-regime-nq.csv ok
daily-regime-es.csv ok
hard_errors: 0
server_status: ok
```

Note:

- Restore smoke is a data restore check, so it uses `--skip-http`.
- A first run without `--skip-http` confirmed the restored DB/files were readable, but web/API checks failed with environment-level `Operation not permitted` network errors in the command sandbox. That was not a restore-data failure.

## Step 342.4 - Rollback Drill

Status: complete.

Rollback has two separate meanings:

1. Runtime fallback: stop relying on the server URL and run the same V4 app locally again.
2. Data restore: replace the canonical server data directory with a known-good backup.

Runtime fallback drill:

```bash
bash v4/start.sh stop
bash v4/start.sh start
python3 v4/scripts/server_status.py \
  --web-url http://127.0.0.1:8001/index.html \
  --api-url http://127.0.0.1:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

Then open:

```text
http://127.0.0.1:8001/index.html
```

Data restore drill for the current repo-local baseline:

```bash
mkdir -p /tmp/v4-restore-test
tar -xzf /tmp/v4-step342-backups/v4-data.20260623_204307-step342.tar.gz \
  -C /tmp/v4-restore-test
python3 v4/scripts/server_status.py \
  --skip-http \
  --db /tmp/v4-restore-test/data/trading_data.duckdb \
  --data-dir /tmp/v4-restore-test/data
```

If the restore smoke passes, replace the live `v4/data` only during a maintenance window:

```text
1. Stop V4 API/web runtime.
2. Move the current live data directory aside with a timestamp.
3. Move the restored `data` directory into `v4/data`.
4. Start runtime.
5. Run `server_status.py` against the live DB/data path.
6. Load `index.html` and spot-check ES/NQ bars.
```

Browser workspace caveat:

- Browser `localStorage` is origin-scoped. State created under `http://192.168.1.111:8001` will not automatically appear under `http://127.0.0.1:8001`.
- Do not clear browser site data during rollback.
- Before switching origins for serious work, export Review JSON from the active browser if you need to carry PDA, Segment, Order Setup, Live Record, or review drafts to another origin/device.
- If returning to the same server URL later, the old server-origin browser state should still be available unless browser data was cleared.

## Step 342.5 - Add Pre-Write Guard Note

Status: pending.

## Step 342.6 - Closeout Docs

Status: pending.
