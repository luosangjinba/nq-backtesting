# V6 Session - Step 132 Workstation Chart Slice Selection

Date: 2026-07-07

## Outcome

Step 132 selected Session Settings Owner Contract as the next bounded
workstation/chart slice.

Completed in commit:

- `54ee5f10 docs(v6): select session settings contract slice`

## Selection

Step 133 should establish a focused session-settings owner contract with
default/read-only draft state and validation helpers.

The right-rail Session settings panel must remain disabled and inert during the
contract step. Persistence, runtime command wiring, and interactive panel
controls remain out of scope until explicitly selected.

## Boundaries

- Step 132 was docs/test selection only.
- No workstation UI implementation was added.
- No chart, replay, bar-data, default-wall, display-timeframe, viewport,
  session-settings, orders, or calendar commands were dispatched from selection
  code.
- Order and Calendar dashboard row actions remain hidden.
- Dashboard visible row actions remain Summary, Stats, Copy, and Journal.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 133 should implement the Session Settings Owner Contract without enabling
right-rail Session settings controls or adding persistence.
