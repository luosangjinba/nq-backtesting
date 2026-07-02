# Step 468 - V5 Crosshair Sync And Multi-Pane Acceptance

Date: 2026-07-02

Status: completed.

## Goal

Implement `sync.crosshair` through layout pane metadata and complete the bounded
Step 463-468 multi-pane acceptance sequence.

## Summary

- Added pane-level `crosshair` metadata to layout state.
- Added `layout.setPaneCrosshair`.
- With `sync.crosshair` off, crosshair metadata updates only the target pane.
- With `sync.crosshair` on, crosshair metadata mirrors to all panes.
- Kept chart runtime as the crosshair event source; the chart route only mirrors
  normalized metadata into layout when the sync toggle is enabled.
- Exposed pane shell crosshair metadata for browser acceptance.
- Extended multi-pane browser smoke coverage for interval, time/date-range, and
  crosshair sync together.

## Boundaries

- Route UI does not write chart series.
- Route UI does not request bars.
- Crosshair sync does not mutate replay cursor or reveal state.
- Chart runtime remains responsible for crosshair events and chart writes.
- Replay runtime remains responsible for cursor/reveal and no-future state.

## Checks

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `git diff --check`

## Next Candidate

Step 469 should decide the next product direction after the multi-pane
acceptance sequence: either make secondary/tertiary panes real chart hosts, or
return to Settings polish with the same module-boundary discipline.
