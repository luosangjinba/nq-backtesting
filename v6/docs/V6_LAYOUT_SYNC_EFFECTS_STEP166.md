# V6 Layout Sync Effects - Step 166

Date: 2026-07-08

## Boundary

Step 166 connects selected layout sync toggles to chart-only effects.

The first implemented effect is visible logical range sync for the `dateRange`
and `time` toggles. When enabled, a user-visible range change from one visible
pane is projected to the other visible panes through chart surface viewport
projection.

## Ownership

- `layout-runtime` owns layout sync state.
- `layout-sync-effects-model` decides which sync keys are chart-only.
- `layout-sync-surface-bridge` subscribes to chart surface visible-range input
  and applies chart-surface viewport projections.
- `workstation-chart-surface` remains the only owner that mutates chart viewport
  display state.

## Non-Goals

- No symbol sync.
- No interval sync.
- No bar-data request or cache mutation.
- No replay cursor mutation.
- No chart-data series writes.
- No simulated trading, Order, Calendar, or comparison-symbol work.

## Verification

- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/layout-sync-visible-range-browser-step166-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-resize-drag-browser-step165-smoke.js`
- `git diff --check`

## Next

Step 167 should connect the Crosshair sync toggle as another chart-only effect.
