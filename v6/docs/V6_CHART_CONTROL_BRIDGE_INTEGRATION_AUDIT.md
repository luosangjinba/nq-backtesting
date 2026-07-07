# V6 Chart Control Bridge Integration Audit

Date: 2026-07-07

## Decision

The chart control bridge owner contract is reflected by the current workstation
chart wiring.

No contract mismatch was found:

- `chart-control-bridge-contract.js` lists only `manual-wall-input-bridge` and
  `reset-view-control-bridge` as chart control bridges.
- `app.js` imports and mounts those two control bridges after mounting
  `workstation-chart-surface`.
- `manual-wall-input-bridge` subscribes to chart surface visible-range changes,
  reads the chart surface snapshot, measures manual wall intent, and dispatches
  only `chartViewport.setManualIntent` and
  `chartViewport.applyChartDataRevision`.
- `reset-view-control-bridge` binds the reset-view button, reads the chart
  surface snapshot, and dispatches only `chartViewport.resetView`.
- The control bridges do not write series data, fetch bars, advance replay, load
  sessions, own dashboard row actions, or mutate orders, journal, or calendar.

## Boundary Notes

- No runtime behavior changed.
- The control bridges are not event-only surface bridges. They are explicitly
  viewport-command-only user control bridges.
- Series writes remain in the chart surface/adapter path.
- Bar fetches remain in bar-data runtime ownership.
- Replay cursor/reveal remains in replay runtime ownership.
- Dashboard row action visibility remains Summary, Stats, and Copy.

## Step 105 Direction

Step 105 should audit workstation browser behavior for the chart control
bridges against the owner contract.

Scope:

- verify native manual chart range input still dispatches viewport manual intent
  through `manual-wall-input-bridge`;
- verify the reset-view button still dispatches viewport reset through
  `reset-view-control-bridge`;
- keep `chart-control-bridge-contract.js` as the source of truth for listed
  control bridges and allowed commands;
- do not modify runtime behavior unless the audit exposes a mismatch.

Acceptance:

- chart control bridge integration audit smoke passes;
- chart control bridge contract smoke passes;
- boundary smoke passes;
- selected workstation browser smokes, including native manual wall and reset
  view, still pass on pane `main`.

## Verification

- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
