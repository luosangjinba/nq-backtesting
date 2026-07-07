# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 106 completed.
- Next planned step: Step 107 - Dashboard Summary/Stats/Copy Browser Coverage Audit.
- Worktree expectation at handoff: clean.

The latest completed work is Dashboard Row Action Isolation Re-audit:

- `V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md` documents that Summary, Stats,
  and Copy remain the only visible Recent Sessions row actions.
- `dashboard-row-action-isolation-reaudit-smoke.js` guards visible/hidden row
  actions, owner contracts, browser smoke coverage, and dashboard row action
  visibility.
- Order, Journal, and Calendar remain hidden/disabled and contract-ready only.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step103_chart_control_bridge_owner_contract.md`
5. `v6/sessions/session_20260707_step104_chart_control_bridge_integration_audit.md`
6. `v6/sessions/session_20260707_step105_chart_control_bridge_browser_regression_audit.md`
7. `v6/sessions/session_20260707_step106_dashboard_row_action_isolation_reaudit.md`
8. `v6/tests/boundary-smoke.js`
9. `v6/docs/V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md`
10. `v6/src/shell/session-row-action-boundaries.js`

## Next Step

Step 107 should audit dashboard browser coverage for Summary, Stats, and Copy
row actions.

Keep Step 107 bounded:

- verify Summary and Stats surfaces still render read-only metadata-only state;
- verify Copy still creates a metadata-only duplicate session;
- verify Order, Journal, and Calendar remain hidden until their owner surfaces
  have browser coverage;
- do not modify runtime behavior unless the audit exposes a mismatch;
- keep dashboard row action visibility unchanged.

Expected implementation shape:

- add or update a focused Summary/Stats/Copy browser coverage audit/smoke if
  needed;
- keep row-action owner contracts and browser smokes as the source of truth;
- run selected dashboard/session browser smokes.

## Critical Boundaries

V6 exists because V5 replay viewport/manual-anchor behavior became structurally
unreliable. Do not patch V5 replay behavior as a substitute for V6 work.

Preserve these V6 rules:

- UI dispatches commands and subscribes to events.
- Only chart runtime writes chart series.
- Only bar data runtime requests and caches bars.
- Only replay runtime owns replay cursor and reveal state.
- Creating a replay session must not load a full date range into chart state.
- Dashboard/session metadata work must not become a hidden cross-module control
  path into chart, bars, replay, viewport, orders, journal, or calendar.

For the current Recent Sessions row actions:

- Summary: enabled, read-only metadata-only, owner `session-summary`.
- Stats: enabled, read-only metadata/unavailable metrics, owner
  `session-analytics`.
- Copy: enabled, metadata-only, owner `session-repository`.
- Order: disabled/contract-ready, owner `orders-runtime`.
- Journal: disabled/contract-ready, owner `journal-runtime`.
- Calendar: disabled/contract-ready, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 107 work:

- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/chart-control-bridge-browser-regression-audit-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`

For Summary/Stats/Copy regression:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`

For broader dashboard/session regression:

- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

For workstation replay/chart re-entry, select from:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`

Browser tests should be run sequentially because they share browser/debug-server
resources. If a browser smoke fails with `listen EPERM: 127.0.0.1`, rerun the
same command with approved escalation.

## Recent Commits

- `342176cc docs(v6): audit dashboard row action isolation`
- `4175bdcf docs(v6): close chart control bridge browser regression`
- `e9fd784c test(v6): align native manual wall browser regression`
- `6c726815 docs(v6): audit chart control bridge browser regression`
- `e8d775ec docs(v6): close chart control bridge integration audit`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
107. The handoff point is intentionally before the Summary/Stats/Copy browser
coverage audit and before exposing Order, Journal, or Calendar.
