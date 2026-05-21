# V4 PDA Range Renderer Session

## Branch
- `feature/v4-manual-pda`

## Goal
- Start Step 11 without mixing different PDA business logic.
- This session only adds the generic range/rectangle rendering foundation.

## Completed
- Added `RangePrimitive` in `v4/src/chart/primitives.js`.
- `RangePrimitive` supports:
  - `startTime`
  - `endTime`
  - `topPrice`
  - `bottomPrice`
  - fill color
  - border color
  - optional midline
  - optional label
  - `attached/requestUpdate` lifecycle
- Kept existing `FvgPrimitive` intact for compatibility.
- Updated `pda-renderer.js`:
  - `shape: liquidity-line` still uses `LiquidityPrimitive`
  - `shape: range` now uses `RangePrimitive`
  - range annotation fields can be `topPrice/bottomPrice` or `priceHigh/priceLow`
- Updated `pda-store.js` identity rules so range annotations dedupe by source/type/range/time rather than point price.

## Not Included
- No FVG right-click command yet.
- No FVG identification logic yet.
- No OB command or OB identification yet.
- No NDOW/NWOG objective show/hide logic yet.
- No EQH/EQL point-set rendering.

## Verification
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/pda-store.js`
- Node import smoke check confirmed `RangePrimitive` exports.
- Node store smoke check confirmed duplicate range annotations merge into one record with sorted merged contexts.

## Next
- Step 11.2: FVG-only manual annotation and rendering.
