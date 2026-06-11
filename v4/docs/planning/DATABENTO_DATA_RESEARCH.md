# Databento Data Research For V4 Journal

Date: 2026-06-11

Branch: `feature/research-databento-data-journal`

## Goal

Replace the abandoned yfinance data-refresh idea with a higher-quality data source for V4's `futures_1m` database.

The immediate target is not live journal execution. It is historical and daily post-session 1-minute bar maintenance:

- Fill missing ES/NQ 1m gaps after validating alignment.
- After the database is complete, fetch only each day's 1m bars.
- Preserve the current DuckDB data as authoritative.

## Source

Provider: Databento

Relevant dataset: `GLBX.MDP3` (`CME Globex MDP 3.0`)

Relevant schema: `ohlcv-1m`

Official client: `databento` Python package

API key handling:

- Use `DATABENTO_API_KEY` from the environment.
- Do not commit keys, generated downloads, logs, or local import reports.

## Pricing Findings

Checked with Databento API on 2026-06-11.

`GLBX.MDP3` unit prices:

```text
historical:
  ohlcv-1m: 70.0 USD/GB
  ohlcv-1s: 70.0 USD/GB
  trades:   28.0 USD/GB
  mbp-1:    1.8 USD/GB
  definition: 1.7 USD/GB

historical-streaming:
  ohlcv-1m: 70.0 USD/GB

live:
  ohlcv-1m: 84.0 USD/GB
```

Cost estimate examples:

```text
ESM5 one UTC day, ohlcv-1m:
  billable bytes: 77,280
  estimated cost: 0.0050380826 USD

NQM5 one UTC day, ohlcv-1m:
  billable bytes: 77,280
  estimated cost: 0.0050380826 USD

ESM5 + NQM5 one UTC week, ohlcv-1m:
  billable bytes: 759,360
  estimated cost: 0.049504637718 USD
```

Implication:

- Daily post-session ES+NQ `ohlcv-1m` refresh cost is negligible.
- The main risk is not pricing; it is timestamp, roll, and OHLCV alignment.

## Availability / Delay Finding

`GLBX.MDP3` `ohlcv-1m` available range checked on 2026-06-11:

```text
start: 2010-06-06T00:00:00.000000000Z
end:   2026-06-11T07:09:30.165134000Z
```

At the same check time:

```text
now UTC:       2026-06-11T15:09:50Z
now US/Eastern 2026-06-11T11:09:50-04:00
dataset end:   2026-06-11T03:09:30-04:00
```

This was a real lag after timezone normalization, not a timezone display issue.

Decision:

- Historical API is suitable for historical backfill and daily post-session refresh.
- Historical API should not be treated as the live feed for intraday journal.
- If journal needs live market reference, evaluate Databento Live API separately.

## V4 Database Rules

Database: `v4/data/trading_data.duckdb`

Table: `futures_1m`

V4 timestamp convention:

- Store US/Eastern wall-clock timestamps as naive DuckDB timestamps.
- Databento returns `ts_event` in UTC.
- Import logic must convert `ts_event` to `America/New_York`, then drop timezone.

Authority rule:

- Existing DuckDB rows are authoritative.
- Databento is a candidate source for missing rows only.
- Writers must be insert-only by default.
- Never overwrite existing `(instrument, ts)` rows unless a separate manual repair tool is explicitly designed.

## Validation Script

Added:

```text
v4/scripts/validate_databento_1m.py
v4/scripts/validate_databento_roll.py
v4/scripts/validate_databento_raw_calendar.py
```

The script is read-only:

- Checks unit prices.
- Checks dataset/schema available range.
- Estimates request cost.
- Optionally downloads a small sample.
- Normalizes UTC `ts_event` to ET-naive `ts`.
- Optionally compares overlap against `futures_1m`.
- Does not write to DuckDB.

The roll script is also read-only:

- Downloads preset rollover windows.
- Compares Databento `ES.c.0/NQ.c.0`, `ES.v.0/NQ.v.0`, old raw contracts, and new raw contracts.
- Scores each source against the current DB by overlap and OHLC/volume differences.
- Prints daily best-source breakdown around rollover.

The raw calendar script validates the production-like path:

- Downloads old/new raw quarterly contracts.
- Stitches them with an explicit ET roll date.
- Compares the stitched raw-contract series against the authoritative DB.
- Reports duplicate keys, missing rows, OHLCV differences, and per-day source symbols.

Example:

```bash
export DATABENTO_API_KEY="..."
python3 v4/scripts/validate_databento_1m.py \
  --symbol ESM5:ES \
  --symbol NQM5:NQ \
  --start 2025-06-02T00:00:00 \
  --end 2025-06-03T00:00:00 \
  --download-sample \
  --compare-db
```

## Validation Results

Run on 2026-06-11 with `ESM5:ES` and `NQM5:NQ`:

```text
window: 2025-06-02T00:00:00Z -> 2025-06-03T00:00:00Z
schema: ohlcv-1m
billable bytes: 154,560
estimated cost: 0.010076165199 USD
raw rows: 2,760
normalized ET-naive range: 2025-06-01 20:00 -> 2025-06-02 19:59
duplicate keys: 0
```

DB overlap comparison:

```text
ES:
  download rows: 1,380
  DB rows in range: 1,380
  overlap rows: 1,380
  missing in Databento: 0
  missing in DB: 0
  max open diff: 0.25
  max high diff: 0.0
  max low diff: 0.0
  max close diff: 0.0
  max volume diff: 8

NQ:
  download rows: 1,380
  DB rows in range: 1,380
  overlap rows: 1,380
  missing in Databento: 0
  missing in DB: 0
  max open diff: 0.75
  max high diff: 0.0
  max low diff: 0.0
  max close diff: 0.5
  max volume diff: 17
```

Continuous symbology smoke:

```text
valid:   ES.c.0, NQ.c.0 with stype_in=continuous
valid:   ES.v.0, NQ.v.0 with stype_in=continuous
invalid: ES.FUT, NQ.FUT for continuous
```

For the 2025-06-02 test window, `ES.c.0/NQ.c.0` produced the same overlap profile as raw active contracts. This is not enough to approve continuous import because the key question is roll behavior; it must be tested around rollover windows.

## Roll Validation Results

Run on 2026-06-11 with `v4/scripts/validate_databento_roll.py`.

Rollover windows tested:

```text
2025-03 H-to-M: 2025-03-10T00:00:00Z -> 2025-03-18T00:00:00Z
2025-06 M-to-U: 2025-06-09T00:00:00Z -> 2025-06-17T00:00:00Z
2025-09 U-to-Z: 2025-09-08T00:00:00Z -> 2025-09-16T00:00:00Z
```

Observed pattern:

```text
Databento ES.c.0 / ES.v.0 matched the old raw contract through the tested roll window.
Databento NQ.c.0 / NQ.v.0 matched the old raw contract through the tested roll window.

The current DB matched the old raw contract before roll, then matched the new raw contract after roll.
```

Daily best-source examples:

```text
2025-03 H-to-M:
  ES old/c.0 best through 2025-03-13; ES new raw ESM5 best from 2025-03-14/16/17.
  NQ old/c.0 best through 2025-03-13; NQ new raw NQM5 best from 2025-03-14/16/17.

2025-06 M-to-U:
  ES old/c.0 best through 2025-06-12; ES new raw ESU5 best from 2025-06-13/15/16.
  NQ old/c.0 best through 2025-06-12; NQ new raw NQU5 best from 2025-06-13/15/16.

2025-09 U-to-Z:
  ES old/c.0 best through 2025-09-12; ES new raw ESZ5 best from 2025-09-14/15.
  NQ old/c.0 best through 2025-09-12; NQ new raw NQZ5 best from 2025-09-14/15.
```

Decision:

- Do not use Databento `continuous` symbols directly for production DB maintenance.
- Use Databento raw quarterly contracts plus a local roll calendar that matches the current DB.
- Existing DB remains authoritative; the roll calendar should be inferred/validated against DB before any missing-row insert.

## Raw Roll Calendar Validation Results

Run on 2026-06-11 with `v4/scripts/validate_databento_raw_calendar.py`.

Validated explicit raw-contract roll dates:

```text
2025-03 ES: ESH5 -> ESM5, roll_date_et=2025-03-14
2025-03 NQ: NQH5 -> NQM5, roll_date_et=2025-03-14
2025-06 ES: ESM5 -> ESU5, roll_date_et=2025-06-13
2025-06 NQ: NQM5 -> NQU5, roll_date_et=2025-06-13
2025-09 ES: ESU5 -> ESZ5, roll_date_et=2025-09-14
2025-09 NQ: NQU5 -> NQZ5, roll_date_et=2025-09-14
```

Summary:

```text
case                 stitched  DB rows  overlap  missing stitched/db  max OHLC diff  duplicate keys
2025-03 ES H-to-M       8278     8278     8278        0 / 0             0.50              0
2025-03 NQ H-to-M       8207     8207     8207        0 / 0             3.75              0
2025-06 ES M-to-U       8280     8280     8280        0 / 0             0.25              0
2025-06 NQ M-to-U       8213     8213     8213        0 / 0             2.25              0
2025-09 ES U-to-Z       8269     8269     8269        0 / 0             0.25              0
2025-09 NQ U-to-Z       8274     8274     8274        0 / 0             0.75              0
```

Interpretation:

- The current DB can be reproduced around tested rollover windows by stitching raw contracts with explicit ET roll dates.
- ES differences are only tick-level or sub-tick data-vendor differences.
- NQ has a few larger one-minute differences, but no timestamp/session/row-count mismatch.
- Session boundaries matched the DB in every tested case: no missing rows after stitching and no duplicate `(instrument, ts)` keys.

Decision:

- Step 281.6 passes for the 2025 H/M/U/Z tested windows.
- Future updater design should use explicit roll calendar entries, not formula-only roll inference at first.
- Before broad historical backfill, expand the roll calendar backward for the years that need filling and validate representative windows.

## Open Validation Questions

1. Roll model:
   - Current DB stores continuous `ES` and `NQ`.
   - Databento raw symbols like `ESM5` and `NQM5` are contract-specific.
   - Databento `continuous` symbology does not match the current DB roll behavior in the tested rollover windows.
   - Use raw contracts plus a local roll calendar.
   - Next task is to formalize that local roll calendar.

2. Session/day boundary:
   - 2025 tested roll windows matched DB row counts exactly after raw-contract stitching.
   - Broader non-roll holidays and early closes still need validation before full backfill.

3. Historical gap plan:
   - ES currently extends to 2026-05-22.
   - NQ previously observed ending at 2025-11-04.
   - Need compute exact missing ranges after current DB is rechecked.

4. Daily automation:
   - After validation, build a separate insert-only updater.
   - Schedule it after Historical API is likely complete for the session.
   - Keep an import audit log outside git.

## Recommended Next Steps

1. Validate the draft roll calendar entries in `v4/data_config/futures_roll_calendar.yml`.
2. Design an insert-only updater that reads that calendar and only fills missing `(instrument, ts)`.
3. Keep live journal data research separate from this historical refresh path.

See also:

- `v4/docs/planning/DATABENTO_INSERT_ONLY_UPDATER_PLAN.md`
- `v4/scripts/scan_databento_gaps.py`
