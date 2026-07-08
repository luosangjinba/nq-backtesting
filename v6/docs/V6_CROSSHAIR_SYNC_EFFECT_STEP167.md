# V6 Crosshair Sync Effect - Step 167

Date: 2026-07-08

## Boundary

Step 167 connects the layout `Crosshair` sync toggle to a bounded chart-only
effect.

When enabled, a source pane crosshair event projects the selected candle's close
price and time to the other visible panes through Lightweight Charts'
`setCrosshairPosition` API. A source clear event clears the other visible panes
through `clearCrosshairPosition`.

## Ownership

- `layout-runtime` still owns the sync toggle state.
- `layout-sync-surface-bridge` owns the sync effect fan-out.
- `workstation-chart-surface` exposes a chart-engine API for crosshair
  projection.
- `chart-host-manager` and `lightweight-chart-adapter` are the only layers that
  call Lightweight Charts crosshair APIs.

## Guards

- Programmatic crosshair events are briefly suppressed to avoid pane-to-pane
  feedback loops.
- Empty target panes are treated as no-op projections because Lightweight can
  reject crosshair positions when no matching series data exists.
- No bar-data reload, replay cursor mutation, chart-data series write, Order, or
  Calendar behavior is introduced.

## Verification

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/layout-sync-crosshair-bridge-step167-smoke.js`
- `node v6/tests/layout-sync-crosshair-browser-step167-smoke.js`
- `node v6/tests/layout-sync-visible-range-browser-step166-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 168 should decide the owner contract for Symbol/Interval sync before
implementing any data reload behavior.
