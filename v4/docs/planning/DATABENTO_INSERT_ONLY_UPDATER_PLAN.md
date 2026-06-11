# Databento Insert-Only Updater Plan

Date: 2026-06-11

Branch: `feature/research-databento-data-journal`

## Purpose

Design the future updater before writing any market data into `v4/data/trading_data.duckdb`.

The updater should fill missing ES/NQ 1-minute bars using Databento raw quarterly contracts while preserving the current DB as authoritative.

## Current Coverage Snapshot

Checked on 2026-06-11:

```text
ES: 2008-01-02 06:01 -> 2026-05-22 16:59, 6,431,985 rows
NQ: 2008-01-02 06:01 -> 2025-11-04 18:39, 5,906,274 rows
```

Databento Historical `GLBX.MDP3 / ohlcv-1m` was observed to lag real time, so refresh windows should end at the Databento available range, not at wall-clock now.

Gap scan on 2026-06-11:

```text
Databento end UTC:      2026-06-11T08:01:50.437951+00:00
Databento ET-naive end: 2026-06-11 04:01:50.437951

ES candidate max-ts-forward window:
  after 2026-05-22 16:59:00
  through Databento end 2026-06-11 04:01:50.437951
  minute-span upper bound: 28,022

NQ candidate max-ts-forward window:
  after 2025-11-04 18:39:00
  through Databento end 2026-06-11 04:01:50.437951
  minute-span upper bound: 314,482
```

## Inputs

1. Local DB:
   - `v4/data/trading_data.duckdb`
   - table `futures_1m`

2. Databento:
   - dataset `GLBX.MDP3`
   - schema `ohlcv-1m`
   - raw quarterly symbols only

3. Roll calendar:
   - `v4/data_config/futures_roll_calendar.yml`
   - explicit ET roll dates
   - no formula-only roll inference in the first updater

4. Gap scanner:
   - `v4/scripts/scan_databento_gaps.py`
   - read-only DB coverage and Databento availability report

## Rules

- Insert-only by default.
- Never overwrite existing `(instrument, ts)`.
- Normalize Databento UTC `ts_event` to America/New_York wall-clock, then drop timezone.
- Use raw contracts selected by explicit ET roll date.
- Stage downloaded bars before insertion.
- Report all counts before optional write:
  - downloaded rows
  - normalized rows
  - duplicate candidate keys
  - rows already existing in DB
  - rows to insert
  - missing roll calendar coverage

## Proposed CLI

```bash
export DATABENTO_API_KEY="..."

python3 v4/scripts/update_databento_1m.py \
  --instrument NQ \
  --start 2025-11-04T18:40:00 \
  --end 2026-06-11T03:00:00 \
  --dry-run
```

Future write mode:

```bash
python3 v4/scripts/update_databento_1m.py \
  --instrument NQ \
  --start 2025-11-04T18:40:00 \
  --end 2026-06-11T03:00:00 \
  --write
```

Default mode must remain dry-run.

## Implementation Shape

1. Load DB coverage.
2. Load Databento available range.
3. Clamp requested `end` to Databento available ET-naive end.
4. Load roll calendar and split requested window into contract segments.
5. For each segment:
   - call Databento `timeseries.get_range`
   - normalize timestamps
   - map to internal instrument
6. Concatenate all segments.
7. Drop duplicate candidate keys.
8. Compare candidate keys with DB.
9. Print dry-run report.
10. If `--write`, insert only missing keys inside a transaction.

## First Safe Target

Start with max-ts-forward refresh only:

- NQ after `2025-11-04 18:39`
- ES after `2026-05-22 16:59`

Do not scan and fill historical internal holes in the first writer. That can be a separate audit tool.

## Roll Calendar Draft

Added:

```text
v4/data_config/futures_roll_calendar.yml
```

Initial entries cover the currently relevant missing ranges:

```text
ESZ5 -> ESH6, roll_date_et=2025-12-14, status=needs_validation
NQZ5 -> NQH6, roll_date_et=2025-12-14, status=needs_validation
ESH6 -> ESM6, roll_date_et=2026-03-15, status=needs_validation
NQH6 -> NQM6, roll_date_et=2026-03-15, status=needs_validation
ESM6 -> ESU6, roll_date_et=2026-06-14, status=future_candidate
NQM6 -> NQU6, roll_date_et=2026-06-14, status=future_candidate
```

These are candidates, not approved writer inputs. They must be validated before `--write`.

## Open Items Before Write

- Expand and validate roll calendar for the actual missing ranges.
- Confirm exact Databento historical end at run time.
- Decide whether daily automation should run after midnight ET or before next RTH open.
- Decide import audit log location outside git.
