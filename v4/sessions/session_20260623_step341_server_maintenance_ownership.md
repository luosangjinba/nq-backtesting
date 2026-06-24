# Step 341 - Server Maintenance and Refresh Ownership

## Goal

Make server-side maintenance ownership explicit for the current single-user LAN baseline.

Step 341 focuses on operational safety:

- which Data Maintenance actions are read-only, dry-run, write, or restart;
- which actions are trusted-admin only;
- whether Refresh Range production flow works for ES/NQ;
- whether calendar/VIX/regime maintenance paths are understood;
- whether failure modes produce useful diagnostics;
- whether runbooks clearly say normal refresh/import runs on the server only.

## Baseline

Current Step 340A server baseline:

```text
Web URL: http://192.168.1.111:8001/index.html
Data Maintenance URL: http://192.168.1.111:8001/data-maintenance.html
API URL: http://192.168.1.111:8766
DB: v4/data/trading_data.duckdb
Data dir: v4/data
Access: trusted LAN only
```

Initial health checks before Step 341 execution:

```text
GET /v4/health: ok
server_status.py: ok
ES rows=6460984 max_ts=2026-06-23 02:18:00
NQ rows=6127515 max_ts=2026-06-23 02:19:00
```

## Step 341.1 - Inventory Maintenance Actions

Status: complete.

Audited `v4/v4_api.py` and `v4/data-maintenance.html`.

### Action Categories

Read-only / status:

- `environment_status`
- `roll_report`
- `verify`
- `verify_api`
- `api_smoke`
- `economic_status`
- `economic_verify`

Dry-run / preview:

- `roll_scan_volume`
- `confirm_roll_preview`
- `preflight`
- `dry_run`
- `economic_dry_run`

Write / mutating:

- `environment_write`
- `environment_delete`
- `confirm_roll_write`
- `write`
- `economic_write`

Runtime control:

- `api_restart`

### Notes

- `write` runs `v4/scripts/update_databento_1m.py` and requires confirmation text `WRITE <instrument>`.
- `economic_write` runs `v4/scripts/update_economic_calendar.py` and requires `WRITE ECONOMIC`.
- `confirm_roll_write` requires explicit write flags and roll confirmation fields.
- `environment_write/delete` modifies server-local `v4/.env.local` and process environment.
- `api_restart` can terminate active maintenance work and schedule API restart.
- `/v4/data_maintenance/run` is guarded by `X-V4-Maintenance-Request: data-maintenance` and allowed origin checks.

## Step 341.2 - Confirm Admin Boundary

Status: complete.

Decision:

```text
Data Maintenance is trusted-admin functionality.
```

Current short-term boundary:

- Access is limited to the trusted LAN server baseline.
- The expected operator is the owner/admin user.
- No public internet exposure.
- No ordinary multi-user access.
- No login boundary exists yet, so network trust is the short-term boundary.

Why this matters:

- `environment_write` and `environment_delete` mutate server-local `.env.local`.
- `write` can insert bars into the canonical DuckDB.
- `economic_write` can append to the economic calendar CSV.
- `confirm_roll_write` can modify roll calendar decisions.
- `api_restart` can interrupt active maintenance and restart the API.

Future multi-user requirement:

- Data Maintenance must become admin-only before real multi-user access.
- Normal users should not be able to run refresh writes, env writes, roll writes, or API restart.
- Public internet exposure requires HTTPS/reverse proxy/session/CSRF/upload hardening first.

## Step 341.3 - Validate Refresh Range Production Flow

Status: pending.

## Step 341.4 - Validate Calendar/VIX/Regime Flow

Status: pending.

## Step 341.5 - Decide Automation Boundary

Status: pending.

## Step 341.6 - Failure-Mode Smoke

Status: pending.

## Step 341.7 - Closeout Docs

Status: pending.
