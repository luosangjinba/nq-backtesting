# V4 Market Segments Session

## Branch
- `feature/v4-market-segments`

## Goal
- Start Phase 6: explicit 1H market segment system.
- Treat PDA as the map and market segments as the path through PDA.
- Keep the first pass manual and independent from PDA selection/export.

## Completed
- Added design document: `v4/docs/MARKET_SEGMENT_SYSTEM_DESIGN.md`.
- Added segment modules:
  - `v4/src/segment/segment-store.js`
  - `v4/src/segment/manual-segment.js`
  - `v4/src/segment/segment-renderer.js`
- Added `SegmentPrimitive` to `v4/src/chart/primitives.js`.
  - Draws start/end markers.
  - Draws directional line and arrow.
  - Draws a compact label such as `1H UP LEG`.
- Wired segment initialization in `v4/src/app.js`.
- Added right-click menu actions in the existing chart context menu:
  - `Start 1H Segment`
  - `End 1H Segment`
  - `Cancel 1H Segment`
  - `Clear 1H Segments`
- Segment creation is restricted to the `1H` chart timeframe.
- Updated `v4/TODO.md` with Phase 6 steps.

## Current Behavior
- On a `1H` chart, right-click a bar and choose `Start 1H Segment`.
- Right-click another bar and choose `End 1H Segment`.
- A visible segment is drawn between the inferred swing start and end:
  - Up leg: start uses low, end uses high.
  - Down leg: start uses high, end uses low.
- Segment data includes placeholders for future `pdaResponses`, `narrative`, and `tags`.
- Segments are session-only for now.
- Clicking a segment line or endpoint selects it.
- Selected segments render with a brighter, thicker line and larger endpoint markers.
- Inspector shows selected segment metadata, start/end points, direction, and PDA response count.
- Inspector supports editing segment `narrative` and comma-separated `tags`.
- With a segment selected, right-clicking a PDA shows relation choices:
  - `Respected`
  - `Swept`
  - `Approached`
  - `Rejected`
  - `Delivered Through`
- Choosing a relation writes a response into `segment.pdaResponses`.
- Inspector shows linked PDA responses for the selected segment.

## Not Included
- No persistence/export yet.
- No opportunity review model yet.
- No red folder news integration.

## Verification
- `node --check v4/src/app.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/segment/manual-segment.js`
- `node --check v4/src/segment/segment-store.js`
- `node --check v4/src/segment/segment-renderer.js`
- `node --check v4/src/segment/segment-hit-test.js`
- `node --check v4/src/segment/segment-selection.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8001/v4/index.html`

## Next
- Add segment localStorage draft persistence.
- Extend archive export/import to include market segments.
