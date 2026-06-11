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

Implemented first:

```text
v4/scripts/update_databento_1m.py
```

Current implementation is dry-run-only. Passing `--write` exits with:

```text
--write is intentionally disabled in this dry-run-only version
```

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
ESZ5 -> ESH6, roll_date_et=2025-12-14, status=validated
NQZ5 -> NQH6, roll_date_et=2025-12-14, status=inferred_no_db_overlap
ESH6 -> ESM6, roll_date_et=2026-03-13, status=validated
NQH6 -> NQM6, roll_date_et=2026-03-13, status=inferred_no_db_overlap
ESM6 -> ESU6, roll_date_et=2026-06-14, status=future_candidate
NQM6 -> NQU6, roll_date_et=2026-06-14, status=future_candidate
```

ES entries were validated against existing DB overlap. NQ entries after 2025-11 cannot be directly validated because local NQ data stops before those roll windows; they are inferred from ES validation and the 2025 shared ES/NQ roll behavior. The updater must report inferred roll entries prominently in dry-run output before any write.

Additional roll validation on 2026-06-11:

```text
2025-12 ES Z-to-H, roll_date_et=2025-12-14:
  stitched rows: 8,280
  DB rows: 8,280
  overlap: 8,280
  missing stitched/db: 0 / 0
  max OHLC diff: 0.25
  duplicate keys: 0

2026-03 ES H-to-M:
  initial candidate roll_date_et=2026-03-15 failed with max OHLC diff 52.0 on 2026-03-13.
  corrected roll_date_et=2026-03-13:
    stitched rows: 8,280
    DB rows: 8,280
    overlap: 8,280
    missing stitched/db: 0 / 0
    max OHLC diff: 0.25
    duplicate keys: 0
```

Databento returned a degraded-quality warning for 2026-03-15 and 2026-03-16 during the 2026-03 ES validation. The data still matched the current DB after correcting the roll date, but updater dry-run should surface dataset condition warnings.

## Open Items Before Write

- Expand and validate roll calendar for the actual missing ranges.
- Confirm exact Databento historical end at run time.
- Decide whether daily automation should run after midnight ET or before next RTH open.
- Decide import audit log location outside git.

## Dry-Run Results

Run on 2026-06-11.

ES default dry-run:

```text
range ET: 2026-05-22 17:00:00 -> 2026-06-11 04:18:00
segment:
  ESM6 validated
downloaded normalized rows: 18,318
candidate rows after dedupe: 18,318
duplicate candidate keys: 0
existing candidate keys: 0
would insert rows: 18,318
would insert first ts: 2026-05-24 18:00:00
would insert last ts:  2026-06-11 04:17:00
warning:
  2026-05-24 degraded quality
```

NQ default dry-run:

```text
range ET: 2025-11-04 18:40:00 -> 2026-06-11 04:20:00
segments:
  NQZ5 2025-11-04 18:40 -> 2025-12-14 00:00, inferred_no_db_overlap
  NQH6 2025-12-14 00:00 -> 2026-03-13 00:00, inferred_no_db_overlap
  NQM6 2026-03-13 00:00 -> 2026-06-11 04:20, inferred_no_db_overlap
downloaded normalized rows: 210,486
candidate rows after dedupe: 210,486
duplicate candidate keys: 0
existing candidate keys: 0
would insert rows: 210,486
would insert first ts: 2025-11-04 18:40:00
would insert last ts:  2026-06-11 04:19:00
warnings:
  2025-11-28 degraded quality
  2026-03-15 / 2026-03-16 / 2026-04-10 degraded quality
```

Interpretation:

- The dry-run updater produces clean insert-only candidate sets for both ES and NQ.
- NQ depends on inferred roll entries because there is no local NQ overlap after 2025-11-04.
- Databento dataset condition warnings must be kept visible before write mode is considered.

## Dry-Run Audit

Added:

```text
v4/scripts/audit_databento_dry_run.py
```

Dataset condition results:

```text
2025-11-28: degraded, last_modified_date=2025-12-02
2026-03-15: degraded, last_modified_date=2026-03-16
2026-03-16: degraded, last_modified_date=2026-03-19
2026-04-10: degraded, last_modified_date=2026-04-11
2026-05-24: degraded, last_modified_date=2026-05-25
```

NQ inferred roll volume audit:

```text
NQZ5 -> NQH6, roll_date_et=2025-12-14:
  NQZ5 volume dominates before roll.
  NQH6 volume overtakes on 2025-12-15.
  This is close to the Sunday roll date and remains plausible, but not DB-validated.

NQH6 -> NQM6, roll_date_et=2026-03-13:
  NQH6 volume remains much larger on 2026-03-13.
  NQM6 volume only overtakes on 2026-03-16.
  This conflicts with the ES-inferred 2026-03-13 NQ roll date.
```

Decision:

- ES is the safer first write candidate after write mode is implemented.
- NQ should not be written until the 2026-03 NQ roll date is manually resolved.
- `NQH6 -> NQM6` is marked `inferred_volume_conflict` in the roll calendar.

## Guarded Write Result

Write mode is implemented in `v4/scripts/update_databento_1m.py` with these guards:

- `--write` requires `--confirm-write`.
- ES is the only write-enabled instrument.
- All selected roll segments must have `status=validated`.
- Inserts are insert-only on `(instrument, ts)` inside a transaction.
- Databento requests are chunked with `--chunk-days` and transient gateway failures are retried per chunk.

The first ES write attempt over the full range failed before transaction with Databento `504 The remote gateway timed out`; DB coverage remained unchanged. Chunked dry-run then succeeded with `--chunk-days 3`.

Executed ES write on 2026-06-11:

```text
range ET: 2026-05-22 17:00:00 -> 2026-06-11 04:48:00
contract: ESM6
downloaded normalized rows: 18,348
candidate rows after dedupe: 18,348
duplicate candidate keys: 0
existing candidate keys: 0
inserted rows: 18,348
before rows: 6,431,985
after rows: 6,450,333
before max ts: 2026-05-22 16:59:00
after max ts: 2026-06-11 04:47:00
warning:
  2026-05-24 degraded quality
```

Independent DB verification:

```text
ES max ts: 2026-06-11 04:47:00
ES duplicate timestamps: 0
NQ max ts unchanged: 2025-11-04 18:39:00
```

Next maintenance work:

- Keep NQ dry-run only until the 2026-03 roll conflict is resolved.
- Add a daily ES refresh wrapper only after deciding the intended operating time window and whether degraded-condition days require manual acknowledgement.
