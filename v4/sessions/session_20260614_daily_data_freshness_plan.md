# Step 289 Plan - Daily Data Freshness Pipeline

Date: 2026-06-14

Branch: `feature/journal-order-recording-redesign`

Prerequisite:

- Step 281 built the guarded Databento ES 1m updater path.
- Step 283 made the V4 workspace instrument-scoped for NQ and ES.
- Step 284 added ES Daily Regime parity and kept VIX as shared market context.
- Step 285-288 built Live Records through lifecycle/review workflow.

## Goal

Before entering real Journal data-entry trials, make the market context refresh process repeatable.

Step 289 should establish a daily freshness pipeline for:

- ES 1-minute futures data in `v4/data/trading_data.duckdb`;
- shared VIX daily data in `v4/data/vix-daily.csv`;
- post-refresh verification that V4 can read the updated data.

The end state should support two explicit entry points:

- manual refresh can be run any time and any number of times by the user;
- automatic refresh runs at most once per trading day after the regular session is closed, and fills anything still missing.

## Non-Goals

- No NQ 1m write until the existing `NQH6 -> NQM6` roll conflict is resolved.
- No live market-data feed.
- No broker feed, trade execution feed, or fill import.
- No replacement of the existing DuckDB `futures_1m` schema.
- No overwrite/delete of existing futures bars.
- No API keys or secrets committed to the repo.
- No UI feature work unless needed to expose freshness verification.

## Current State

ES 1m:

- `v4/scripts/daily_databento_refresh.py` exists.
- It runs dry-run first and allows guarded ES write with `--write --confirm-write`.
- It blocks degraded Databento warnings unless `--allow-degraded` is supplied.
- It can optionally run API smoke.

NQ 1m:

- NQ remains write-disabled because the March 2026 roll conflict is unresolved.
- NQ may be scanned or dry-run only.

VIX daily:

- `v4/data/vix-daily.csv` is the shared Daily Regime VIX source.
- Current loader only requires `DATE` and `CLOSE`, but the file format includes `DATE,OPEN,HIGH,LOW,CLOSE`.
- There is no dedicated VIX refresh script yet.

## Operating Boundary

Step 289 should use a three-stage operating model:

1. Manual on-demand refresh:
   - User can run it whenever data is needed, including after the 09:30-11:00 main trading window.
   - It is idempotent and can be run repeatedly.
   - It never deletes data and never overwrites existing futures bars.
   - It reports current Databento available end and the actual freshness lag.
   - It updates VIX when newer official Cboe rows are available.

2. Automatic end-of-day refresh:
   - Runs once per trading day after the regular session is closed.
   - Uses the same guarded insert-only path as manual refresh.
   - Completes or verifies the day after Databento Historical has had time to publish the data.
   - Should be safe if the user already ran manual refresh earlier.

3. Scheduler-ready command:
   - Same refresh logic can later run from cron or systemd timer.
   - Exit code must reflect freshness failure.
   - Logs must be useful without opening the UI.
   - Scheduler activation remains deferred until manual runs are stable.

## Freshness Rules

ES 1m:

- Source: Databento Historical `GLBX.MDP3` `ohlcv-1m`.
- DB remains authoritative.
- Updater is insert-only.
- Degraded Databento condition warnings block write by default.
- Expected latest timestamp may lag real time because Databento Historical is delayed.
- Refresh should not assume a fixed delay; it should discover `metadata.get_dataset_range()` and clamp to the available end.
- Verification should report latest ES timestamp and duplicate timestamp count.

NQ 1m:

- Write disabled.
- Verification should report current latest NQ timestamp and explicitly say NQ write is deferred.

VIX daily:

- Primary source should be Cboe's official VIX history CSV:
  `https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv`.
- yfinance may remain a fallback only if the official CSV is unavailable.
- CSV schema must remain `DATE,OPEN,HIGH,LOW,CLOSE`.
- The updater should merge, dedupe by `DATE`, sort ascending, and keep existing historical rows.
- Verification should report latest VIX date and malformed/duplicate date count.

## Manual Vs Automatic Policy

Manual refresh:

- Command name should make the intent obvious, for example:
  `python3 v4/scripts/daily_data_refresh.py --manual --write-es --write-vix --confirm-write`
- It can be run unlimited times.
- It should be idempotent: if no new ES bars or VIX rows exist, it exits cleanly with a no-op report.
- It should be suitable for immediate post-session review after 09:30-11:00 if Databento has already published the requested range.
- If Databento has not published recent bars yet, it should report the available end and leave the DB unchanged.

Automatic refresh:

- Command name should make the automation path explicit, for example:
  `python3 v4/scripts/daily_data_refresh.py --auto --write-es --write-vix --confirm-write`
- It should run at most once per trading day by scheduler policy.
- It should still be idempotent, so reruns are safe when troubleshooting.
- It should use a lock file or run-state file to avoid overlapping executions.
- It should record the last successful automatic refresh date outside repo-tracked source files.

Initial decision:

- Implement the command support and docs.
- Do not enable the actual scheduler until explicitly requested.

## Substeps

### Step 289.1 - Freeze Data Freshness Boundary

Document the production boundary and acceptance criteria:

- ES write allowed through guarded Databento path.
- NQ write remains disabled.
- VIX daily CSV uses Cboe official history CSV as primary source.
- Manual refresh can run any time and unlimited times.
- Automatic refresh is designed for once per trading day after close.
- Secrets stay in environment variables.

Acceptance:

- Session doc and TODO record the boundary.
- No runtime code changes.

Step 289.1 result:

- ES 1m is the only write-enabled futures series for this pipeline.
- NQ 1m remains report-only until the `NQH6 -> NQM6` roll conflict is resolved.
- Manual refresh is an explicit first-class workflow and may be run any time, any number of times.
- Automatic refresh is a scheduler-oriented workflow intended to run once after the regular session is closed.
- Manual and automatic refresh use the same insert-only ES updater, Cboe VIX updater, and freshness verifier.
- Databento delay is not modeled as a fixed number of minutes; the pipeline must discover the available end from Databento metadata and report the actual lag.
- VIX uses Cboe official `VIX_History.csv` as the primary source; yfinance is fallback-only.
- API keys and run-state files must stay outside repo-tracked source files.
- Scheduler activation remains deferred until explicitly requested.

### Step 289.2 - Audit Existing Refresh Scripts And Data Files

Audit:

- `v4/scripts/daily_databento_refresh.py`;
- `v4/scripts/update_databento_1m.py`;
- `v4/scripts/verify_v4_bars_api.py`;
- `v4/data/vix-daily.csv`;
- Daily Regime VIX loader expectations.

Record exact gaps:

- ES already has guarded refresh.
- VIX lacks updater/verifier.
- Unified command and scheduling documentation are missing.

Acceptance:

- Audit notes are added to this session doc.
- No behavioral change.

### Step 289.3 - Implement VIX Daily Updater

Add a script such as `v4/scripts/update_vix_daily.py`:

- fetch Cboe official VIX daily OHLC CSV;
- normalize to `DATE,OPEN,HIGH,LOW,CLOSE`;
- merge with existing `v4/data/vix-daily.csv`;
- dedupe by date;
- sort ascending;
- support dry-run by default;
- require `--write --confirm-write` for file writes;
- print inserted/updated rows, first/last date, and latest date.

Acceptance:

- Running dry-run makes no file changes.
- Running write updates only `v4/data/vix-daily.csv`.
- Existing historical rows are preserved.
- CSV remains parseable by `parseVixDailyCsv()`.

### Step 289.4 - Implement Freshness Verifier

Add a script such as `v4/scripts/verify_data_freshness.py`:

- report ES/NQ row counts and max timestamps from DuckDB;
- report duplicate `(instrument, ts)` counts;
- report VIX row count, latest date, duplicate dates, malformed rows;
- optionally call V4 bars API when `--api-url` is supplied;
- support warning thresholds for stale ES and stale VIX.

Acceptance:

- Returns non-zero for malformed VIX CSV or duplicate DB timestamps.
- Returns clear warnings for stale-but-not-fatal conditions.
- Does not require network access.

### Step 289.5 - Add Unified Manual/Automatic Refresh Runner

Add a script such as `v4/scripts/daily_data_refresh.py` that orchestrates:

1. ES Databento dry-run.
2. ES Databento write only when `--write-es --confirm-write` is supplied.
3. VIX dry-run.
4. VIX write only when `--write-vix --confirm-write` is supplied.
5. Freshness verification.

Boundary:

- Default command is dry-run / verify only.
- `--manual` is unlimited and user-triggered.
- `--auto` is scheduler-oriented and should use a lock/run-state guard.
- ES and VIX writes can be enabled independently.
- NQ remains report-only.

Acceptance:

- One command gives a readable daily refresh report.
- ES warning behavior remains as strict as `daily_databento_refresh.py`.
- VIX write cannot happen accidentally.
- Manual and automatic modes have distinct output labels.

### Step 289.6 - Documentation And Scheduler Plan

Document the manual and scheduler-ready workflow:

- required env vars;
- manual dry-run/write commands;
- automatic dry-run/write commands;
- expected automatic operating time after market close;
- example cron or systemd timer;
- log file location recommendation;
- failure handling checklist.

Do not enable a real scheduler unless explicitly requested later.

Acceptance:

- User doc exists under `v4/docs/user/`.
- Planning doc notes that scheduler activation is deferred.

### Step 289.7 - Focused Tests

Add focused tests for:

- VIX CSV parse/merge/dedupe/sort;
- VIX dry-run no-write behavior;
- freshness verifier duplicate/malformed detection;
- unified runner command construction where practical.

Acceptance:

- Tests do not require network.
- Tests use temp files or fixtures.
- Existing Daily Regime loader smoke still passes.

### Step 289.8 - Real Dry-Run Verification

Run real dry-run commands:

- ES Databento dry-run if `DATABENTO_API_KEY` is available;
- VIX dry-run;
- freshness verifier.

Acceptance:

- Output clearly states latest ES timestamp and latest VIX date.
- If network/API key is unavailable, document the skipped command and keep tests green.

### Step 289.9 - Controlled Write Trial

Only after dry-run output is clean:

- run ES write if user confirms and `DATABENTO_API_KEY` is available;
- run VIX write;
- run freshness verifier after writes;
- run V4 bars API smoke if API is running.

Acceptance:

- ES DB remains insert-only and duplicate-free.
- VIX CSV latest date advances when newer data exists.
- No unrelated files are modified.

### Step 289.10 - Closeout

Close the step:

- update TODO with completed substeps;
- update session doc with actual command outputs and decisions;
- run relevant tests and `git diff --check`;
- commit the final documentation/test/code state.

Acceptance:

- Worktree clean after final commit.
- The next task can safely be real Journal data-entry trial.

## Validation Commands

Expected focused validation set:

```bash
node v4/tests/daily-regime-loader-smoke.js
python3 v4/scripts/update_vix_daily.py
python3 v4/scripts/verify_data_freshness.py
python3 v4/scripts/daily_data_refresh.py
git diff --check
```

Network/API-key dependent commands:

```bash
DATABENTO_API_KEY=... python3 v4/scripts/daily_data_refresh.py --write-es --write-vix --confirm-write
python3 v4/scripts/verify_v4_bars_api.py --instrument ES --api-url http://127.0.0.1:8766
```

## Risks

- yfinance may be temporarily unavailable or revise historical VIX OHLC.
- Databento Historical may lag wall-clock time or return degraded-condition warnings.
- Running scheduler too early can create noisy failures before the manual process is stable.
- If VIX source changes schema, the updater must fail closed rather than writing malformed CSV.

## Next Recommended Action

Execute Step 289 in order, committing after each substep if requested.
