# V6 Session - Step 128 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 128 selected Workstation UI Parity Gap Re-audit as the next bounded
workstation/chart slice.

Completed in commit:

- `4af426eb docs(v6): select workstation parity re-audit slice`

## Selection

Step 129 should re-audit the current workstation shell after left drawing rail,
bottom account/trading chrome, and right-rail Session settings panel
stabilization.

The re-audit should refresh stale parity gap classification before another
workstation chart chrome implementation slice is selected.

## Boundaries

- Step 128 was docs/test selection only.
- No workstation UI implementation was added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, orders, or calendar commands were dispatched from selection
  code.
- Order and Calendar dashboard row actions remain hidden.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step128-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 129 should perform the Workstation UI Parity Gap Re-audit and update stale
parity classification with current shell/runtime evidence.
