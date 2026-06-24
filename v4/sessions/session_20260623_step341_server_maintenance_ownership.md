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

Status: complete.

Scope:

- Instrument: `NQ`, `ES`
- Range: `2026-06-19T09:30:00` -> `2026-06-19T10:00:00`
- Chunk days: `1`
- Origin: `http://192.168.1.111:8001`
- API: `http://192.168.1.111:8766/v4/data_maintenance/run`

### NQ Dry Run

Result:

```text
ok: true
instrument: NQ
segment: NQU6 status=manual_validated
downloaded_normalized_rows: 30
candidate_rows_after_dedupe: 30
duplicate_candidate_keys: 0
existing_candidate_keys: 30
would_insert_rows: 0
write_status: dry-run; no DB changes were made
```

### ES Dry Run

Result:

```text
ok: true
instrument: ES
segment: ESU6 status=manual_validated
downloaded_normalized_rows: 30
candidate_rows_after_dedupe: 30
duplicate_candidate_keys: 0
existing_candidate_keys: 30
would_insert_rows: 0
write_status: dry-run; no DB changes were made
```

### Preflight

NQ:

```text
roll_status_preflight: ok
NQU6 status=manual_validated write_eligible=true
preflight_status: write-eligible
```

ES:

```text
roll_status_preflight: ok
ESU6 status=manual_validated write_eligible=true
preflight_status: write-eligible
```

### Guarded Write

NQ:

```text
before_rows: 6127515
before_max_ts: 2026-06-23 02:19:00
inserted_rows: 0
after_rows: 6127515
after_max_ts: 2026-06-23 02:19:00
write_status: committed insert-only transaction
```

ES:

```text
before_rows: 6460984
before_max_ts: 2026-06-23 02:18:00
inserted_rows: 0
after_rows: 6460984
after_max_ts: 2026-06-23 02:18:00
write_status: committed insert-only transaction
```

### Post-Write Verification

`server_status.py` after both writes:

```text
server_status: ok
hard_errors: 0
warnings: 0
ES rows=6460984 max_ts=2026-06-23 02:18:00
NQ rows=6127515 max_ts=2026-06-23 02:19:00
```

Bars API spot checks:

- `NQ` `2026-06-19 09:30` -> `10:00`: returned bars and requested range.
- `ES` `2026-06-19 09:30` -> `10:00`: returned bars and requested range.

### Mutex Observation

Parallel maintenance requests returned the expected busy response:

```text
returncode: 423
command: data_maintenance busy
running_action: dry_run / preflight
```

Operational decision:

- Treat maintenance actions as single-flight.
- Run production maintenance validations serially.

## Step 341.4 - Validate Calendar/VIX/Regime Flow

Status: complete.

### Economic Calendar Verify

Action:

```text
economic_verify
```

Result:

```text
ok: true
economic_calendar_verify_status: ok
rows: 24041
date_min: 2007-01-01
date_max: 2026-06-26
duplicate_keys: 0
malformed_rows: 0
```

### Economic Calendar Dry Run

Action:

```text
economic_dry_run
range: 2026-06-01 -> 2026-06-07
```

Result:

```text
ok: true
fetch_month_start: 2026-06 jun.2026
fetch_month_done: 2026-06 raw_rows=449 filtered_rows=117
economic_calendar_dry_run_status: ok
existing_rows: 24041
existing_date_min: 2007-01-01
existing_date_max: 2026-06-26
candidate_rows: 37
candidate_date_min: 2026-06-01
candidate_date_max: 2026-06-06
duplicate_candidate_keys: 0
existing_candidate_keys: 37
would_append_rows: 0
write_status: dry-run; no CSV changes were made
```

Observation:

- The dry-run took longer than simple status checks because it fetched the monthly source data.
- It did not mutate the CSV.

### VIX / Futures Freshness

Command:

```bash
python3 v4/scripts/verify_data_freshness.py --api-url http://192.168.1.111:8766
```

Result:

```text
hard_errors: 0
warnings: 1
data_freshness_status: ok
ES duplicate_timestamps: 0
NQ duplicate_timestamps: 0
ES api_status: ok
NQ api_status: ok
VIX rows: 9206
VIX latest_date: 2026-06-12
VIX duplicate_dates: 0
VIX malformed_rows: 0
warning: VIX latest date is older than 7 calendar days
```

Decision:

- Treat VIX stale warning as an operational freshness warning, not a Step 341 blocker.
- Any VIX write/update should still require backup awareness and explicit write confirmation in a later maintenance step.
- Daily regime CSV files remain covered by `server_status.py` file checks in this step.

## Step 341.5 - Decide Automation Boundary

Status: complete.

Decision:

```text
Do not enable cron/systemd timer automation yet.
```

Current operating model:

1. Run maintenance manually from the trusted server/Data Maintenance page.
2. Prefer status/verify/dry-run first.
3. Confirm a recent backup exists before any real write.
4. Run guarded write only with the explicit confirmation text.
5. Run `server_status.py` and a focused API/page spot check after write.

Rationale:

- The current server baseline is intentionally conservative.
- Step 342 backup/restore gate is not complete yet.
- Refresh Range and Economic Calendar writes are powerful enough that automation should wait for backup cadence and rollback drills.
- VIX freshness currently has a warning; automatic writes should not be introduced while freshness policy is still being tuned.

Future automation candidates:

- A daily post-market freshness verify job can be considered first because it is read-only.
- Write automation should wait until Step 342 backup/restore gate is complete.
- Any timer should write logs to a known location and surface failures through `server_status.py` or a future status panel.

## Step 341.6 - Failure-Mode Smoke

Status: pending.

## Step 341.7 - Closeout Docs

Status: pending.
