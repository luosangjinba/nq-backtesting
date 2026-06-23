# V4 Server Runtime Hardening

Date: 2026-06-23

This document is the Step 335 operator runbook.

## Scope

These files are repo templates. Installing services still requires a manual server command.

Do not expose these ports to the public internet without a later HTTPS/auth step.

## Environment

Server `v4/.env.local` should contain:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/home/leo/myworkspace/trading/backtesting/v4/data/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://192.168.1.111:8001
DATABENTO_API_KEY=...
```

For a permanent server, replace `V4_TRADING_DB` with the chosen canonical path, for example:

```bash
V4_TRADING_DB=/var/lib/trading-data/v4/trading_data.duckdb
```

## systemd Templates

Templates:

```text
v4/deploy/systemd/v4-api.service
v4/deploy/systemd/v4-web.service
```

Before installing, edit the templates if the repo path or user is different. The API service intentionally runs from the repo root because `v4_api.py` starts maintenance scripts through `v4/scripts/...`; the web service runs from `v4/` so `index.html` and `data-maintenance.html` are served as static files.

Install:

```bash
sudo cp v4/deploy/systemd/v4-api.service /etc/systemd/system/v4-api.service
sudo cp v4/deploy/systemd/v4-web.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
sudo systemctl enable --now v4-api.service
sudo systemctl enable --now v4-web.service
```

Operate:

```bash
systemctl status v4-api.service
systemctl status v4-web.service
sudo systemctl restart v4-api.service
sudo systemctl restart v4-web.service
journalctl -u v4-api.service -f
journalctl -u v4-web.service -f
```

Uninstall:

```bash
sudo systemctl disable --now v4-api.service v4-web.service
sudo rm -f /etc/systemd/system/v4-api.service /etc/systemd/system/v4-web.service
sudo systemctl daemon-reload
```

## Status Check

Run from the repo root:

```bash
python3 v4/scripts/server_status.py \
  --web-url http://192.168.1.111:8001/index.html \
  --api-url http://192.168.1.111:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

The script is read-only. It checks service reachability, DB coverage, and key data files.

## Backup

Run before write-heavy maintenance:

```bash
python3 v4/scripts/backup_v4_data.py \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data \
  --backup-dir /var/backups/trading/v4 \
  --restore-smoke
```

If `/var/backups/trading/v4` is not writable yet:

```bash
sudo mkdir -p /var/backups/trading/v4
sudo chown -R "$USER":"$USER" /var/backups/trading
```

## Daily Operation Boundary

- Client computers open `http://SERVER_HOST:8001/index.html`.
- Data Maintenance runs on `http://SERVER_HOST:8001/data-maintenance.html`.
- Refresh/write actions should run on the server only.
- Do not run refresh scripts from client machines during normal use.
- UI/workspace/localStorage state remains device-local.
- Use Display Setup -> UI Scale for per-device screen-size adjustment.

## Manual Refresh Commands

Dry-run first:

```bash
python3 v4/scripts/daily_data_refresh.py --manual
python3 v4/scripts/verify_data_freshness.py --api-url http://127.0.0.1:8766
```

Write actions require explicit confirmation flags and should be preceded by backup.

Example confirmed writes:

```bash
python3 v4/scripts/daily_data_refresh.py --manual --write-es --write-vix --confirm-write
python3 v4/scripts/daily_databento_refresh.py --write --confirm-write --verify-api --api-url http://127.0.0.1:8766
python3 v4/scripts/update_vix_daily.py --write --confirm-write
python3 v4/scripts/update_economic_calendar.py --from-date YYYY-MM-DD --to-date YYYY-MM-DD --write --confirm-write
```
