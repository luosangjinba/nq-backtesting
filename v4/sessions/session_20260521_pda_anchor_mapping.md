# V4 PDA Anchor Mapping Session

## Branch
- `feature/v4-manual-pda`

## Problem
- Manual point annotations stored the original chart `anchorTime`.
- A point marked on 1H at `2012-01-12 04:00` disappeared after switching to 4H because the 4H chart only has a `2012-01-12 02:00` bucket.

## Completed
- Exported `getBucketStart()` from `pda-context.js`.
- `pda-renderer.js` now maps annotation timestamps to the current chart timeframe before drawing.
- Point annotations use:
  - `canonicalTimestamp`
  - fallback `timestamp`
  - fallback `anchorTime`
- Intraday render mapping uses the current timeframe bucket start.
- Daily render mapping converts the CME session start to the trading-day date string used by the chart.

## Verification
- `node --check v4/src/pda/pda-context.js`
- `node --check v4/src/pda/pda-renderer.js`
- Node smoke check:
  - `2012-01-12 04:00` maps to `2012-01-12 02:00` on 4H
  - `2012-01-12 04:00` maps to `2012-01-12` on D

## Note
- This fixes rendering location only.
- It does not reintroduce intraday bucket context labels such as `4H low`.
