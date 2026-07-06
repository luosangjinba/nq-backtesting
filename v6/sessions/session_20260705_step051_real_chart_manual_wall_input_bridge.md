# V6 Step 51 - Real Chart Manual Wall Input Bridge

Date: 2026-07-05

## Summary

Step 51 connected real Lightweight Charts visible-range interaction to V6
manual-wall intent through the chart-engine boundary. The bridge observes native
time-scale visible logical range changes only after recent user range input, then
dispatches viewport commands to promote the active pane to a manual wall.

This avoids the V5 failure mode where drag/manual anchor behavior was patched
through chart runtime internals and could be overridden by lower-level replay
logic.

## Commits

- `40e8e6a9 docs(v6): retarget step fifty one to chart input bridge`
- `65221c65 feat(v6): expose chart visible range subscriptions`
- `83798dde feat(v6): bridge chart range input to manual walls`
- `6d74660c test(v6): gate native chart input manual walls`

## Notes

- `lightweight-chart-adapter` now exposes visible logical range subscriptions
  and normalizes tiny floating-point range noise.
- `workstation-chart-surface` suppresses programmatic range writes and only
  broadcasts native range changes after recent user input.
- `manual-wall-input-bridge` measures logical range and dispatches
  `CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT`, then reapplies the current chart
  data revision through the existing viewport projection path.
- The browser gate uses native wheel input against the real chart host and then
  verifies Next preserves manual-wall offset/span.

## Verification

- `node v6/tests/manual-wall-input-bridge-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 52 should clean the remaining chart-internal text toolbar controls so the
chart surface does not duplicate the top toolbar and right utility rail.
