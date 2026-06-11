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

## Next

1. Run overlap validation for trusted DB dates.
2. Validate continuous contract behavior vs current DB.
3. Decide whether production updater should use Databento continuous symbols or raw contracts plus local roll rules.
4. Implement insert-only updater only after the above alignment is settled.
