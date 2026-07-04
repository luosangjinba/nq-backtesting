# Step 508 - Multi-Pane Default Active Pane And Replay Follow

Date: 2026-07-04

## Trigger

Manual testing found two multi-pane behavior gaps:

- switching from single pane to two vertical panes kept the left/primary pane
  active, but the desired initial active pane is the right pane;
- replay `Next` advanced only the primary pane while the secondary pane stayed
  frozen, even when both panes used the same timeframe.

## Implementation

- Added layout-runtime mode-change active-pane selection:
  - from single to `twice.vertical`, initial active pane becomes `secondary`
    (right pane);
  - from single to `twice.horizontal`, initial active pane remains `primary`
    (upper pane);
  - existing active pane is preserved when changing variants with multiple
    panes already present.
- Added pane orchestrator replay-next following for non-primary panes:
  - same-timeframe panes receive `chart.appendBars` through chart runtime;
  - different-timeframe panes request a replay display window through replay
    runtime;
  - route UI still does not write chart series or request bars directly.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `git diff --check`

## Status

Completed.
