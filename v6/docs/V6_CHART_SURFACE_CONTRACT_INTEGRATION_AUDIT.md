# V6 Chart Surface Contract Integration Audit

Date: 2026-07-07

## Decision

The `workstation-chart-surface` owner contract is reflected by the current
browser chart surface implementation.

No contract mismatch was found:

- `lightweight-chart-adapter` is the only source file that directly calls
  Lightweight Charts `createChart`, `series.setData`, `series.update`, and time
  scale visible logical range APIs.
- `chart-host-manager` delegates chart host lifecycle, series writes, visible
  range application, and visible range subscriptions to the adapter.
- `workstation-chart-surface` owns the browser-facing chart surface boundary:
  it mounts the chart host, applies chart-data records, applies viewport
  projections, tracks user visible-range input, and exposes read-only state.
- `chart-data-surface-bridge` and `chart-viewport-surface-bridge` remain
  event-only bridges into the chart surface.
- Dashboard row actions remain outside the workstation chart surface path.

## Bridge Boundary

Two chart-engine files intentionally dispatch viewport commands and are not part
of the event-only surface bridge rule:

- `manual-wall-input-bridge` converts user chart range input into viewport
  intent commands.
- `reset-view-control-bridge` converts the reset-view button into a viewport
  reset command.

Those bridges may dispatch viewport commands, but they must not write series
data, fetch bars, advance replay, load sessions, or own dashboard row actions.

## Step 102 Direction

Step 102 should be Chart Surface Boundary Smoke Expansion.

Scope:

- add chart surface owner contract checks to the broader boundary-smoke gate or
  a focused boundary helper used by it;
- keep chart-data and chart-viewport surface bridges event-only;
- keep manual-wall and reset-view control bridges limited to viewport commands;
- do not modify dashboard row action visibility.

Acceptance:

- the global or focused boundary smoke catches chart surface owner violations;
- chart surface contract and re-entry audit smokes still pass;
- selected workstation browser smokes still pass on pane `main`.

## Verification

- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
