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
- Segment localStorage draft persistence saves and restores manual segments across page reloads.
- Inspector supports deleting the selected segment.
- Inspector supports showing/hiding the selected segment label.
- Inspector supports editing/removing linked PDA responses and adding per-response notes.
- Selecting a segment highlights linked PDA annotations from `segment.pdaResponses`.
- Each PDA response has a display mode (`highlight`, `normal`, `hidden`) that controls selected-segment PDA rendering.
- Segment display settings include isolate mode. When enabled, only that segment and its linked PDA render until isolate is unchecked, even if the segment loses selection focus.
- The segment itself also has an isolate display mode (`highlight`, `normal`, `hidden`).
- Selecting a segment or creating a new segment resets every segment group object display mode back to `highlight`.
- When isolate mode is active, selecting or creating a segment does not reset PDA response display modes.
- `hidden` display mode means not rendered while keeping the object in the segment data.
- In isolate mode, the segment's own `normal` display mode renders immediately as normal even while the segment remains selected.
- Inspector Archive now supports `Export Review JSON` / `Import Review JSON`.
- Review JSON exports PDA annotations and market segments together, including `segment.pdaResponses`.
- Review import merges PDA first and remaps response `pdaId` values when imported PDA ids are renamed or resolved to existing duplicates.
- Segment import handles id conflicts, skips semantic duplicates, filters orphan PDA responses, and forces imported segment isolate state off.
- The top toolbar has an `Archive` button that opens Inspector directly to Archive actions without selecting a PDA or segment first.
- Inspector render code has been split into `v4/src/ui/inspector/archive-panel.js`, `pda-panel.js`, `segment-panel.js`, and `render-utils.js`; `inspector-sidebar.js` now keeps panel state and event handling.
- Fib PDA MVP is available:
  - Right-click `Start Fib`, then Shift + right-click the ending bar.
  - Fib uses `type: fib` and `shape: fib-retracement`.
  - Default levels are `1`, `0.79`, `0.705`, `0.62`, `0.5`, `0.236`, `0`.
  - Fib supports chart rendering, hit-test selection, selected/segment-linked highlight, Inspector level prices, and PDA archive import/export.
  - `Show current PDA label` controls Fib's left-side level value labels.
- Right-click `Clear PDA` removes all PDA annotations and now also clears every segment's `pdaResponses`, while keeping segment objects.

## Not Included
- No opportunity review model yet.
- No red folder news integration.
- No Breaker PDA yet.
- No SMT/multi-instrument data or multi-window display yet.

## Verification
- `node --check v4/src/app.js`
- `node --check v4/src/pda/manual-annotation.js`
- `node --check v4/src/chart/primitives.js`
- `node --check v4/src/segment/manual-segment.js`
- `node --check v4/src/segment/segment-store.js`
- `node --check v4/src/pda/pda-renderer.js`
- `node --check v4/src/segment/segment-persistence.js`
- `node --check v4/src/segment/segment-renderer.js`
- `node --check v4/src/segment/segment-hit-test.js`
- `node --check v4/src/segment/segment-selection.js`
- `node --check v4/src/ui/inspector-sidebar.js`
- `node --check v4/src/ui/toolbar.js`
- `node --check v4/src/segment/segment-store.js`
- `node --check v4/src/pda/pda-archive.js`
- `node --check v4/src/review/review-archive.js`
- `node --check v4/src/ui/inspector/archive-panel.js`
- `node --check v4/src/ui/inspector/pda-panel.js`
- `node --check v4/src/ui/inspector/render-utils.js`
- `node --check v4/src/ui/inspector/segment-panel.js`
- `node --check v4/src/pda/pda-hit-test.js`
- `node --check v4/src/pda/pda-store.js`
- `node --check v4/src/pda/pda-types.js`
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8001/v4/index.html`

## Branch Checkpoint
- Current branch: `main`
- Latest behavior commit: `97dd415 feat(v4): add fib PDA retracement`
- This checkpoint records the current TODO/session state after Fib PDA MVP and Clear PDA response cleanup.
- Working tree should have no tracked code changes after the Clear PDA response cleanup commit.
- Remaining untracked local files are unrelated workspace artifacts: `__pycache__/`, `tmp/`, `trading_data.duckdb`, `v3/plans/`.

## Next
- Add Breaker PDA as the next manual range PDA.
- Draft SMT design before implementation because it requires ES data, multi-instrument state, and likely multi-window or synchronized chart display.

## 2026-05-25 Follow-up: Structure Sets Locate List

## Goal
- Treat each segment/composite as a drawable structure set for navigation.
- First version only supports locating; it does not add temporary visibility controls.

## Implementation
- Added `v4/src/segment/drawing-set-list.js`.
  - Builds readonly list items from current segments and composite moves.
  - Segment item range uses segment endpoint timestamps, preferring occurrence timestamps when available.
  - Composite item range uses first child segment start and last child segment end.
  - `locateDrawingSet(type, id)` selects the target segment/composite and scrolls the chart to its range.
- Extended `v4/src/chart/viewport-controller.js`.
  - Added `locateTimestampRange(startTimestamp, endTimestamp)`.
  - It maps timestamps to nearest loaded display-bar indexes and sets a logical range around them.
  - It calls `chart.resetPriceScale()` after positioning.
- Updated `v4/src/ui/inspector-sidebar.js`.
  - Inspector empty state now shows `Structure Sets`.
  - Clicking a row selects the segment/composite and locates it on the chart.
- Updated `v4/style.css`.
  - Added compact row styling for the structure set list.

## Boundary
- Does not change Display Mode.
- Does not hide/show any segment, composite, or PDA.
- Does not persist any new state.
- Does not write to Review JSON.

## Verification
- `node --check v4/src/segment/drawing-set-list.js`
- `node --check v4/src/chart/viewport-controller.js`
- `node --check v4/src/ui/inspector-sidebar.js`
