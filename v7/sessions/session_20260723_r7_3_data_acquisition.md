# Session — R7.3 Guarded Data Acquisition

Date: 2026-07-23
Status: controlled data refresh complete; awaiting human interaction and visual review

## Delivered

- added an independent trusted-local Data Acquisition page outside Session,
  Replay, Pane, Workspace Transaction, Chart Adapter, and Bar Data ownership;
- retained the V4 Maintenance API as the sole Databento and DuckDB writer;
- exposed read-only ES/NQ coverage, masked environment readiness, roll report,
  and a five-gate selected-range workflow;
- required unchanged-selection Preflight, clean Dry Run, verified recoverable
  backup, exact confirmation, insert-only write, and V7-facing bar read;
- froze the provider-effective Dry Run range so later provider watermark
  movement cannot silently expand a confirmed write;
- made long maintenance commands retained background jobs with reload-safe
  status polling and one global maintenance lock;
- added current-source DB-path forwarding, local V7-origin CORS, portable API
  port selection, duplicate coverage, and restore-smoked durable backups;
- kept Tradovate import, scheduling, Economic Calendar acquisition, and chart
  runtime changes outside this milestone gate.

## Real Controlled Evidence

- current-source API opened the canonical DuckDB and served the local V7
  origin without exposing the Databento credential;
- ES Preflight/Dry Run: September 2026 contract write-eligible, `30,834`
  would-insert rows, zero duplicate and existing candidates;
- NQ Preflight/Dry Run: September 2026 contract write-eligible, `30,837`
  would-insert rows, zero duplicate and existing candidates;
- a distinct read-only restore-smoked database backup preceded each write;
- ES committed `30,834` insert-only rows and now has `6,491,818` rows through
  `2026-07-23 14:12` New York time;
- NQ committed `30,837` insert-only rows and now has `6,158,352` rows through
  `2026-07-23 14:17` New York time;
- both final duplicate scans are zero and both latest ranges are returned by
  the same `/v4/bars` provider endpoint consumed by V7.

## Automated Evidence

- `python3 -m unittest v4.tests.test_market_data_maintenance v4.tests.test_data_freshness_scripts`
- `python3 v4/tests/maintenance-service-boundary-smoke.py`
- `node v7/tests/data-acquisition-ui-harness.js`
- `node v7/tests/data-acquisition-ui-browser-harness.js`
- V7 architecture hardening, boundary, source-quality, and module-host gates.

## Acceptance

Automated and real-data gates are complete. The page changes interaction and
visuals, so H070 remains executable until explicit human acceptance.
