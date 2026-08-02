# Session — 2026-08-02 — NQ Pre-2025 Continuous Roll Prescreen

## Request

Use the original NQ continuous CSV volume to reduce the work needed to audit
historical roll windows before 2025.

## Result

- proved the CSV-to-DuckDB conversion retained volume exactly outside the
  approved 2025 repair intervals;
- added a modular, read-only continuous roll risk service and CLI;
- calibrated it against 2025 Q1/Q2 red and Q3 amber known outcomes;
- narrowed scoring to the seam trade date plus the next weekday session so
  later holidays do not become false immediate-roll signals;
- scanned all 68 complete 2008–2024 windows in under ten seconds;
- classified 8 red, 33 amber, and 27 green windows;
- reduced the first raw-contract validation batch to five recent amber windows,
  followed by eight red legacy windows;
- performed no Databento request, calendar write, or DuckDB mutation.

## Binding Evidence

- `v7/docs/V7_NQ_PRE_2025_CONTINUOUS_ROLL_PRESCREEN.md`
- `v4/server/legacy_continuous_roll_audit.py`
- `v4/scripts/scan_legacy_continuous_rolls.py`
- `v4/tests/test_legacy_continuous_roll_audit.py`

## Continuation

Run a read-only raw old/new Databento scan for `2023 Q3` and `2024 Q1–Q4`.
Do not extend the 2025 repair manifest or write historical rows from continuous
prescreen evidence alone.
