# Step 445 - V5 Chart Settings Section Bindings Split

Status: completed.

Date: 2026-07-02

## Goal

Continue splitting `chart-settings-bindings.js` by moving Settings field
adapters into section-local modules.

## Plan

1. Identify section-level field adapter responsibilities inside
   `chart-settings-bindings.js`.
2. Add Symbol, Status, Scales, and Canvas bindings modules.
3. Convert root `chart-settings-bindings.js` into a small adapter composer.
4. Preserve draft-only mutation and route-owned apply/cancel/runtime boundaries.
5. Update TODO/session handoff documentation and run syntax checks, focused
   smokes, full smoke suite, and `git diff --check`.

## Implementation

- Added `chart-settings-symbol-bindings.js` for display timezone, time format,
  and candle style controls.
- Added `chart-settings-status-bindings.js` for status title mode and
  status/readout/countdown toggles.
- Added `chart-settings-scales-bindings.js` for date/right offset, price/time
  scale toggles, price scale side, and crosshair controls.
- Added `chart-settings-canvas-bindings.js` for margins, background, grid,
  scale text/lines, and watermark controls.
- Reduced root `chart-settings-bindings.js` from 327 lines to a 31-line adapter
  composer.

## Boundary Notes

- Section adapters own only their section's DOM field queries,
  draft-to-control rendering, and control-to-draft handlers.
- Section adapters may mutate only the active Settings draft object supplied by
  the panel controller.
- Section adapters must not dispatch commands, emit events, write chart
  adapters, touch replay/bar-data state, or persist settings directly.
- `chart-settings-bindings.js` composes section adapters only.

## Verification

- `node --check v5/src/features/chart-replay/chart-settings-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-symbol-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-status-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-scales-bindings.js`
- `node --check v5/src/features/chart-replay/chart-settings-canvas-bindings.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next Step Candidate

Step 446 should move to the next large file with a clear product-facing
boundary unless there is a concrete Settings section behavior to isolate.
