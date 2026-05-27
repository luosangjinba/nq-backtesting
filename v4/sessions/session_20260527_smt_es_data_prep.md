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

## SMT Observation Foundation

Implemented the next three Phase 1 observation items:

- Added a secondary chart info label showing the active secondary instrument and timeframe, for example `ES 1H` or `NQ 1M`.
- Added a secondary chart OHLC legend that updates from the secondary chart crosshair and uses the active secondary instrument price formatter.
- Verified primary/secondary alignment and reload behavior in headless Chrome:
  - Split off leaves `Sub` / `Sub TF` / `Layout` editable.
  - Enabling Split after primary load uses the preconfigured `Sub=ES`, `Sub TF=1H`, and loads 41 ES bars for `2012-01-25 09:00` to `2012-01-25 12:00`.
  - Layout change from Stack to Side does not reload data.
  - `Sub TF` change to 1M reloads the same absolute range and loads 218 ES bars.
  - `Sub` change from ES to NQ reloads the same absolute range and updates the label to `NQ 1M`.
  - Moving the mouse over the secondary chart updates the secondary OHLC legend.

## New Thread Handoff

Use this section to resume after `new`.

Current branch:

- `feature/smt-es-split-prep`

Committed work:

- `998e809 feat(v4): prepare ES split screen for SMT`
- `9cf6242 feat(v4): add SMT split observation aids`

Current git state at handoff:

- No uncommitted tracked changes.
- Local untracked data/temp files are expected and should not be committed:
  - `ES.csv`
  - `trading_data.duckdb`
  - `__pycache__/`
  - `tmp/`
  - `v3/plans/`

What is done:

- ES 1m data has been imported locally into `trading_data.duckdb.futures_1m` as `instrument='ES'`.
- V4 API already reads ES through `/v4/bars?instrument=ES...`.
- Split Screen secondary chart supports `Sub=NQ|ES`, defaults to ES, and can be preconfigured while Split is off.
- Secondary chart shows instrument/timeframe label and hover OHLC legend.
- Alignment/reload behavior has been verified through headless Chrome.

Next implementation step:

- Start SMT manual annotation MVP.
- Suggested order:
  1. Add `v4/src/smt/smt-store.js` for in-session SMT records.
  2. Add minimal SMT record schema for manual `liquidity-divergence` and `fvg-reaction-divergence`.
  3. Add simple renderer markers/window overlay on primary and secondary charts.
  4. Add Inspector or right-click entry to create/edit/delete SMT records.
  5. Add Review JSON/localStorage persistence only after the manual create/edit flow is stable.

Constraints to preserve:

- Keep secondary chart readonly for now; do not add independent PDA/segment editing to ES.
- Do not implement automatic SMT verdict or full-market auto scan yet.
- Keep SMT as cross-instrument review evidence, separate from PDA/segment stores, with optional links to segment/PDA later.

## Updated SMT Manual Annotation Plan

User clarified the final first-version SMT requirements:

- Only support `NQ follows ES`; do not implement `ES follows NQ`.
- SMT marking is manual only.
- All SMT annotation actions must happen on the chart.
- Inspector/right panel is for display, note editing, locating, and deletion only.
- First version FVG SMT is single-timeframe only; no cross-timeframe projection.

### Liquidity SMT Semantics

Bearish:

- NQ has two highs; the right high does not sweep the left high.
- ES has the same-time two highs; the right high sweeps the left high.
- NQ follows ES into a downside reversal.

Bullish:

- NQ has two lows; the right low does not sweep the left low.
- ES has the same-time two lows; the right low sweeps the left low.
- NQ follows ES into an upside reversal.

Important implementation constraint:

- `NQ left time === ES left time`.
- `NQ right time === ES right time`.
- Therefore the user only needs to select left K and right K on the chart.
- Bearish liquidity SMT uses high prices.
- Bullish liquidity SMT uses low prices.
- Save the annotation timeframe because low-timeframe SMT may not be visible on high timeframe.

Liquidity display:

- Draw a two-point line on NQ.
- Draw a two-point line on ES.
- Only show the line when current chart timeframe equals the SMT record timeframe.

### FVG SMT Semantics

- ES respects an FVG and moves up/down.
- At the same time, NQ has no corresponding FVG but follows ES up/down.
- FVG SMT only needs timeframe + timestamp because `ES + timeframe + timestamp` identifies the ES FVG.
- ES chart displays the FVG normally.
- NQ chart only marks the corresponding K line.
- First version shows FVG SMT only on the original timeframe; no high-to-low projection and no low-to-high aggregation.

### Planned Data Model

Common fields:

- `id`
- `type: liquidity | fvg`
- `direction: bullish | bearish`
- `timeframe`
- `primaryInstrument: NQ`
- `compareInstrument: ES`
- `source: manual`
- `note`
- `createdAt / updatedAt`

Liquidity fields:

- `leftTimestamp`
- `rightTimestamp`
- `primaryLeftPrice / primaryRightPrice`
- `compareLeftPrice / compareRightPrice`
- `primarySwept: false`
- `compareSwept: true`

FVG fields:

- `timestamp`
- `fvgStartTimestamp / fvgEndTimestamp`
- `fvgTop / fvgBottom`
- `primaryHasFvg: false`
- `reactionMove: up | down`

### Planned Implementation Order

1. Add `v4/src/smt/smt-store.js` with normalize, identity, add/update/delete/load APIs.
2. Add `v4/src/smt/smt-renderer.js`; first verify rendering from manually constructed records.
3. Add `v4/src/smt/manual-smt.js` for Liquidity SMT two-click chart workflow.
4. Add Inspector SMT list only: summary, note, locate, delete.
5. Add `v4/src/smt/smt-persistence.js` localStorage.
6. Extend Review JSON with `smtEvidence[]`.
7. Add FVG SMT chart workflow and ES FVG identification.
8. Validate with browser workflow:
   - Liquidity bearish and bullish create lines on NQ/ES.
   - FVG SMT displays ES FVG and NQ marker.
   - Non-original timeframe hides SMT.
   - localStorage restores.
   - Review JSON import/export preserves SMT.

## Current Handoff Update

As of 2026-05-27 after the SMT planning update:

- No SMT annotation code is currently present; the previous form-based SMT implementation was intentionally reverted.
- Current branch remains `feature/smt-es-split-prep`.
- Current HEAD remains `1df1d61 docs(v4): add SMT handoff notes`.
- The only tracked working-tree changes are documentation updates:
  - `v4/TODO.md`
  - `v4/sessions/session_20260527_smt_es_data_prep.md`
- Expected local untracked files remain:
  - `ES.csv`
  - `trading_data.duckdb`
  - `__pycache__/`
  - `tmp/`
  - `v3/plans/`

Next coding step:

1. Implement `smt-store` from the updated data model.
2. Implement renderer against manually constructed test records before adding chart interaction.
3. Implement Liquidity SMT chart-based two-click workflow first.
4. Add Inspector list only after chart-based creation works.

## SMT Annotation UI Branch

Created branch:

- `feature/smt-annotation-ui`

Implemented first UI slice:

- Added `v4/src/smt/smt-store.js`.
  - Supports manual `liquidity` and `fvg` SMT records.
  - Fixed instrument pair is `NQ follows ES`.
  - Records carry `timeframe`.
- Added `v4/src/smt/smt-renderer.js`.
  - Liquidity SMT draws two-point lines on both NQ and ES.
  - FVG SMT draws ES FVG range and an NQ vertical marker.
  - Records render only when the current chart timeframe matches `record.timeframe`.
- Added `v4/src/smt/manual-smt.js`.
  - Right-click menu starts SMT workflows.
  - Liquidity: right-click left K, then left-click right K.
  - FVG: right-click menu action, then left-click the time that should identify the ES FVG.
  - Requires Split on, Sub=ES, and primary/sub timeframes to match.
  - Liquidity validation enforces NQ no-sweep and ES sweep before creating a record.
- Added `v4/src/ui/inspector/smt-panel.js`.
  - Inspector shows SMT Evidence list.
  - Supports note editing, Locate, and Delete.
  - No form-based creation.
- Wired SMT modules through `app.js` and PDA context menu actions.

Validation performed:

- `find v4/src -name '*.js' -exec node --check {} \;`: passed.
- `git diff --check`: passed.
- Node smoke test created one liquidity and one FVG SMT record through `smt-store`.
- Headless Chrome initialization against `http://127.0.0.1:8013/v4/index.html`: passed; Inspector renders SMT Evidence list prompt.

Still pending:

- Full browser interaction test with real NQ/ES loaded bars.
- localStorage persistence for SMT.
- Review JSON `smtEvidence[]`.
- Better FVG SMT marker rendering on NQ, if a vertical marker is too visually broad.

## Context Menu Usability Update

Implemented after SMT UI merge:

- Added `Locate Time in Secondary` to the main NQ chart right-click menu.
  - It scrolls the secondary chart to the nearest bar with the same timestamp.
  - It also shows the secondary hover cursor at the matched secondary bar.
  - It reports a status error if Split is off or secondary bars are not loaded.
- Fixed the long context menu issue.
  - Menu positioning now uses the actual 220px menu width.
  - Near the bottom of the canvas, the menu is moved upward.
  - If it still cannot fit, the menu scrolls internally.
  - Menu items are now grouped with native collapsible `details/summary`.
  - `PDA` is open by default.
  - `SMT`, `1H Segments`, `Point Sets`, `Objective Gaps`, and `Clear` are collapsed by default.
  - Active/context-specific groups, such as an active segment or point-set flow, can open by default.

Validation:

- `node --check v4/src/pda/manual-annotation.js`: passed.
- `git diff --check`: passed.
