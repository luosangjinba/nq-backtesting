# V4 PDA HTF Context Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Complete Step 10 by adding exact HTF context checks for manually selected PDA points.
- Keep `main` clean; this work remains on `feature/v4-manual-pda`.

## Completed
- Manual PDA context now fetches the selected bar's full CME trading day as 1M source data.
- Bucket-extrema context labels are limited to D plus session/midnight.
- Intraday bucket labels such as 4H low, 1H low, 30M low, 15M low, 5M low, and 1M low were removed because they describe bucket membership, not structural swing points.
- Intraday structure quality is handled separately by advisory swing validation.
- Current timeframe bucket context is only present on D; intraday current-timeframe bucket labels are intentionally omitted.
- Session high/low and midnight context still run from the same full-day source.
- Full context remains stored on each annotation and is shown in the status bar.
- Chart labels use a compressed primary context:
  - D context when present
  - supplemental non-timeframe context, such as session or midnight, remains visible
- Manual annotations are deduped across timeframe views:
  - each annotation gets a `canonicalTimestamp` from the latest matching 1M source bar inside the selected chart bar
  - store identity is `source/type/price/canonicalTimestamp`
  - repeated marking of the same high/low from another timeframe merges contexts and updates the current chart anchor instead of creating a second rendered PDA

## Rules
- Aggregation source:
  - full CME trading day 1M bars only
  - chart display bars are used only as a fallback if source loading fails
- Context source cache key:
  - `instrument:source:1M:tradingDay`
  - example: `NQ:source:1M:2012-01-09`
- HTF aggregation boundaries:
  - D: CME trading day, previous day 18:00 through current day 16:59
- Cross-timeframe alignment:
  - use the currently selected chart bar interval as the selection window
  - inspect the overlapping D bucket
  - add `D high` or `D low` only when selected BSL/SSL price equals the daily bucket high/low
  - when multiple current-timeframe bars have the same D high/low, only the latest current-timeframe bar is the representative point for that D context

## Verification
- `node --check v4/src/pda/pda-context.js`
- `node --check v4/src/pda/pda-context-data.js`
- `node --check v4/src/pda/manual-annotation.js`
- Node module smoke check confirmed intraday bucket labels are not emitted.
- Node module smoke check confirmed D context and session context can still be emitted from 1M source bars.
- Node module smoke check confirmed equal highs inside one D bucket assign the D label only to the latest equal-high current-timeframe bar.
- Node module smoke check confirmed repeated manual annotations with the same canonical timestamp merge into one store record and keep merged contexts sorted.

## Next
- Step 11: extend PDA renderer beyond BSL/SSL liquidity lines into rectangle/range rendering.
- Step 12: objective PDA show/hide commands for NDOW/NWOG.
- Step 13: EQH/EQL point-set grouping.
