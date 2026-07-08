# V6 Pane Action Rail - Step 184

## Decision

Step 184 introduces a pane-local chart action rail and moves reset view into
that rail.

The reset button no longer sits against the chart host's right edge, where it
can overlap the Lightweight Charts price axis. Each visible pane keeps its own
reset control, and the control still dispatches through the existing reset view
bridge for the matching `paneId`.

## Boundary

- The action rail is shell DOM/CSS only.
- `reset-view-control-bridge` continues to own reset button wiring.
- `chartViewport.resetView` remains the reset command boundary.
- Chart-engine still owns chart series and surface projection.
- Replay, bar-data, chart-data, viewport, layout, and pane runtimes were not
  changed.

## Accepted Behavior

- Every pane has a `chart-pane-action-rail`.
- The reset button is inside that rail.
- The reset button remains pane-local through `data-v6-reset-pane-id`.
- The reset button is offset from the pane's right edge to avoid the price axis.
- Existing pane-local reset behavior remains unchanged.

## Coverage

- `pane-action-rail-browser-step184-smoke.js` verifies all visible panes have an
  action rail and that reset buttons are offset away from the right price-axis
  region.
- `pane-local-reset-controls-browser-step163-smoke.js` still verifies reset
  command routing remains pane-local.
- `chart-browser-regression-pack.js` now includes the pane action rail browser
  smoke.

## Verification

- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

Step 185 should add the maximize/restore pane state model. Keep it separate
from this rail migration so the first maximize pass can focus on preserving the
previous layout, pane data, viewport projection, and replay state while showing
only the selected pane.
