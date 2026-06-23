# V4 Server Sync Inventory and Short-Term Runbook

Date: 2026-06-23

This document is the Step 332 execution artifact for the short-term server-centered sync plan.

## Current Runtime Inventory

### Services

| Item | Current default | Server short-term decision |
|---|---:|---|
| Static V4 page | `python -m http.server`, port `8001` | server-canonical |
| V4 API | `v4/v4_api.py`, port `8766` | server-canonical |
| Data Maintenance page | `data-maintenance.html` on port `8001` | server-canonical |
| Postgres | not used by V4 bars API in this path | unknown / not required for first cut |
| DuckDB bars database | `v4/data/trading_data.duckdb` or `V4_TRADING_DB` | server-canonical |

### Data Files

| Item | Path | Decision |
|---|---|---|
| Futures 1m bars | `v4/data/trading_data.duckdb` | server-canonical |
| Economic calendar | `v4/data/economic_calendar/economic_calendar_usd_events.csv` | server-canonical |
| VIX daily/monthly | `v4/data/vix-daily.csv`, `v4/data/vix-monthly.csv` | server-canonical |
| Daily regime CSVs | `v4/data/daily-regime-nq.csv`, `v4/data/daily-regime-es.csv` | server-canonical |
| Raw/imported Tradovate files | browser-selected files, generated JSON download | client-local for now |
| Review archive JSON downloads | browser download | client-local for now |

### Browser Local State

These remain device-local in the short term:

| Key/prefix | Meaning |
|---|---|
| `v4:primary-instrument` | selected Main instrument |
| `v4:display-preferences` | display preferences |
| `v4:display-mode:<instrument>` | display mode |
| `v4:comparison-window:workspace` | Comparison Window state |
| `v4.replayHistory` | Replay History |
| `v4.dateRangeHistory` | date range history |
| `v4:pda-annotations:<instrument>` | PDA drawings |
| `v4:market-segments:<instrument>` | Segment drawings |
| `v4:order-reviews:<instrument>` | Order/Review draft data |
| `v4:live-records:<instrument>` | Live Records |
| `v4:daily-time-reviews:<instrument>` | Daily Time Review drafts |
| `v4:chart-notes:<instrument>` | Chart Notes |
| `v4:time-overlays:<instrument>` | Time overlays |
| `v4:economic-event-notes:<instrument>` | Economic event notes |
| `v4:entry-context-catalog` | Entry context catalog |

Short-term implication: two computers will share server market/calendar data but still have separate UI/workspace/drawing/review drafts unless those are imported/exported manually.

## Code Changes Completed for Server Access

### Dynamic Client API Base

`v4/src/config.js` now derives `API_BASE` from the current page hostname:

```text
http://server-host:8001/index.html -> http://server-host:8766
```

This prevents remote client browsers from calling their own `127.0.0.1:8766`.

### Data Maintenance API Base

`v4/data-maintenance.html` now also derives its API URL from the current page hostname.

### Server API Bind Host

`v4/v4_api.py` supports:

```bash
V4_API_HOST=0.0.0.0
```

Use this on a trusted LAN/VPN server so other computers can reach port `8766`.

### Data Maintenance Origin Allowlist

`v4/v4_api.py` supports:

```bash
V4_ALLOWED_WEB_ORIGINS=http://server-host:8001,http://100.x.y.z:8001
```

This is required for Data Maintenance POST actions when the web page is opened from a server hostname/Tailscale IP instead of localhost.

## Recommended Server `.env.local`

Create `v4/.env.local` on the server:

```bash
V4_API_HOST=0.0.0.0
V4_WEB_PORT=8001
V4_TRADING_DB=/var/lib/trading-data/v4/trading_data.duckdb
V4_ALLOWED_WEB_ORIGINS=http://SERVER_HOST:8001,http://TAILSCALE_IP:8001
DATABENTO_API_KEY=...
```

Do not commit this file.

## Short-Term Server Start

From the repo root on the server:

```bash
bash v4/start.sh start
```

Health checks:

```bash
curl -s http://127.0.0.1:8766/v4/health
curl -s http://SERVER_HOST:8766/v4/health
curl -s -I http://SERVER_HOST:8001/index.html
```

Client URL:

```text
http://SERVER_HOST:8001/index.html
```

Data Maintenance URL:

```text
http://SERVER_HOST:8001/data-maintenance.html
```

## Refresh and Import Ownership

Run these only on the server during normal use:

```bash
python3 v4/scripts/daily_data_refresh.py --manual
python3 v4/scripts/daily_databento_refresh.py --instrument ES --write
python3 v4/scripts/update_vix_daily.py --write
python3 v4/scripts/update_economic_calendar.py --write
python3 v4/scripts/generate_daily_regime_csv.py --instrument ES
python3 v4/scripts/generate_daily_regime_csv.py --instrument NQ
python3 v4/scripts/verify_data_freshness.py
python3 v4/scripts/verify_v4_bars_api.py --api-url http://127.0.0.1:8766
```

Avoid running refresh jobs from client machines unless explicitly debugging.

## Backup Runbook

Before daily multi-device use, back up the server canonical data:

```bash
mkdir -p /var/backups/trading/v4
cp /var/lib/trading-data/v4/trading_data.duckdb /var/backups/trading/v4/trading_data.$(date +%Y%m%d_%H%M%S).duckdb
tar -czf /var/backups/trading/v4/v4-data.$(date +%Y%m%d_%H%M%S).tar.gz -C /var/lib/trading-data v4
```

If using the repo-local data directory instead of `/var/lib/trading-data`, archive `v4/data`.

Restore test:

```bash
mkdir -p /tmp/v4-restore-test
tar -xzf /var/backups/trading/v4/v4-data.YYYYMMDD_HHMMSS.tar.gz -C /tmp/v4-restore-test
ls -lh /tmp/v4-restore-test/v4
```

## Client Usage Rules

- Normal work should use the server URL, not local `127.0.0.1`.
- Do not run data refresh jobs on client machines.
- Treat localStorage state as device-local until a future workspace sync step.
- Export/import Review JSON manually if you need to move draft objects between devices before workspace sync exists.

## Remaining Blockers Before Real Deployment

- Choose actual server hostname/IP/Tailscale IP.
- Choose actual canonical data path.
- Copy or migrate the current `trading_data.duckdb` to the server path.
- Decide whether server access is LAN-only, Tailscale-only, or public behind HTTPS.
- Run one real two-device smoke:
  - load server `index.html` from device A;
  - load server `index.html` from device B;
  - confirm both show same latest bars and economic calendar data.
