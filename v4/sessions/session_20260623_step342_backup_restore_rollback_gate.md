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

Status: pending.

## Step 342.3 - Restore Smoke

Status: pending.

## Step 342.4 - Rollback Drill

Status: pending.

## Step 342.5 - Add Pre-Write Guard Note

Status: pending.

## Step 342.6 - Closeout Docs

Status: pending.
