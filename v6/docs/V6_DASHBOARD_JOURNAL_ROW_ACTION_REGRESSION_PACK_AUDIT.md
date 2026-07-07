# V6 Dashboard Journal Row Action Regression Pack Audit

Date: 2026-07-07

## Decision

The dashboard/session browser regression pack still holds after Journal became a
visible Recent Sessions row action.

No pack mismatch was found:

- Summary, Stats, Copy, and Journal are the visible Recent Sessions row actions.
- `session-journal-row-action-browser-smoke.js` is part of the dashboard/session
  pack and proves the visible Journal action opens through the Journal-owned
  surface without changing chart, bar-data, chart-entry, or replay state.
- `recent-sessions-controls-browser-smoke.js` covers row-action discovery and
  keeps search, sort, pagination, and row-action clicks isolated from chart,
  bars, chart-entry, and replay ownership.
- Summary, Stats, and Copy browser smokes still prove their existing behavior
  with Journal visible.
- Order and Calendar remain hidden.

## Boundary Notes

- No runtime behavior changed.
- The dashboard still coordinates row-action UI but does not own Journal
  commands or persistence.
- Journal remains isolated from chart, bars, replay, viewport, orders, and
  calendar runtime paths.
- The selected browser pack should continue to run browser smokes sequentially
  because they share browser/debug-server resources.

## Step 118 Direction

Step 118 should return to the next workstation/chart-facing slice unless a
fresh dashboard pack regression appears.

Scope:

- review the current workstation chart presentation surface and chart engine
  readiness;
- keep dashboard row-action visibility unchanged;
- do not expose Order or Calendar.

Acceptance:

- Step 117 regression pack audit smoke passes;
- selected dashboard/session browser smokes pass;
- boundary smoke passes.

## Verification

- `node v6/tests/dashboard-journal-row-action-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
