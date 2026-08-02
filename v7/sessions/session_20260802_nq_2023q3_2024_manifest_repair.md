# Session — 2026-08-02 — NQ 2023 Q3–2024 Manifest Repair

## Request

Execute the next step after the raw bilateral audit: build the generic guarded
historical-repair boundary and repair the four reviewed intervals.

## Result

- added a reviewed YAML repair registry and a generic manifest-driven service
  without changing the accepted hard-coded NQ 2025 compatibility path;
- kept reviewed plan parsing/static validation separate from the runtime
  Preview/Commit/Verify service and the Databento CLI adapter;
- exposed Preview, Commit, and Verify only through fixed-plan V4 Maintenance
  API actions; arbitrary API plan paths are rejected;
- bound plan revision, exact confirmation, database/calendar revisions,
  Databento conditions, staged CSV hashes, and reviewed frame fingerprints in
  a retained 30-minute Preview;
- re-downloaded all four raw slices and exactly reproduced their reviewed
  fingerprints before making the Preview commit-eligible;
- created and independently opened a full pre-write DuckDB backup, backed up
  the roll calendar, and transactionally replaced only the four intervals;
- replaced 14,321 rows with 14,517 raw rows and restored 196 minute timestamps;
- added the six audited 2023 Q3–2024 Q4 NQ calendar events, including the two
  retained Q3/Q4 2024 boundaries;
- verified 12,651,020 total database rows, 6,158,777 NQ rows, zero NQ duplicate
  timestamps, and exact final interval counts and fingerprints;
- verified all four repaired windows through `/v4/bars` and representative
  `1h`/`4h` ETH reads through `/v4/projected_history`.

## Recovery Evidence

- database backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260802_134801_834602Z.duckdb`
- calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.nq-2023q3-2024.20260802T094802-0400.yml`
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-nq-2023q3-2024-wQD6_J0lrb6SQJSgvtucIkrZ/manifest.json`
- append-only audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`
- final calendar revision:
  `adf9ae6191a313c50517646b32b88088bccb708bc240e3d6c346ef1581c71250`

## Verification

- 10/10 focused new and compatibility repair tests passed, including
  fingerprint drift, wrong confirmation, and post-write rollback controls;
- Maintenance boundary smoke and `git diff --check` passed;
- full V4 unittest discovery passed 93 of 97 tests; the four errors are
  pre-existing architecture-review tests that still call private functions
  already moved from `v4_api.py` into service modules, not failures on the
  repair path;
- the V4 API was restarted from current source and remains healthy on `8766`.

## Continuation

The recent 2023 Q3–2024 batch is complete. The next data-integrity work is a
separate read-only raw bilateral review of the eight red legacy prescreen
windows, accounting for historical session schedules and event confounders
before proposing any additional repair manifest.
