# Session 2026-06-11 - Databento Data Research

Branch: `feature/research-databento-data-journal`

## Context

yfinance was rejected as a data source because overlap validation showed Yahoo bars diverged from the existing DuckDB data, and the existing DB is considered authoritative.

Databento was selected for research as a higher-quality CME data source.

## Findings

- Relevant Databento dataset: `GLBX.MDP3`.
- Relevant schema for V4 refresh: `ohlcv-1m`.
- `ohlcv-1m` historical price checked through the API: `70.0 USD/GB`.
- ES/NQ daily refresh cost is roughly one cent for both symbols combined, based on `ESM5` and `NQM5` one-day estimates.
- `GLBX.MDP3` `ohlcv-1m` range reported `2010-06-06` through `2026-06-11T07:09:30Z`.
- At check time this was about eight hours behind US/Eastern current time, so Historical API is not assumed to be an intraday live source.

## Decisions

- Use Databento Historical API for historical backfill and daily post-session 1m refresh research.
- Do not use Historical API as the journal live-data source.
- Keep current DuckDB data authoritative.
- Databento imports must be insert-only until a separate repair workflow is designed.
- API keys must stay in environment variables and out of git.

## Added

- `v4/docs/planning/DATABENTO_DATA_RESEARCH.md`
- `v4/scripts/validate_databento_1m.py`
- `v4/scripts/validate_databento_roll.py`
- `databento` entry in `v4/requirements-data.txt`

## Validation Run

Command shape:

```bash
python3 v4/scripts/validate_databento_1m.py \
  --symbol ESM5:ES \
  --symbol NQM5:NQ \
  --start 2025-06-02T00:00:00 \
  --end 2025-06-03T00:00:00 \
  --download-sample \
  --compare-db
```

Result:

- `ESM5 + NQM5` one UTC day cost estimate: `0.010076165199 USD`.
- Downloaded rows: `2,760`.
- Normalized range: `2025-06-01 20:00` to `2025-06-02 19:59` ET-naive.
- ES overlap: `1,380 / 1,380`, no missing rows; max OHLC diff `0.25`.
- NQ overlap: `1,380 / 1,380`, no missing rows; max OHLC diff `0.75`.
- `ES.c.0/NQ.c.0` continuous symbology is valid and matched the same non-roll-window profile.
- `ES.FUT/NQ.FUT` is not a valid Databento continuous symbol format.

## Roll Validation

Tested windows:

- `2025-03 H-to-M`
- `2025-06 M-to-U`
- `2025-09 U-to-Z`

Result:

- Databento `ES.c.0/ES.v.0` and `NQ.c.0/NQ.v.0` matched the old raw contract through the tested rollover windows.
- The current DB matched the old raw contract before roll and the new raw contract after roll.
- Examples:
  - 2025-03: DB switched to `ESM5/NQM5` from March 14/16/17.
  - 2025-06: DB switched to `ESU5/NQU5` from June 13/15/16.
  - 2025-09: DB switched to `ESZ5/NQZ5` from September 14/15.

Decision:

- Do not use Databento continuous symbols directly for DB maintenance.
- Use raw quarterly contracts and a local roll calendar aligned to the existing DB.

## Next

1. Formalize the raw-contract roll calendar that matches the current DB.
2. Run broader overlap validation using that roll calendar.
3. Implement insert-only updater only after the above alignment is settled.
