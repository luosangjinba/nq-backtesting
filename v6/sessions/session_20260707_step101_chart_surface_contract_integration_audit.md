# V6 Session - Step 101 Chart Surface Contract Integration Audit

Date: 2026-07-07

## Summary

Step 101 audited that the chart surface owner contract is reflected by the
current browser chart surface and bridge files.

No mismatch was found:

- `lightweight-chart-adapter` is the only file that directly calls Lightweight
  Charts chart creation, series writes, and time-scale visible range APIs;
- `chart-host-manager` delegates host lifecycle, series writes, visible range
  application, and visible range subscriptions to the adapter;
- `workstation-chart-surface` owns chart-data record application, viewport
  projection application, user visible-range tracking, subscriptions, and
  read-only state;
- `chart-data-surface-bridge` and `chart-viewport-surface-bridge` remain
  event-only;
- dashboard row actions remain Summary, Stats, and Copy.

## Boundary Notes

`manual-wall-input-bridge` and `reset-view-control-bridge` are not event-only
surface bridges. They are control bridges limited to viewport commands and must
not write series data, fetch bars, advance replay, load sessions, or own
dashboard row actions.

## Commits

- `a95d20df docs(v6): audit chart surface contract integration`

## Verification

- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

## Next

Step 102 should be Chart Surface Boundary Smoke Expansion: add chart surface
owner contract checks to the broader boundary-smoke gate or a focused boundary
helper used by it.
