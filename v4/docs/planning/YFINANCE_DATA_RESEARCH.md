# Yfinance Data Research For V4 Journal

Date: 2026-06-11

Branch: `feature/research-yfinance-data-journal`

## Goal

Before building a parallel Journal system on top of the V4 review platform, improve the freshness and reliability of the `futures_1m` database.

Journal differs from replay review:

- Review records what was seen and concluded after replay.
- Journal records live state: what I was thinking in the moment, what I felt, what I did, which order was actually taken, and whether execution followed rules.

The V4 chart/replay/calendar platform can support both, but Journal needs fresher data and a different note model.

## Current Local Database

Database: `v4/data/trading_data.duckdb`

Table: `futures_1m`

Schema:

```text
instrument varchar not null
ts         timestamp not null
open       double not null
high       double not null
low        double not null
close      double not null
volume     bigint
```

Coverage checked on 2026-06-11:

```text
ES: 2008-01-02 06:01 -> 2026-05-22 16:59, 6,431,985 rows
NQ: 2008-01-02 06:01 -> 2025-11-04 18:39, 5,906,274 rows
```

V4 treats `ts` as US/Eastern wall-clock timestamps stored as naive DuckDB timestamps. Any imported data must match that convention.

## Yfinance Findings

Project:

- GitHub: https://github.com/ranaroussi/yfinance
- Documentation: https://ranaroussi.github.io/yfinance/
- Latest GitHub release observed: `1.4.1`, dated 2026-05-28.

Important official notes:

- yfinance fetches from Yahoo Finance public APIs.
- It is intended for research and educational use and is not affiliated with Yahoo.
- Yahoo Finance API/data use is for personal use; Yahoo terms still govern downloaded data.
- `yfinance.download()` supports `interval="1m"`.
- Valid intervals include `1m`, `2m`, `5m`, `15m`, `30m`, `60m`, `90m`, `1h`, `1d`, `5d`, `1wk`, `1mo`, `3mo`.
- Intraday data cannot extend beyond the last 60 days.
- `auto_adjust` defaults to `True`; for raw futures OHLC ingestion it should be set to `False`.
- `prepost` exists, but futures behavior must be verified empirically.
- `ignore_tz` defaults differ by interval; intraday defaults to timezone-aware handling.
- Empirical validation on 2026-06-11 showed `period="30d"` for `interval="1m"` failed with a Yahoo message saying only 8 days of 1m granularity are available per request. Use <=7-day chunks even though documentation discusses the broader intraday history limit.

Candidate Yahoo tickers:

```text
NQ=F  -> E-mini Nasdaq-100 continuous futures candidate
ES=F  -> E-mini S&P 500 continuous futures candidate
```

These symbols must be verified by sample downloads before importing.

## Fit For Our Use Case

Authoritative-source decision:

- The existing DuckDB data is the authority.
- Yahoo/yfinance data is not accurate enough to overwrite existing DB bars.
- yfinance may only be used as a recent missing-row candidate source.
- Any writer must default to insert-only behavior: if `(instrument, ts)` already exists, preserve the DB row.
- Overlap comparison remains useful as a quality check, but not as a replacement trigger.

Good fit:

- Ongoing near-current data refresh.
- Filling recent small holes.
- Journal support where 15-minute-delayed data is acceptable.
- Cross-checking replay data freshness.

Bad fit:

- Backfilling old gaps beyond 60 days at 1m resolution.
- Rebuilding the full historical database from 2008.
- Guaranteed real-time trading data.
- Guaranteed CME-grade data quality.

Important implication:

- NQ currently ends at 2025-11-04. As of 2026-06-11, yfinance 1m cannot fill that entire gap because the missing span is far beyond 60 days.
- ES currently ends at 2026-05-22, which is within the recent-data use case and may be refreshable.
- For NQ, either accept a recent rolling window starting from what Yahoo can provide now, or use another historical provider for the older gap.

## Proposed Data Pipeline Prototype

Added a read-only validation script under `v4/scripts/`, not in the API server path:

```text
v4/scripts/update_yfinance_1m.py
```

Implemented first:

```text
v4/scripts/validate_yfinance_1m.py
```

Inputs:

- `--db data/trading_data.duckdb`
- `--symbols NQ=F:NQ,ES=F:ES`
- `--period 7d` or `--start YYYY-MM-DD --end YYYY-MM-DD`
- `--dry-run`
- `--write`

Download settings:

```python
yfinance.download(
    tickers=["NQ=F", "ES=F"],
    interval="1m",
    period="7d",
    auto_adjust=False,
    prepost=True,
    keepna=False,
    progress=False,
    group_by="ticker",
)
```

Normalization requirements:

- Convert Yahoo timestamps to America/New_York wall-clock timestamps.
- Drop timezone before writing to DuckDB.
- Rename columns to lowercase: `open`, `high`, `low`, `close`, `volume`.
- Map `NQ=F` to internal instrument `NQ`; map `ES=F` to `ES`.
- Drop rows with null OHLC.
- Keep zero/null volume policy explicit. Existing schema allows null volume.
- Round only if needed; do not use yfinance rounding by default.

Write strategy:

- Stage downloaded bars into a temp table.
- Insert only rows whose `(instrument, ts)` does not already exist in `futures_1m`.
- Never delete or overwrite existing DB rows from yfinance data.
- Report inserted-candidate / existing-preserved / skipped counts.

Quality checks:

- Confirm no duplicate `(instrument, ts)` rows after import.
- Compare overlap against existing DB for the last available day before writing.
- Report max absolute OHLC difference in overlap.
- Report missing expected minute counts by session/day.
- Report first/last imported timestamp per instrument.
- Keep a local import log outside git.
- Print the largest OHLC overlap differences before approving writes.

Recommended first prototype:

1. Dry-run one day of `ES=F` overlapping the existing ES max range.
2. Compare Yahoo bars with existing ES rows.
3. Dry-run recent `NQ=F`.
4. Only after timestamp/price alignment is understood, enable `--write`.

Validation commands:

```bash
python3 -m pip install -r v4/requirements-data.txt
python3 v4/scripts/validate_yfinance_1m.py --symbol ES=F:ES --period 5d
python3 v4/scripts/validate_yfinance_1m.py --symbol NQ=F:NQ --period 5d
python3 v4/scripts/validate_yfinance_1m.py --symbol ES=F:ES --date 2026-05-22 --compare-db
```

Validation results on 2026-06-11:

```text
ES=F period 5d:
  rows: 5074
  timezone: America/New_York
  normalized: 2026-06-07 18:10 -> 2026-06-11 10:24
  duplicate keys: 0

NQ=F period 5d:
  rows: 5075
  timezone: America/New_York
  normalized: 2026-06-07 18:10 -> 2026-06-11 10:25
  duplicate keys: 0

ES=F date 2026-05-22 compare-db:
  yahoo rows: 1011
  db rows: 1011
  overlap rows: 1011
  missing in yahoo: 0
  missing in db: 0
  insert-only candidate rows: 0
  existing rows preserved: 1011
  max open diff: 0.5
  max high diff: 6.5
  max low diff: 0.0
  max close diff: 6.75
  max volume diff: 254
  largest diff row:
    2026-05-22 16:59
    Yahoo high/close: 7491.00 / 7491.00
    DB high/close:    7484.50 / 7484.25

ES=F period 30d:
  failed/empty because Yahoo reported only 8 days of 1m granularity are available per request.
```

Implication:

- Timestamp conversion is correct at the basic level.
- 1m downloads work for current ES/NQ.
- Updates must be chunked.
- Existing DB and Yahoo can differ on overlap; DB remains authoritative and yfinance must not overwrite existing rows.
- The largest observed ES overlap difference was at 16:59. This may be a source/session-close/settlement-style difference, not necessarily a timestamp mapping failure, but it is large enough to require manual policy before writes.

## Journal System Direction

Journal should be parallel to replay review, not a replacement.

Shared platform:

- Same chart.
- Same replay/date controls.
- Same calendar day grouping.
- Same Order Setup objects where relevant.
- Same archive/export framework eventually.

Different record model:

- Session state before/during trading.
- Live thesis and uncertainty.
- What I was watching.
- What I wanted to do.
- What I actually did.
- Why I entered or skipped.
- Emotional/discipline state.
- Rule compliance.
- Immediate post-trade note.
- Later replay-review correction.

MVP journal objects:

```text
Journal Day
  premarket state
  live thesis
  active rules / do-not-trade conditions
  live notes timeline
  trades taken
  skipped trades
  end-of-session reflection
  replay review correction
```

Design principle:

- Journal input must be faster and lighter than review input.
- Live journal notes should support timestamped quick entries.
- Detailed classification should be optional and mostly deferred to replay review.

## Open Questions

- Do we accept Yahoo's continuous futures construction for journal context, or do we need contract-specific CME data?
- Is a 15-minute delayed feed enough for actual journal workflow, or only for near-live replay after the fact?
- Should NQ's old gap be filled by a different provider before journal work starts?
- Should journal data live in localStorage first, or should we introduce a DuckDB-backed journal API?
- Should yfinance import be manual-only first, or scheduled later?
