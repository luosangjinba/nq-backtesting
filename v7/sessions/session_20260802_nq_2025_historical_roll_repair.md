# Session — 2026-08-02 — NQ 2025 Historical Roll Repair

## Request

Execute the approved plan after the liquidity audit showed that the 2025 March
and June NQ legacy boundaries selected illiquid new contracts too early.

## Result

- added Databento dataset-condition evidence to the roll-volume scanner and
  made every non-`available` trade date ineligible for automatic confirmation;
- added a dedicated V4 Maintenance API repair workflow, separate from both the
  ordinary Roll Calendar path and insert-only acquisition;
- retained staged source CSVs, exact fingerprints, calendar candidate, Preview
  manifest, and the exact confirmation `REPAIR NQ 2025`;
- took and independently opened a full pre-write DuckDB backup before mutation;
- governed all four 2025 NQ boundaries while retaining the September effective
  boundary and replacing only the March, June, and December intervals;
- atomically replaced 2,262 current rows with 2,400 raw-contract rows, restoring
  138 missing minute timestamps;
- verified 6,158,581 authoritative NQ rows, zero duplicate NQ timestamps, exact
  interval fingerprints, and the four calendar boundaries;
- verified `/v4/bars` and representative V7 `/v4/projected_history` 1h/4h
  reads across the repaired windows.

## Final Boundaries

| Transition | Effective boundary (ET) | Decision |
| --- | --- | --- |
| `NQH5 -> NQM5` | 2025-03-16 18:00 | manually confirmed at the hard horizon |
| `NQM5 -> NQU5` | 2025-06-15 18:00 | volume confirmed |
| `NQU5 -> NQZ5` | 2025-09-14 18:00 | retained, manually confirmed |
| `NQZ5 -> NQH6` | 2025-12-14 18:00 | volume confirmed |

## Recovery Evidence

- DuckDB backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/market-data/trading_data.prewrite.20260802_123641_418981Z.duckdb`
- calendar backup:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/backups/calendar/futures_roll_calendar.20260802T083647-0400.yml`
- retained Preview manifest:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/previews/nq-2025-roll-0t_CZ-jIRDj9UDXai3Hn2M9t/manifest.json`
- append-only repair audit:
  `/home/leo/.local/share/replay-lab/historical-roll-repair/historical_roll_repair_audit.jsonl`

## Invariants Preserved

The V4 Maintenance API remains the only mutation boundary. The ordinary
Databento updater remains insert-only, and R7.3c continues to reject historical
calendar changes as `historical roll repair required`.
