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
