# V6 Session - Step 167 Crosshair Sync Effect

Date: 2026-07-08

## Completed

Step 167 connected the layout Crosshair sync toggle to a bounded chart-only
effect.

Commits:

- `79dc5080 feat(v6): add crosshair projection api`
- `986a540f feat(v6): sync layout crosshair effect`

## Changes

- Added chart-engine crosshair projection APIs down to the Lightweight adapter.
- Used Lightweight Charts native `setCrosshairPosition` and
  `clearCrosshairPosition`.
- Added crosshair fan-out in `layout-sync-surface-bridge`.
- Suppressed programmatic crosshair feedback loops.
- Treated empty target panes as safe no-op projections.
- Added Node and browser smoke coverage for crosshair sync.

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

Step 168 should decide the owner contract for Symbol/Interval sync before any
bar reload behavior is implemented.
