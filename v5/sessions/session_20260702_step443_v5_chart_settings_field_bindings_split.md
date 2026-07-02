# Step 443 - V5 Chart Settings Field Bindings Split

Status: completed.

Date: 2026-07-02

## Goal

Continue Settings modular cleanup by extracting Settings field rendering and
draft-change event bindings out of the modal controller.

## Plan

1. Identify the field adapter responsibilities still inside
   `chart-settings-panel.js`.
2. Add `chart-settings-bindings.js` for Settings control queries,
   draft-to-control rendering, and control-to-draft event binding.
3. Keep `chart-settings-panel.js` focused on modal lifecycle, tab selection,
   draft lifecycle, apply/cancel, and route callback wiring.
4. Update TODO/session handoff documentation.
5. Run syntax checks, focused browser smokes, full smoke suite, and
   `git diff --check`.

## Implementation

- Added `features/chart-replay/chart-settings-bindings.js` with
  `createChartSettingsBindings(...)`.
- Moved display timezone, presentation, candle, grid, crosshair, background,
  scale, and watermark field render/event logic into the bindings module.
- Updated `chart-settings-panel.js` to delegate draft rendering and draft
  change handlers to the bindings module.
- Kept modal open/close, backdrop/cancel handling, tab switching, draft
  lifecycle, and apply callback wiring in `chart-settings-panel.js`.
- Reduced `chart-settings-panel.js` from 389 lines to 110 lines.

## Boundary Notes

- `chart-settings-bindings.js` owns Settings field DOM adapters only.
- Bindings may mutate only the active Settings draft object returned by the
  panel controller.
- Bindings must not dispatch commands, emit events, write chart adapters, touch
  replay/bar-data state, or persist settings directly.
- `chart-settings-panel.js` remains the route-local Settings modal controller.

## Verification

- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-settings-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-template.js`
- `node --check v5/src/features/chart-replay/chart-settings-draft.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 444 can either split `chart-settings-bindings.js` into section-specific
adapters or move to the next large file with a clearer immediate boundary.
