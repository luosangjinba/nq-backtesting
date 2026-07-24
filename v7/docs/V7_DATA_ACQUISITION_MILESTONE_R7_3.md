# V7 Data Acquisition Milestone Gate — R7.3

Status: controlled refresh complete, awaiting human interaction and visual review

## Product boundary

R7.3 closes the market-data acquisition prerequisite for the phase-one
milestone. It supports manual ES/NQ Databento refresh only. Tradovate import,
automatic scheduling, Economic Calendar acquisition, and business analytics
are outside this gate.

Data acquisition is a trusted local administrator surface, not a chart feature:

```text
Data Acquisition Admin UI
  -> V4 guarded Maintenance API
    -> Databento range fetch
    -> insert-only DuckDB writer

V7 Replay/Chart UI
  -> Bar Data Runtime
    -> V4 bars provider (read-only)
      -> the same authoritative DuckDB
```

The admin module owns only its DOM, workflow evidence, maintenance HTTP client,
and task-status presentation. It does not import or call Replay, Pane,
Workspace Transaction, Chart Adapter, or Bar Data Runtime. The chart path does
not know Databento credentials and never writes DuckDB.

## Canonical data and credentials

- `V4_TRADING_DB` selects the authoritative DuckDB file.
- `DATABENTO_API_KEY` exists only in the V4 API process environment.
- `V4_MARKET_DATA_BACKUP_DIR` may override the durable backup directory;
  otherwise backups use
  `~/.local/share/replay-lab/backups/market-data`.
- The UI reports only configured/not-configured credential state. It never
  reads, renders, stores, or submits the secret value.
- All selected-range timestamps are New York wall time and the end is
  exclusive.

## Mandatory write gates

For one exact `{instrument,start,end,chunkDays}` selection, the operator must
complete these steps in order:

1. **Preflight** — every intersecting contract-roll segment is write-eligible.
2. **Dry Run** — Databento returns a successful dry-run marker,
   `duplicate_candidate_keys: 0`, and a finite non-negative
   `would_insert_rows` value. The returned effective half-open range is frozen;
   a later write cannot include source minutes that became available after the
   Dry Run.
3. **Verified backup** — the complete authoritative DuckDB is copied to a
   distinct pre-write file; its size matches and a read-only restore smoke can
   open `futures_1m`.
4. **Insert-only write** — the operator types exact confirmation
   `WRITE ES` or `WRITE NQ`. Existing `(instrument, ts)` rows are never updated
   or deleted.
5. **Read verification** — refreshed coverage is queried and the V7-facing
   `/v4/bars` path must return bars from the selected instrument.

Changing any selection field invalidates all prior evidence. A failed or dirty
gate keeps Write locked. A successful write clears evidence so a later write
must repeat the complete sequence.

## Contract Roll v2 prerequisite

The Roll Calendar is now an explicit prerequisite of this write chain rather
than a reminder-only report. The administrator surface derives the next ES/NQ
quarterly raw contract, scans complete CME trade dates, freezes a hash-bound
Preview, and commits through backup plus atomic replacement and audit. The
Databento updater refuses a selected range beyond the missing next transition's
hard calendar horizon. A Roll commit invalidates every prior selected-range
gate. See `V7_CONTRACT_ROLL_MILESTONE_R7_3C.md` for the binding contract.

## Long-task and recovery contract

- Only one maintenance command may run at a time.
- Preflight, Dry Run, backup, write, verification, and roll report run as
  retained background jobs.
- The start request returns immediately with a job id. The page polls retained
  status, so an HTTP request timeout does not kill or misreport a long command.
- Reloading the page resumes monitoring the retained running job.
- A terminal result remains available until another maintenance action starts
  or the API process restarts.
- Browser disposal cancels only UI polling; it cannot silently cancel or roll
  back a server-side job.

## Failure and security behavior

- Duplicate timestamps in authoritative coverage are a hard stop.
- Missing API, missing key, missing database, blocked roll, Databento warning,
  request failure, failed backup smoke, or empty V7 read is visible and does not
  unlock Write.
- Maintenance POST remains local trusted-admin functionality and requires the
  maintenance request header plus an explicitly allowed local origin.
- This surface must not be exposed as a normal public/session-user endpoint
  before a separate authenticated admin boundary exists.

## Acceptance evidence

Automated:

- `v4/tests/test_market_data_maintenance.py`
- `v4/tests/test_data_freshness_scripts.py`
- `v4/tests/maintenance-service-boundary-smoke.py`
- `v4/tests/test_roll_calendar_service.py`
- `v4/tests/test_roll_maintenance_service.py`
- `v4/tests/test_roll_volume_scanner.py`
- `v4/tests/test_databento_write_guard.py`
- `v7/tests/data-acquisition-ui-harness.js`
- `v7/tests/data-acquisition-ui-browser-harness.js`
- `v7/tests/fixtures/data-acquisition/negative/write-without-dry-run.json`
- `v7/tests/fixtures/data-acquisition/ready-verified-1440x900.png`

Real controlled evidence completed on 2026-07-23:

1. the current-source API opened the canonical DuckDB, reported masked
   credential state, and accepted the local V7 origin;
2. full ES/NQ Preflights resolved only the manually validated September 2026
   contracts and were write-eligible;
3. ES and NQ Dry Runs froze their effective half-open ranges before write,
   reported respectively `30,834` and `30,837` candidates, zero duplicate
   candidates, zero existing candidates, and no degraded warning;
4. distinct durable pre-write backups were created before ES and NQ, reopened
   read-only, found `futures_1m`, and counted respectively `12,588,499` and
   `12,619,333` rows;
5. insert-only writes committed exactly `30,834` ES and `30,837` NQ rows;
6. final coverage is ES `6,491,818` rows through `2026-07-23 14:12` and NQ
   `6,158,352` rows through `2026-07-23 14:17`; both duplicate scans are zero
   and both latest ranges are readable through `/v4/bars`.

Still required:

7. the operator manually accepts the Data Acquisition page and workflow.

Automated evidence cannot grant the final human acceptance.
