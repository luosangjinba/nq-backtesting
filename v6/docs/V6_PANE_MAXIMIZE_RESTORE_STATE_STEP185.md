# V6 Pane Maximize / Restore State - Step 185

## Decision

Step 185 adds the pane maximize / restore state model to the chart surface.

The chart surface can now show a single selected pane while preserving the prior
layout snapshot. Restore re-applies the saved layout without touching chart
data, viewport intent/projection, replay cursor, or bar-data state.

## Boundary

- `workstation-chart-surface` owns the display-only maximize state.
- The existing layout runtime and layout bridge still own normal layout mode
  changes.
- The chart surface does not request bars, mutate chart-data records, reset
  viewport intent, or advance replay while maximizing/restoring.
- Resize is still delegated to the chart host manager after host visibility and
  grid templates change.

## Accepted Behavior

- `maximizePane(paneId)` stores the current layout snapshot as restore state.
- While maximized, only the selected pane is visible.
- Pane resize handles are hidden while maximized.
- `restorePane()` restores the prior mode, variant, visible pane list, and pane
  resize ratios.
- Chart data, viewport snapshot, and replay state are unchanged across
  maximize/restore.
- Applying a normal layout snapshot while maximized updates the restore target
  but keeps the selected pane maximized.

## Coverage

- `pane-maximize-state-step185-smoke.js` covers the surface state model,
  preserve/restore behavior, pane resize ratio preservation, and no chart data
  or viewport writes.
- `pane-maximize-state-browser-step185-smoke.js` covers real app DOM visibility
  and verifies chart-data, viewport, and replay snapshots are stable.
- `chart-browser-regression-pack.js` now includes the maximize/restore browser
  smoke.

## Verification

- `node v6/tests/pane-maximize-state-step185-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Direction

Step 186 should add the pane action rail maximize/restore button bridge. The
button should call the chart surface state API, switch its label/icon state
between maximize and restore, and keep reset view behavior unchanged.
