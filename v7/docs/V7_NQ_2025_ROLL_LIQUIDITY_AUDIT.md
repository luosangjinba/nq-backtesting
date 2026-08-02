# V7 NQ 2025 Roll Liquidity Audit

Status: audit complete; guarded historical repair executed and verified

Audit date: 2026-08-02

## Outcome

The accepted 2025 NQ legacy roll boundaries are not suitable authorities for
historical Replay. The March and June boundaries select the new quarterly
contract before it has adequate minute liquidity, and all four accepted
boundaries either split a CME session or start from a legacy boundary that was
not derived through the current volume-evidence workflow.

Do not replace the local roll calendar with Databento `NQ.v.0` verbatim.
Databento's direct volume-continuous mapping is liquid and reproducible, but its
mapping changes at `00:00 UTC`. That is `20:00` New York during daylight-saving
time and `19:00` New York during standard time, so every 2025 transition splits
the CME session that began at `18:00`.

Keep raw quarterly-contract acquisition and the R7.3c session-aligned policy:

1. aggregate old/new volume by complete CME trade date;
2. require two consecutive complete new-contract-dominant trade dates for an
   automatic volume confirmation;
3. make an accepted trade date effective at its prior `18:00` session open;
4. retain the expiry-week Monday `00:00` hard horizon and require explicit
   manual evidence when strict volume dominance would occur after it;
5. never let a Databento day with a non-`available` dataset condition satisfy
   automatic confirmation;
6. treat FXReplay only as an external reasonableness check.

The audit phase was read-only. The follow-up guarded repair was executed on
2026-08-02 through the V4 Maintenance API after retained Preview evidence,
backup, and exact confirmation.

## Evidence Sources

- Databento `GLBX.MDP3` / `ohlcv-1m` raw quarterly contracts;
- Databento continuous-to-instrument symbology resolution for `NQ.v.0`;
- read-only queries against the current authoritative DuckDB;
- the user's independently observed FXReplay boundaries.

The raw scan used the production scanner's CME trade-date grouping and the
production completeness threshold of at least 1,200 distinct minutes with
open/close proximity checks. A normal full session has 1,380 minute slots.

Databento reported `2025-09-17` as `degraded`; all other queried dates used by
the decision were `available`. September therefore requires explicit manual
confirmation even though its dominant-contract evidence remains wide and is
confirmed again on the available 2025-09-18 trade date.

## Raw-Contract Liquidity Result

`First dominant trade date` remains diagnostic evidence. The accepted
historical boundary must also satisfy the existing expiry-week hard horizon.

| Transition | First dominant trade date | Dominance ratio | Accepted trade-date evidence | New minutes | Recommended effective (ET) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `NQH5 -> NQM5` | 2025-03-18 | 1.8857 | 2025-03-17: 0.8369 ratio, complete and manually accepted at the hard horizon | 1,380 | 2025-03-16 18:00 |
| `NQM5 -> NQU5` | 2025-06-16 | 1.5484 | first dominant session; confirmed again 2025-06-17 | 1,378 | 2025-06-15 18:00 |
| `NQU5 -> NQZ5` | 2025-09-16 | 3.3963 | retain 2025-09-15: 0.9888 ratio and session-aligned boundary | 1,375 | 2025-09-14 18:00 |
| `NQZ5 -> NQH6` | 2025-12-15 | 1.2602 | first dominant session; confirmed again 2025-12-16 | 1,380 | 2025-12-14 18:00 |

The first two boundaries explain the visible Replay defect directly:

- on trade date 2025-03-14 the early `NQM5` contract had only 59,982 volume,
  1,222 minute bars, and 8.74% of the old contract's volume;
- on trade date 2025-06-13 the early `NQU5` contract had only 54,724 volume,
  1,273 minute bars, and 11.31% of the old contract's volume;
- the old contracts still had complete 1,380-minute sessions and respectively
  686,302 and 483,935 volume.

This is contract-selection error, not a general DuckDB or chart aggregation
failure.

## Current, Databento, FXReplay, And Recommended Boundaries

Databento continuous dates below are exact symbology mapping boundaries. The
New York timestamps are their `00:00 UTC` conversion.

| Transition | Current DB effective (ET) | Databento `NQ.v.0` (ET) | FXReplay observation (ET) | Recommended (ET) |
| --- | ---: | ---: | ---: | ---: |
| H5 -> M5 | 2025-03-14 00:00 | 2025-03-19 20:00 | 2025-03-18 18:00 | 2025-03-16 18:00 |
| M5 -> U5 | 2025-06-13 00:00 | 2025-06-17 20:00 | 2025-06-16 18:00 | 2025-06-15 18:00 |
| U5 -> Z5 | 2025-09-14 18:00 | 2025-09-17 20:00 | 2025-09-15 18:00 | 2025-09-14 18:00 (retain) |
| Z5 -> H6 | 2025-12-15 00:00 | 2025-12-16 19:00 | 2025-12-15 18:00 | 2025-12-14 18:00 |

The recommendation intentionally does not copy FXReplay or Databento. It uses
Databento raw evidence through the governed V7 session-aligned policy and hard
horizon. March and September use explicit manual confirmation because their
strict first-dominance dates would be later than the production hard horizon;
both selected contracts already have near-complete sessions and material
volume at the retained boundary.

## Exact Historical Repair Scope

Only the half-open interval between each accepted boundary and recommended
boundary needs replacement. The current rows and proposed raw-source rows are:

| Transition | Half-open repair interval (ET) | Current rows | Replacement source | Replacement rows | Net restored minutes |
| --- | --- | ---: | --- | ---: | ---: |
| H5 -> M5 | `[2025-03-14 00:00, 2025-03-16 18:00)` | 947 | `NQH5` | 1,020 | +73 |
| M5 -> U5 | `[2025-06-13 00:00, 2025-06-15 18:00)` | 955 | `NQM5` | 1,020 | +65 |
| Z5 -> H6 | `[2025-12-14 18:00, 2025-12-15 00:00)` | 360 | `NQH6` | 360 | 0 |
| **Total** |  | **2,262** |  | **2,400** | **+138** |

The March and June replacements restore exactly 138 missing minute timestamps.
The September boundary is retained and requires no data rewrite. The December
replacement changes contract identity for the first six hours of the session
without changing row count.

## Executed Repair Gate

R7.3c correctly rejects this operation as `historical roll repair required`.
The insert-only updater and ordinary Contract Roll Preview/Commit path must not
be weakened to perform it.

A separate bounded repair step:

1. stopped acquisition writers and took a verified recoverable DuckDB backup;
2. downloaded and retained the exact three raw source slices with dataset-condition
   evidence and hashes;
3. staged all three replacement slices outside the authoritative table;
4. verified uniqueness, sorted timestamps, OHLC validity, source-contract
   identity, exact half-open bounds, and expected row counts;
5. atomically replaced only the three listed intervals and updated all four
   governed calendar boundaries;
6. verified zero duplicate timestamps, 2,400 replacement rows, 138 restored
   minutes, API reads, and representative Replay charts;
7. retained an audit manifest sufficient to restore the prior database.

The volume scanner now also prevents a `degraded` or otherwise non-`available`
Databento date from satisfying automatic two-session confirmation.

## Execution Evidence

- current repair-interval rows: 2,262;
- committed replacement rows: 2,400;
- net restored minute timestamps: 138;
- authoritative NQ rows after repair: 6,158,581;
- duplicate NQ timestamps after repair: 0;
- final calendar revision:
  `3e7b6d26d862bbcd6aa94bda349c83f4b4ca7f2e724de32a3ae0963f039ff45f`;
- full pre-write DuckDB backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260802_123641_418981Z.duckdb`;
- pre-write calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.20260802T083647-0400.yml`;
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/nq-2025-roll-0t_CZ-jIRDj9UDXai3Hn2M9t/manifest.json`;
- append-only repair audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/historical_roll_repair_audit.jsonl`.

Post-write verification covered the dedicated repair verifier, DuckDB interval
fingerprints and duplicate checks, `/v4/bars`, and representative V7
`/v4/projected_history` 1h/4h reads across March, June, and December. The
ordinary insert-only updater and R7.3c rejection remain unchanged.
