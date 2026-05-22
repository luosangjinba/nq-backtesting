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

## Not Included
- No opportunity review model yet.
- No red folder news integration.

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
- `git diff --check`
- Headless Chrome load check for `http://127.0.0.1:8001/v4/index.html`

## Branch Checkpoint
- Current branch: `feature/v4-market-segments`
- Latest behavior commit: pending direct Archive inspector entry commit.
- This checkpoint records the current TODO/session state after adding the toolbar Archive entry.
- Working tree should have no tracked code changes after the direct Archive inspector entry commit.
- Remaining untracked local files are unrelated workspace artifacts: `__pycache__/`, `tmp/`, `trading_data.duckdb`, `v3/plans/`.

## Next
- Start the opportunity review layer for 930 open / 950 macro / 1000-1100 silver bullet using the existing PDA + segment review bundle.
