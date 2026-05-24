# V4 IFVG PDA Session

## Branch
- `research/v4-review-notes-design`

## Goal
- Add `IFVG` as a separate PDA type.
- Reuse FVG three-candle detection and range rendering, but invert the direction semantics.

## Implementation
- Added `ifvg` to PDA type registries:
  - `v4/src/pda/pda-types.js`
  - `v4/src/config.js`
- Added `Mark IFVG` to the chart context menu.
- Reused `identifyFvg()` for the three-candle structure.
- `IFVG` annotations are written with:
  - `type: 'ifvg'`
  - `direction` inverted from the matched FVG direction
  - same `startTime`, `endTime`, `anchorTime`, `topPrice`, `bottomPrice`, and `ce` structure as FVG
- IFVG uses one fixed yellow range style:
  - color `#fdd835`
  - fill `#fdd83533`
  - text `#fff9c4`
- Renderer treats IFVG like FVG for transparent range border behavior, but does not apply FVG bullish/bearish color fallback to IFVG.

## Docs
- Updated Inspector help and Chinese/English user guides to include `Mark IFVG`.
- Updated `v4/TODO.md` with the IFVG architecture note.

## Verification
- `node --check v4/src/config.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/pda/pda-types.js`

## Not Implemented
- No automatic IFVG scanning.
- No dedicated IFVG metrics beyond existing range PDA reaction behavior.
