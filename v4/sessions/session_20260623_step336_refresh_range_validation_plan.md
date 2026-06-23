# Step 336 - Data Maintenance Refresh Range Real-Use Validation Plan

## Context

Step 332-335 made V4 usable from multiple machines through one server-hosted web/API/database runtime:

- `index.html` is the review/charting workspace.
- `data-maintenance.html` is the data maintenance workspace.
- `Refresh Range` is the current server-side K-line maintenance path for supported instruments/data sources.
- Tradovate file import is a Review JSON workflow and does not write K-line bars into `trading_data.duckdb`.
- Browser upload of arbitrary K-line CSV into the canonical DB is not required for the current NQ/ES multi-device workflow. It remains useful later for unsupported instruments, third-party exports, or one-off research datasets.

The user clarified that if `Refresh Range` can update the latest K-lines, then uploading K-line files from another computer is not a near-term requirement. Step 336 therefore focuses on validating and documenting the existing Refresh Range path instead of adding a new import surface.

## Goal

Confirm `data-maintenance.html` Refresh Range as the short-term standard K-line maintenance entry point:

- Runs on the server.
- Writes to the canonical `V4_TRADING_DB`.
- Is understandable from a remote browser.
- Produces useful diagnostics for no-data, invalid input, API/CORS, and server errors.
- Can be verified after write with server status and chart/API spot checks.

## Non-goals

- Do not build browser upload of arbitrary K-line CSV to DB in this step.
- Do not add automatic cron/timer refresh yet.
- Do not expand supported instruments or data vendors.
- Do not change chart/replay behavior.
- Do not move canonical data paths unless the current server validation exposes a real blocker.

## Plan

### Step 336.1 - Contract and scope

Document the product contract:

- Refresh Range updates supported K-line data through server-side maintenance APIs.
- The target DB is the server canonical `V4_TRADING_DB`.
- Remote clients should not maintain their own local K-line DB copies.
- No-data date ranges are expected to return no bars or no effective update, not necessarily a system failure.
- CSV upload is a later extension for unsupported symbols or external data.

### Step 336.2 - UI copy audit

Review `data-maintenance.html` and related frontend code for wording around:

- Refresh Range / Dry Run / Write Data.
- Server-side DB target.
- Supported instruments.
- Tradovate import being Review JSON oriented.
- Calendar/VIX/regime maintenance being separate from K-line bars.

If wording is ambiguous, update copy only; avoid changing behavior unless a real bug is found.

### Step 336.3 - Dry-run validation

Use a low-risk date range and at least one primary instrument, preferably NQ and optionally ES:

- Run dry-run from the UI or maintenance API.
- Record action, URL, date range, instrument, status, and summary.
- Confirm output distinguishes "no data for range" from hard failure.
- Confirm remote browser output is copyable enough for diagnosis.

### Step 336.4 - Write validation

Only execute write after dry-run looks safe:

- Confirm a backup or restore boundary exists.
- Run write for a narrow range.
- Verify with `v4/scripts/server_status.py`.
- Spot check `/v4/bars` for the written/updated date range.
- Load `index.html` and verify the target date range behaves as expected.

### Step 336.5 - Failure-mode validation

Exercise controlled failures without corrupting data:

- Empty/no-data date range.
- Invalid instrument or unsupported symbol.
- Invalid date input if the UI allows it.
- API unreachable or non-JSON response if feasible with existing smoke harness.

Expected result: Data Maintenance should show action, URL, status, and useful raw body/error text.

### Step 336.6 - Docs and closeout

Update:

- `v4/TODO.md` with completion notes.
- This session file with commands/results.
- `v4/docs/planning/server_sync_inventory_runbook.md` or deploy runbook if the operational wording needs correction.

Record the decision:

- Refresh Range is the short-term standard K-line maintenance path.
- Browser K-line CSV upload is moved to future backlog for external/unsupported data, not needed for current server sync.

## Acceptance Criteria

- Refresh Range dry-run result is recorded for at least one supported instrument.
- A write path is either successfully verified, or explicitly deferred with a clear safety reason.
- Post-write or current-state verification uses `server_status.py` plus a bars API/page spot check.
- Data Maintenance wording no longer implies Tradovate file import writes K-line DB data.
- Failure modes produce actionable output rather than silent failure.
- TODO/session/runbook reflect the final decision and next backlog item.

## Initial Status

Planned only. No runtime code changed yet.

## Execution Results

### Step 336.1 - Contract and scope

Confirmed product contract:

- `data-maintenance.html` is the K-line/data maintenance page.
- Refresh Range `Dry Run` and `Write Data` run through `/v4/data_maintenance/run` on the server.
- The backend command is `v4/scripts/update_databento_1m.py`.
- The backend currently accepts `instrument` values `ES` and `NQ` for Refresh Range.
- The target DB is the server-side `V4_TRADING_DB`.
- Tradovate Live Records file inputs remain browser-local Review JSON generation and do not import K-line bars into DuckDB.
- Browser upload of arbitrary K-line CSV is deferred to a future external/unsupported-instrument workflow.

### Step 336.2 - UI copy audit

`data-maintenance.html` already had the key K-line DB notice:

- Dry Run and Write Data run on this server.
- They write server-side `V4_TRADING_DB`.
- Browser file uploads in Tradovate Live Records only generate Review JSON.

Small closeout edit:

- Added explicit wording that current automatic K-line maintenance supports ES/NQ.

### Step 336.3 - Dry-run validation

Command shape:

```bash
curl -s -X POST http://127.0.0.1:8766/v4/data_maintenance/run \
  -H 'Content-Type: application/json' \
  -H 'X-V4-Maintenance-Request: data-maintenance' \
  -H 'Origin: http://127.0.0.1:8001' \
  --data '{"action":"dry_run","instrument":"NQ","start":"2026-06-19T09:30:00","end":"2026-06-19T10:00:00","chunkDays":"1"}'
```

Result:

- `ok: true`
- `returncode: 0`
- `dataset: GLBX.MDP3`
- `schema: ohlcv-1m`
- `instrument: NQ`
- `db_max_ts: 2026-06-19 12:59:00`
- `dry_run_range_et: 2026-06-19 09:30:00 -> 2026-06-19 10:00:00 (exclusive)`
- `databento_end_et: 2026-06-22 16:07:00`
- segment: `NQU6`, `status=manual_validated`
- `downloaded_normalized_rows: 30`
- `candidate_rows_after_dedupe: 30`
- `duplicate_candidate_keys: 0`
- `existing_candidate_keys: 30`
- `would_insert_rows: 0`
- `write_status: dry-run; no DB changes were made`

Decision:

- This range is safe for write-path validation because Databento and DB agree and the insert-only write should add zero rows.

### Step 336.4 - Write validation

Preflight command used the same NQ range.

Result:

- `roll_status_preflight: ok`
- segment `NQU6`, `status=manual_validated`, `write_eligible=true`
- `preflight_status: write-eligible`

Guarded write command shape:

```bash
curl -s -X POST http://127.0.0.1:8766/v4/data_maintenance/run \
  -H 'Content-Type: application/json' \
  -H 'X-V4-Maintenance-Request: data-maintenance' \
  -H 'Origin: http://127.0.0.1:8001' \
  --data '{"action":"write","instrument":"NQ","start":"2026-06-19T09:30:00","end":"2026-06-19T10:00:00","chunkDays":"1","confirmText":"WRITE NQ"}'
```

Result:

- `ok: true`
- `returncode: 0`
- `existing_candidate_keys: 30`
- `would_insert_rows: 0`
- `before_rows: 6125635`
- `before_max_ts: 2026-06-19 12:59:00`
- `inserted_rows: 0`
- `after_rows: 6125635`
- `after_max_ts: 2026-06-19 12:59:00`
- `write_status: committed insert-only transaction`

Post-write verification:

```bash
python3 v4/scripts/server_status.py \
  --web-url http://127.0.0.1:8001/index.html \
  --api-url http://127.0.0.1:8766 \
  --db v4/data/trading_data.duckdb \
  --data-dir v4/data
```

Result:

- `web_status: ok`
- `api_status: ok`
- `database_status: ok`
- `db_es_status: ok`, rows `6459105`, max `2026-06-19 12:59:00`
- `db_nq_status: ok`, rows `6125635`, max `2026-06-19 12:59:00`
- `data_dir_status: ok`
- `hard_errors: 0`
- `warnings: 0`
- `server_status: ok`

Bars API spot check:

```bash
curl -s "http://127.0.0.1:8766/v4/bars?instrument=NQ&start=2026-06-19%2009:30&end=2026-06-19%2010:00&tf=1"
```

Result:

- Returned NQ 1m bars around the requested range.
- Response included `requestedRange` with `startTs: 1781861400` and `endTs: 1781863200`.

### Step 336.5 - Failure-mode validation

Invalid instrument:

```bash
curl -s -X POST http://127.0.0.1:8766/v4/data_maintenance/run \
  -H 'Content-Type: application/json' \
  -H 'X-V4-Maintenance-Request: data-maintenance' \
  -H 'Origin: http://127.0.0.1:8001' \
  --data '{"action":"dry_run","instrument":"MES","start":"2026-06-19T09:30:00","end":"2026-06-19T10:00:00","chunkDays":"1"}'
```

Result:

- `{"error": "Invalid instrument: MES"}`

Busy lock:

- Two maintenance calls were intentionally started in parallel during validation.
- The second calls returned:
  - `ok: false`
  - `returncode: 423`
  - `command: data_maintenance busy`
  - `running_action: preflight`
  - guidance to wait or restart the API if stale.

Weekend/no-data range:

```bash
curl -s -X POST http://127.0.0.1:8766/v4/data_maintenance/run \
  -H 'Content-Type: application/json' \
  -H 'X-V4-Maintenance-Request: data-maintenance' \
  -H 'Origin: http://127.0.0.1:8001' \
  --data '{"action":"dry_run","instrument":"NQ","start":"2026-06-21T09:30:00","end":"2026-06-21T10:00:00","chunkDays":"1"}'
```

Result:

- `ok: true`
- `downloaded_normalized_rows: 0`
- `candidate_rows_after_dedupe: 0`
- `existing_candidate_keys: 0`
- `would_insert_rows: 0`
- warning: `No data found for the request you submitted. The request time range falls entirely inside a weekend.`
- `write_status: dry-run; no DB changes were made`

### Step 336.6 - Closeout decision

Refresh Range is confirmed as the short-term standard K-line maintenance path for current server-centered V4 use:

- Use Refresh Range for ES/NQ K-line dry-run/write.
- Verify write effects with `server_status.py` and a bars API or page spot check.
- Treat no-data date ranges as an expected data/domain outcome when output says zero candidate rows or weekend/no data, not as an import failure.
- Keep browser K-line CSV upload as future backlog for unsupported instruments, third-party CSV exports, or one-off datasets.

## Verification Commands

```bash
python3 v4/scripts/server_status.py --web-url http://127.0.0.1:8001/index.html --api-url http://127.0.0.1:8766 --db v4/data/trading_data.duckdb --data-dir v4/data
node v4/tests/remote-maintenance-responsive-smoke.js
git diff --check
```

Status:

- `server_status.py`: passed.
- `node v4/tests/remote-maintenance-responsive-smoke.js`: passed. Node emitted the existing typeless package warning, then `remote maintenance responsive smoke passed`.
- `git diff --check`: passed.
- Final worktree before commit: only Step 336 files modified.
