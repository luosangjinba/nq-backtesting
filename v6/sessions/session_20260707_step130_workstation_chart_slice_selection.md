# V6 Session - Step 130 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 130 selected Diagnostics Visibility Cleanup as the next bounded
workstation/chart slice.

Completed in commit:

- `ff8323f7 docs(v6): select diagnostics visibility cleanup slice`

## Selection

Step 131 should move readiness runtime/command/gate telemetry out of the
normal workstation header reading path while keeping a compact user-facing
readiness summary.

The slice should preserve readiness state and smoke-test coverage, keep the
readiness controller state available for tests/future tooling, and avoid
implementing a broader developer diagnostics mode.

## Boundaries

- Step 130 was docs/test selection only.
- No workstation UI implementation was added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, orders, or calendar commands were dispatched from selection
  code.
- No chart-series writes, viewport mutations, replay cursor ownership, or
  bar-cache ownership moved out of runtime owners.
- Order and Calendar dashboard row actions remain hidden.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 131 should implement diagnostics visibility cleanup in the workstation top
chrome without changing runtime ownership or dashboard row-action visibility.
