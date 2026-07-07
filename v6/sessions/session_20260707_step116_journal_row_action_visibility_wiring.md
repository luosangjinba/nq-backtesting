# V6 Session - Step 116 Journal Row Action Visibility Wiring

Date: 2026-07-07

## Outcome

Step 116 exposed the Journal Recent Sessions row action with owner-aligned
wiring and browser coverage.

Implemented in commit:

- `0b1eebea feat(v6): expose journal row action`

## Changes

- `journal-contract.js` now reports `rowActionVisible: true`.
- `session-row-action-boundaries.js` marks Journal enabled, visible, and
  `surface-ready`.
- `journal-row-action-adapter.js` connects the dashboard row action to the
  Journal-owned hidden harness and existing Journal surface.
- `session-dashboard.js` delegates Journal clicks to the injected adapter without
  dispatching Journal commands directly.
- `session-journal-row-action-browser-smoke.js` covers the visible
  `data-v6-row-action="journal"` path.
- Dashboard/session, hidden Journal, and chart/control audit smokes were updated
  so Summary, Stats, Copy, and Journal are the visible row actions while Order
  and Calendar remain hidden.

## Boundaries

- Journal row-action context remains sanitized session metadata only.
- Journal still cannot load bars, open charts, advance replay, touch viewport,
  read orders, or query calendar.
- Dashboard does not own Journal commands or persistence.
- Summary, Stats, and Copy browser regressions still pass with Journal visible.

## Verification

- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next Step

Step 117 should audit the dashboard/session browser regression pack after
Journal became visible, keeping Order and Calendar hidden.
