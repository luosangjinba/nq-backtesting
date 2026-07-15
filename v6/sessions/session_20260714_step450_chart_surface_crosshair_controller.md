# Session — Step 450 Chart Surface Crosshair Controller

Date: 2026-07-14

## Outcome

Crosshair subscription lifecycle and presentation records move from the mixed
Chart Surface entry file into `workstation-crosshair-controller.js`. The
controller owns previous-close lookup, temporary readout continuity, event and
listener fan-out, cloned snapshots, and teardown.

The Chart Surface remains the only owner of its bar map and passes a read-only
lookup function; no runtime, adapter, or feature module gains chart mutation
authority.

## Verification

- `node v6/tests/workstation-crosshair-controller-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/layout-sync-crosshair-browser-step167-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

`status-readout-chart-data-browser-smoke.js` is excluded because it still
expects `O --` after crosshair leave, contradicting the accepted latest-bar
default. That catalog debt is recorded for Step 454 rather than changing it in
this controller extraction.
