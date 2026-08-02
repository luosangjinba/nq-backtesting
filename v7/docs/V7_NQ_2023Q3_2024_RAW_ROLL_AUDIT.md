# V7 NQ 2023 Q3–2024 Raw-Contract Roll Audit

Status: read-only raw audit complete; historical repair not executed

Audit date: 2026-08-02

## Outcome

Databento `GLBX.MDP3` raw old/new `ohlcv-1m` evidence was collected for the
five recent amber prescreen windows. A sixth green window, 2023 Q4, was added
because it is required to keep the governed quarterly chain contiguous between
`NQZ3` and `NQH4`.

Four boundaries require a later guarded historical repair:

- 2023 Q3 and Q4 switched late in the legacy continuous CSV;
- 2024 Q1 switched late;
- 2024 Q2 switched early.

Two boundaries should be retained:

- 2024 Q3 already matches the first two-session volume-confirmed boundary;
- 2024 Q4 already matches the expiry-week hard-horizon boundary and requires
  manual confirmation because strict two-session dominance occurs later.

No DuckDB row or roll-calendar row was changed.

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

## Exact Proposed Data Scope

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
OHLC rows. The normalized frames were not retained because this was a read-only
decision step. A later Preview must re-download them, require all conditions to
remain `available`, reproduce these fingerprints exactly, or stop.

## Prescreen Limitation Confirmed

2023 Q4 was green in the continuous-volume prescreen because the late-selected
old contract remained sufficiently active and the new contract was liquid by
the eventual seam. Raw bilateral evidence nevertheless proves the seam was
late. Therefore:

- red/amber is useful prioritization evidence;
- green means no immediate post-seam anomaly, not a certified boundary;
- every boundary entering the governed roll calendar still requires raw
  bilateral evidence.

## Required Repair Gate

Do not add more hard-coded years to the NQ 2025 one-off repair service. The next
step must establish a generic manifest-driven historical repair boundary that:

1. accepts only reviewed transition and interval specifications;
2. stages raw replacement CSVs plus condition evidence and hashes;
3. validates the complete `NQU3 -> NQZ3 -> NQH4 -> NQM4 -> NQU4 -> NQZ4 ->
   NQH5 -> NQM5` calendar chain;
4. takes a verified full DuckDB backup and calendar backup;
5. transactionally replaces only the four listed intervals;
6. writes all six reviewed calendar transitions while retaining 2024 Q3/Q4;
7. verifies 14,517 replacement rows, 196 restored timestamps, zero NQ
   duplicates, API reads, and representative Replay reads;
8. retains a complete audit manifest and rollback path.

Until that gate exists and is explicitly executed, the current database and
calendar remain unchanged.
