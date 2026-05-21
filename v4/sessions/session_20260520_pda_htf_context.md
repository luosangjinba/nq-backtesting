# V4 PDA HTF Context Session

## Branch
- `feature/v4-pda-htf-context`

## Goal
- Complete Step 10 by adding exact HTF context checks for manually selected PDA points.
- Keep `main` clean; this branch starts from `feature/v4-manual-pda` commit `edf3380`.

## Completed
- Manual PDA context now fetches the selected bar's full CME trading day as 1M source data.
- HTF context checks aggregate that 1M source in the frontend for:
  - 15M
  - 30M
  - 1H
  - 4H
  - D
- BSL/SSL manual points now receive an HTF label when the selected price is also the overlapping HTF bucket high/low.
- Current timeframe context remains present, with duplicate labels deduped.
- Session high/low and midnight context still run from the same full-day source.

## Rules
- Aggregation source:
  - full CME trading day 1M bars only
  - chart display bars are used only as a fallback if source loading fails
- Context source cache key:
  - `instrument:source:1M:tradingDay`
  - example: `NQ:source:1M:2012-01-09`
- HTF aggregation boundaries:
  - 15M / 30M / 1H: backend-compatible 00:00 wall-clock anchor
  - 4H: backend-compatible 02:00 / 06:00 / 10:00 / 14:00 / 18:00 / 22:00 anchor
  - D: CME trading day, previous day 18:00 through current day 16:59
- Cross-timeframe alignment:
  - use the currently selected chart bar interval as the selection window
  - inspect every target HTF bucket that overlaps that interval
  - add `<TF> high` or `<TF> low` only when selected BSL/SSL price equals that bucket's high/low

## Verification
- `node --check v4/src/pda/pda-context.js`
- `node --check v4/src/pda/pda-context-data.js`
- `node --check v4/src/pda/manual-annotation.js`
- Node module smoke check confirmed a 30M selected point can produce 15M / 1H / 4H / D context labels from 1M source bars.

## Next
- Step 11: extend PDA renderer beyond BSL/SSL liquidity lines into rectangle/range rendering.
- Step 12: objective PDA show/hide commands for NDOW/NWOG.
- Step 13: EQH/EQL point-set grouping.
