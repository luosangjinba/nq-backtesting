# Session 2026-05-27: SMT ES Data Prep

## Goal

为后续 SMT 工作准备与 NQ 时间范围基本一致的 ES 1m 数据，并确认现有 V4 数据通路可以读取 ES。

## Data Source

- Source CSV: `ES.csv`
- Header: `时间,开盘价,最高价,最低价,收盘价,成交量`
- CSV rows: 6,431,985 data rows
- Source range: `2008-01-02 06:01` to `2026-05-22 16:59`

## Implementation

- Updated `duckdb_import_nq_1m.py` to treat the importer as a generic 1-minute futures CSV importer.
- Added English/Chinese field aliases so streaming normalization accepts both:
  - `datetime/time/timestamp/date/时间`
  - `open/开盘价`
  - `high/最高价`
  - `low/最低价`
  - `close/收盘价`
  - `volume/vol/成交量`
- The fast DuckDB import path remains positional and skips the header, so `ES.csv` does not need to be rewritten just to change the Chinese header.

## Import Result

Imported ES into `trading_data.duckdb` table `futures_1m` with `instrument='ES'`.

Current table summary:

| instrument | rows | min ts | max ts |
| --- | ---: | --- | --- |
| ES | 6,431,985 | 2008-01-02 06:01 | 2026-05-22 16:59 |
| NQ | 5,906,274 | 2008-01-02 06:01 | 2025-11-04 18:39 |

Validation:

- `ES` null timestamps: 0
- `ES` duplicate timestamps: 0
- `python -m py_compile duckdb_import_nq_1m.py`: passed
- `iter_normalized_rows()` correctly parsed the Chinese header and first ES rows.
- V4 API `curl` checks returned ES 1M and 1H bars through `/v4/bars?instrument=ES...`.

## Notes

- Do not commit `ES.csv` or `trading_data.duckdb`; they remain local data assets.
- `v4_api.py` already accepts `instrument`; no backend API schema change was required for basic ES reads.
- Next SMT prep should add a Split Screen secondary instrument selector so the secondary chart can request `instrument=ES` while the primary chart remains `NQ` (and vice versa later).

## Split Screen Instrument Selector

Implemented the first SMT UI prep step:

- Added `INSTRUMENT_OPTIONS = ['NQ', 'ES']` and ES tick config.
- Added secondary chart `instrument` state, defaulting to `ES`.
- Added toolbar `Sub` instrument selector next to `Split` / `Sub TF`.
- Secondary chart reloads when `Sub` changes and calls `/v4/bars` with the selected instrument.
- Layout-only Split Screen changes still do not reload data.
- `Sub`, `Sub TF`, and `Layout` remain editable while Split is off, so the secondary chart can be preconfigured before enabling Split.

Validation:

- `node --check` passed for all `v4/src/**/*.js`.
- Headless Chrome DOM check confirmed the page initializes, the `Sub` selector is present, defaults to `ES`, and `Sub` / `Sub TF` / `Layout` are editable while Split is off.
