# V4 FVG Manual Range Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Continue Step 11 one PDA type at a time.
- This session only adds FVG manual annotation and rendering on top of the generic `RangePrimitive`.

## Completed
- Added `v4/src/pda/fvg-identifier.js`.
- FVG identification follows the existing v3 rule:
  - three consecutive candles
  - click as K2 is checked first
  - if that fails, click as K1 or K3 is checked
  - bearish FVG: `K1.low > K3.high`, range `[K3.high, K1.low]`
  - bullish FVG: `K1.high < K3.low`, range `[K1.high, K3.low]`
  - anchor is K2
- Added `Mark FVG` to the chart context menu.
- Successful FVG marking creates a `shape: range` annotation with:
  - `startTime` from K1
  - `endTime` from K3
  - `anchorTime` from K2
  - `topPrice`
  - `bottomPrice`
  - `direction`
  - direction-specific range colors
- Failed FVG detection shows a status error and creates no annotation.

## Not Included
- No OB logic.
- No NDOW/NWOG objective logic.
- No EQH/EQL point-set logic.
- No persistence.

## Verification
- `node --check v4/src/pda/fvg-identifier.js`
- `node --check v4/src/pda/manual-annotation.js`
- Node smoke check confirmed bullish and bearish FVG structures return anchor/start/end/top/bottom/direction.

## 2026-05-24 Correction
- FVG direction naming was corrected to match ICT convention:
  - bullish FVG: `K1.high < K3.low`
  - bearish FVG: `K1.low > K3.high`
- Price range calculation did not change; only `direction` and direction-dependent color semantics changed.

## Next
- Step 11.3: OB range rendering, preferably first as manual selected-candle range before discussing automatic OB identification.
