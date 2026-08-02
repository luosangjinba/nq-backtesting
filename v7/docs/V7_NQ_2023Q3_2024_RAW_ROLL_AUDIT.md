# V7 NQ 2023 Q3–2024 Raw-Contract Roll Audit

Status: raw audit complete; manifest-driven historical repair executed and verified

Audit date: 2026-08-02

Later policy note: the read-only legacy-red audit recommends using the free
Databento `NQ.v.0` mapping date as authority while normalizing that trade date
to the full `18:00 ET` session open. If adopted, it requires a full contiguous
calendar diff and may supersede some dates recorded here. This document
remains the binding execution record of the completed repair; see
`V7_NQ_LEGACY_RED_DATABENTO_ROLL_AUDIT.md` before another write.

## Outcome

Databento `GLBX.MDP3` raw old/new `ohlcv-1m` evidence was collected for the
five recent amber prescreen windows. A sixth green window, 2023 Q4, was added
because it is required to keep the governed quarterly chain contiguous between
`NQZ3` and `NQH4`.

Four boundaries were repaired through the guarded manifest workflow:

- 2023 Q3 and Q4 switched late in the legacy continuous CSV;
- 2024 Q1 switched late;
- 2024 Q2 switched early.

Two boundaries should be retained:

- 2024 Q3 already matches the first two-session volume-confirmed boundary;
- 2024 Q4 already matches the expiry-week hard-horizon boundary and requires
  manual confirmation because strict two-session dominance occurs later.

The audit phase itself was read-only. The reviewed follow-up repair was
executed on 2026-08-02 through the V4 Maintenance API.

## Boundary Evidence

All trade dates used below have Databento dataset condition `available`. A
complete date requires at least 1,200 distinct minutes in both contracts and
open/close proximity under the production scanner.

| Transition | Hard horizon (ET) | First two-session dominance | Ratios on confirming dates | Recommended effective (ET) | Legacy seam (ET) | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `NQU3 -> NQZ3` | 2023-09-11 00:00 | 2023-09-11 / 09-12 | 1.7790 / 3.5389 | 2023-09-10 18:00 | 2023-09-14 00:00 | move earlier |
| `NQZ3 -> NQH4` | 2023-12-11 00:00 | 2023-12-11 / 12-12 | 1.6427 / 3.5201 | 2023-12-10 18:00 | 2023-12-14 00:00 | move earlier |
| `NQH4 -> NQM4` | 2024-03-11 00:00 | 2024-03-11 / 03-12 | 1.8169 / 3.5825 | 2024-03-10 18:00 | 2024-03-14 00:00 | move earlier |
| `NQM4 -> NQU4` | 2024-06-17 00:00 | 2024-06-17 / 06-18 | 1.8700 / 4.5152 | 2024-06-16 18:00 | 2024-06-14 00:00 | move later |
| `NQU4 -> NQZ4` | 2024-09-16 00:00 | 2024-09-16 / 09-17 | 1.1786 / 2.7745 | 2024-09-15 18:00 | 2024-09-15 18:00 | retain |
| `NQZ4 -> NQH5` | 2024-12-16 00:00 | 2024-12-17 / 12-18 | 2.8636 / 5.4312 | 2024-12-15 18:00 | 2024-12-15 18:00 | retain/manual |

For 2024 Q4, trade date 2024-12-16 is complete and available: `NQH5` has
1,375 minutes and 87.96% of `NQZ4` volume. This is material liquidity at the
hard horizon but not automatic dominance, so the retained boundary must remain
`manual_confirmed`, not `volume_confirmed`.

## Exact Executed Data Scope

The current CSV and DuckDB counts are identical in every interval. The exact
replacement slices were downloaded read-only from the indicated raw contract,
normalized to New York wall time, and checked for target symbol, uniqueness,
OHLC bounds, half-open bounds, and fingerprint.

| Transition | Half-open interval (ET) | Replacement source | Current rows | Replacement rows | Net restored | Replacement fingerprint |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `NQU3 -> NQZ3` | `[2023-09-10 18:00, 2023-09-14 00:00)` | `NQZ3` | 4,398 | 4,499 | +101 | `ed7ae26484cb6d6f018ad758be0447c16de6b124cbe2fd57a242d6d70e09bdeb` |
| `NQZ3 -> NQH4` | `[2023-12-10 18:00, 2023-12-14 00:00)` | `NQH4` | 4,478 | 4,498 | +20 | `d210aeb1374ddf4b12de765bfc06b48034d3bc23b3cbe0474bbdb95808e01cf9` |
| `NQH4 -> NQM4` | `[2024-03-10 18:00, 2024-03-14 00:00)` | `NQM4` | 4,429 | 4,500 | +71 | `1cd4f5e204e0571383785efa7dc47d0f6c3f0d2780f853441ed7f3ab1b91b5c9` |
| `NQM4 -> NQU4` | `[2024-06-14 00:00, 2024-06-16 18:00)` | `NQM4` | 1,016 | 1,020 | +4 | `f9e7a8eceb926658cc48177e038bd52b08c2ce31c78ac1d355e08ee740a7765c` |
| **Total** |  |  | **14,321** | **14,517** | **+196** |  |

The four audit downloads contained zero duplicate timestamps and zero invalid
OHLC rows. The audit-phase normalized frames were not reused. The executed
Preview re-downloaded all four slices, required every condition to remain
`available`, reproduced all four fingerprints exactly, and retained the
resulting CSVs and hashes outside the authoritative database.

## Prescreen Limitation Confirmed

2023 Q4 was green in the continuous-volume prescreen because the late-selected
old contract remained sufficiently active and the new contract was liquid by
the eventual seam. Raw bilateral evidence nevertheless proves the seam was
late. Therefore:

- red/amber is useful prioritization evidence;
- green means no immediate post-seam anomaly, not a certified boundary;
- every boundary entering the governed roll calendar still requires raw
  bilateral evidence.

## Executed Repair Gate

A generic manifest-driven boundary was added without extending or changing the
accepted NQ 2025 one-off service. The executed workflow:

1. accepts only reviewed transition and interval specifications;
2. stages raw replacement CSVs plus condition evidence and hashes;
3. validates the complete `NQU3 -> NQZ3 -> NQH4 -> NQM4 -> NQU4 -> NQZ4 ->
   NQH5 -> NQM5` calendar chain;
4. takes a verified full DuckDB backup and calendar backup;
5. transactionally replaces only the four listed intervals;
6. writes all six reviewed calendar transitions while retaining 2024 Q3/Q4;
7. verified 14,517 replacement rows, 196 restored timestamps, zero NQ
   duplicates, API reads, and representative Replay reads;
8. retained a complete audit manifest and rollback path.

The exact confirmation was `REPAIR NQ 2023Q3-2024`. Preview, Commit, and Verify
were all invoked through the V4 Maintenance API; the ordinary acquisition path
remains insert-only.

## Execution Evidence

- manifest plan revision:
  `fba501647229df13eababd35f3ccda785cd2625f29a415c29697854665759f72`;
- previous database baseline: 12,650,824 total rows and 6,158,581 NQ rows;
- final database: 12,651,020 total rows and 6,158,777 NQ rows;
- final interval rows: 4,499 / 4,498 / 4,500 / 1,020;
- final interval fingerprints: exact matches to the four reviewed values above;
- duplicate NQ timestamps: 0;
- final calendar revision:
  `adf9ae6191a313c50517646b32b88088bccb708bc240e3d6c346ef1581c71250`;
- full pre-write DuckDB backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260802_134801_834602Z.duckdb`;
- pre-write calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.nq-2023q3-2024.20260802T094802-0400.yml`;
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/manifest-roll-nq-2023q3-2024-wQD6_J0lrb6SQJSgvtucIkrZ/manifest.json`;
- append-only repair audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/manifest_historical_roll_repair_audit.jsonl`.

Independent post-commit checks re-opened both the authoritative database and
the full backup, ran the manifest verifier again, and read all four repaired
windows from `/v4/bars`. Representative `/v4/projected_history` reads returned
115 `1h` ETH bars across 2023 Q3 and 26 `4h` ETH bars across 2024 Q2.
