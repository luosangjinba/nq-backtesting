# V6 Pane Maximize / Restore Control - Step 186

## Decision

Step 186 wires pane maximize / restore controls into the pane action rail.

Each pane now has a maximize button next to reset view. Clicking it calls the
chart surface maximize/restore API introduced in Step 185. The button switches
between `Maximize chart` and `Restore chart` based on the selected pane's
maximize state.

## Boundary

- `maximize-restore-control-bridge` owns DOM button wiring only.
- The bridge calls `workstation-chart-surface.maximizePane()` and
  `restorePane()`.
- Reset view remains wired through `reset-view-control-bridge`.
- Chart data, replay, bar-data, viewport, layout runtime, and pane runtime
  ownership did not change.

## Accepted Behavior

- Every pane action rail has a maximize/restore button and a reset button.
- The maximize/restore button keeps `title`, `aria-label`, visible screen-reader
  label, and dataset state in sync.
- Clicking maximize shows only that pane.
- Clicking the same button again restores the prior layout.
- Reset view remains pane-local and keeps its existing `data-v6-reset-pane-id`
  routing.

## Coverage

- `maximize-restore-control-bridge-step186-smoke.js` covers bridge state
  toggling and cleanup.
- `maximize-restore-control-browser-step186-smoke.js` covers real browser
  button clicks, label/title switching, host visibility, and reset button
  co-location.
- `chart-browser-regression-pack.js` includes the Step 186 browser smoke.

## Verification

- `node v6/tests/maximize-restore-control-bridge-step186-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/maximize-restore-control-browser-step186-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

Step 187 should return to the replay-safe leftward history latency gate. The
gate should prove canvas-left historical requests remain bounded and replay
does not visibly stall while older bars are extended.
