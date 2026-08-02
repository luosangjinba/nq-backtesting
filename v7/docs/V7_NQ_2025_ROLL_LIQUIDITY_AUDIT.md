# V7 NQ 2025 Roll Liquidity Audit

Status: read-only audit complete; historical repair not executed

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

Keep raw quarterly-contract acquisition and the existing R7.3c policy:

1. aggregate old/new volume by complete CME trade date;
2. require two consecutive complete new-contract-dominant trade dates;
3. retain the first dominant trade date as the historical candidate;
4. make it effective at that trade date's prior `18:00` session open;
5. never let a Databento day with a non-`available` dataset condition satisfy
   automatic confirmation;
6. treat FXReplay only as an external reasonableness check.

This audit did not write DuckDB, the roll calendar, or market-data rows.

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

`candidate trade date` is the first date in the new-dominant run. `effective`
is the preceding calendar date at `18:00` New York, matching the existing
R7.3c domain rule.

| Transition | First dominant trade date | New/old volume ratio | New minutes | Next confirming trade date | Recommended effective (ET) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `NQH5 -> NQM5` | 2025-03-18 | 1.8857 | 1,380 | 2025-03-19 | 2025-03-17 18:00 |
| `NQM5 -> NQU5` | 2025-06-16 | 1.5484 | 1,378 | 2025-06-17 | 2025-06-15 18:00 |
| `NQU5 -> NQZ5` | 2025-09-16 | 3.3963 | 1,380 | 2025-09-18 available corroboration | 2025-09-15 18:00 |
| `NQZ5 -> NQH6` | 2025-12-15 | 1.2602 | 1,380 | 2025-12-16 | 2025-12-14 18:00 |

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
| H5 -> M5 | 2025-03-14 00:00 | 2025-03-19 20:00 | 2025-03-18 18:00 | 2025-03-17 18:00 |
| M5 -> U5 | 2025-06-13 00:00 | 2025-06-17 20:00 | 2025-06-16 18:00 | 2025-06-15 18:00 |
| U5 -> Z5 | 2025-09-14 18:00 | 2025-09-17 20:00 | 2025-09-15 18:00 | 2025-09-15 18:00 |
| Z5 -> H6 | 2025-12-15 00:00 | 2025-12-16 19:00 | 2025-12-15 18:00 | 2025-12-14 18:00 |

The recommendation intentionally does not copy FXReplay or Databento. It uses
Databento raw evidence through the already-governed V7 session-aligned policy.
Every recommended new-contract session is effectively complete and already
new-volume dominant.

## Exact Historical Repair Scope

Only the half-open interval between each accepted boundary and recommended
boundary needs replacement. The current rows and proposed raw-source rows are:

| Transition | Half-open repair interval (ET) | Current rows | Replacement source | Replacement rows | Net restored minutes |
| --- | --- | ---: | --- | ---: | ---: |
| H5 -> M5 | `[2025-03-14 00:00, 2025-03-17 18:00)` | 2,327 | `NQH5` | 2,400 | +73 |
| M5 -> U5 | `[2025-06-13 00:00, 2025-06-15 18:00)` | 955 | `NQM5` | 1,020 | +65 |
| U5 -> Z5 | `[2025-09-14 18:00, 2025-09-15 18:00)` | 1,375 | `NQU5` | 1,378 | +3 |
| Z5 -> H6 | `[2025-12-14 18:00, 2025-12-15 00:00)` | 360 | `NQH6` | 360 | 0 |
| **Total** |  | **5,017** |  | **5,158** | **+141** |

The first three replacements restore exactly 141 missing minute timestamps in
the affected windows. The December replacement changes contract identity for
the first six hours of the session without changing row count.

## Required Repair Gate

R7.3c correctly rejects this operation as `historical roll repair required`.
The insert-only updater and ordinary Contract Roll Preview/Commit path must not
be weakened to perform it.

A separate bounded repair step must:

1. stop acquisition writers and take a verified recoverable DuckDB backup;
2. download and retain the exact four raw source slices with dataset-condition
   evidence and hashes;
3. stage all four replacement slices outside the authoritative table;
4. verify uniqueness, sorted timestamps, OHLC validity, source-contract
   identity, exact half-open bounds, and expected row counts;
5. atomically replace only the four listed intervals and update the calendar;
6. verify zero duplicate timestamps, 5,158 replacement rows, 141 restored
   minutes, API reads, and representative Replay charts;
7. retain an audit manifest sufficient to restore the prior database.

Before that repair is implemented, the volume scanner must also prevent a
`degraded` Databento date from satisfying automatic two-session confirmation.
