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

Status: pending.

## Step 342.5 - Add Pre-Write Guard Note

Status: pending.

## Step 342.6 - Closeout Docs

Status: pending.
