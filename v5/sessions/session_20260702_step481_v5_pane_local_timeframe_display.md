# Step 481 - V5 Pane-Local Timeframe Display

## Goal

Fix the two-pane vertical TF bug where changing the left pane TF rewrote both
panes, while changing the right pane TF updated layout state but did not redraw
the right chart.

## Result

- Chart runtime now keeps optional pane-local bars/display context keyed by
  pane id.
- `chart.replaceBars` and `chart.setDisplayContext` accept optional `paneId`.
- Host sync resolves bars/display context per mounted chart host.
- Replay display loading can render a non-primary pane without mutating global
  replay display state.
- Active-pane TF changes now reload the target pane through replay runtime.
- Browser smoke covers `twice.vertical`: clicking the right pane center,
  changing TF, and verifying the left pane stays at the original TF.

## Boundaries

- Layout runtime owns pane `displayTimeframe`.
- Replay runtime still owns bar loading and no-future filtering.
- Chart runtime remains the only chart writer.
- Route UI dispatches commands only and does not request bars directly.

## Verification

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/src/runtime/replay-chart-sync.js`
- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-runtime-display-context-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`

## Next

Step 482 should continue broader split-pane hardening across all layout
variants after resize and active-pane changes.
