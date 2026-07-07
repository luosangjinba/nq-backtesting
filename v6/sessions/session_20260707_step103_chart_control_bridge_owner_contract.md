# V6 Session - Step 103 Chart Control Bridge Owner Contract

Date: 2026-07-07

## Summary

Step 103 added an explicit owner contract for chart-engine control bridges that
translate user chart controls into viewport commands.

The new contract records:

- owner `chart-control-bridge`;
- control bridges `manual-wall-input-bridge` and `reset-view-control-bridge`;
- allowed viewport commands `chartViewport.setManualIntent`,
  `chartViewport.applyChartDataRevision`, and `chartViewport.resetView`;
- allowed operations for reading chart surface snapshots, subscribing to chart
  surface visible range changes, measuring manual wall state, binding the reset
  control, and dispatching viewport commands;
- blocked integrations for series writes, bar fetches, replay advancement,
  session loading, dashboard row actions, orders, journal, and calendar.

## Boundary Notes

- No runtime behavior changed.
- `manual-wall-input-bridge` remains the bridge from native chart visible range
  events to viewport manual intent commands.
- `reset-view-control-bridge` remains the bridge from the reset-view button to
  the viewport reset command.
- `boundary-smoke.js` now reads the control bridge contract before enforcing
  viewport-command-only behavior.
- Dashboard row action visibility remains Summary, Stats, and Copy.

## Commits

- `3c6839c1 feat(v6): add chart control bridge contract`
- `87e10e9e test(v6): guard chart control bridge boundaries`

## Verification

- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/manual-wall-input-bridge-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

## Next

Step 104 should audit chart-engine control bridge integration against the new
contract, without changing runtime behavior unless the audit exposes a mismatch.
