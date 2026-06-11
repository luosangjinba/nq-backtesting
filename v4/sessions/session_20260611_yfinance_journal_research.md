# Session 2026-06-11: Yfinance Data And Journal Research

Branch: `feature/research-yfinance-data-journal`

Goal:

- Research whether yfinance can be used to supplement V4 NQ/ES 1m data before building a Journal system parallel to replay review.

Actions:

- Created research branch.
- Checked local DuckDB schema and coverage:
  - `ES`: 2008-01-02 06:01 -> 2026-05-22 16:59, 6,431,985 rows.
  - `NQ`: 2008-01-02 06:01 -> 2025-11-04 18:39, 5,906,274 rows.
- Reviewed yfinance GitHub/project docs.
- Confirmed yfinance supports `interval="1m"` but intraday data cannot extend beyond the last 60 days.
- Noted yfinance/Yahoo personal-use and legal limitations.
- Wrote `v4/docs/planning/YFINANCE_DATA_RESEARCH.md`.
- Added Step 280 to `v4/TODO.md`.
- Added read-only validation script `v4/scripts/validate_yfinance_1m.py`.
- Added `v4/requirements-data.txt` for yfinance validation dependencies.

Initial conclusion:

- yfinance is suitable for recent rolling refresh and journal freshness.
- yfinance is not enough to backfill the full NQ gap from 2025-11-04 to 2026-06-11 because 1m intraday history is limited to the recent window.
- User confirmed the existing DB is accurate and Yahoo data is not accurate enough to overwrite it.
- Future yfinance import must be insert-only: preserve any existing `(instrument, ts)` row.

Validation script behavior:

- Downloads `interval="1m"` with `auto_adjust=False`.
- Converts timestamps to America/New_York wall-clock and drops timezone to match V4 DuckDB timestamps.
- Prints raw and normalized summaries.
- Optionally compares overlap against `futures_1m`.
- Reports insert-only candidate rows and existing rows that would be preserved.
- Does not write to the database.

Validation run:

- Installed `yfinance` into the local Python environment.
- `ES=F --period 5d` returned 5,074 rows, timezone `America/New_York`, normalized to `2026-06-07 18:10` -> `2026-06-11 10:24`, no duplicate keys.
- `NQ=F --period 5d` returned 5,075 rows, timezone `America/New_York`, normalized to `2026-06-07 18:10` -> `2026-06-11 10:25`, no duplicate keys.
- `ES=F --date 2026-05-22 --compare-db` overlapped 1,011 rows exactly by timestamp, with no missing rows, but had OHLC differences up to 6.75 points.
- Largest observed ES diff row was `2026-05-22 16:59`: Yahoo high/close `7491.00/7491.00`, DB high/close `7484.50/7484.25`.
- `ES=F --period 30d` returned no rows because Yahoo reported only 8 days of 1m granularity are available per request.

Follow-up:

- Print largest OHLC diff rows in the validator.
- Use <=7-day chunks for any later updater.
