# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 97 completed.
- Next planned step: Step 98 - Session Dashboard Readiness Re-audit.
- Worktree expectation at handoff: clean.

The latest completed work is Recent Sessions row action contract audit:

- Summary, Stats, and Copy are the only visible Recent Sessions row actions.
- Summary is owned by `session-summary`, Stats by `session-analytics`, and Copy
  by `session-repository`.
- Order, Journal, and Calendar remain hidden/disabled and contract-ready only.
- The dashboard remains an orchestration surface; it does not compute
  analytics, clone sessions directly, load chart/bar/replay state, or query
  order/journal/calendar providers.
- The audit is documented in
  `v6/docs/V6_RECENT_SESSIONS_ROW_ACTION_CONTRACT_AUDIT.md`.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step097_recent_sessions_row_action_contract_audit.md`
5. `v6/docs/V6_RECENT_SESSIONS_ROW_ACTION_CONTRACT_AUDIT.md`
6. `v6/src/shell/session-row-action-boundaries.js`
7. `v6/src/shell/session-dashboard.js`
8. `v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
9. `v6/tests/session-row-action-boundaries-smoke.js`
10. `v6/tests/recent-sessions-controls-browser-smoke.js`

## Next Step

Step 98 should re-audit the Session Dashboard after the Step 80-97 dashboard
sequence and row-action contract closeout.

Keep Step 98 audit-only unless the user explicitly asks to continue further:

- verify the dashboard remains orchestration-only for row actions and session
  metadata flows;
- verify no hidden chart/replay/bar-data/viewport paths were introduced by the
  dashboard sequence;
- decide whether Step 99 should return to workstation replay/chart readiness or
  continue dashboard surface polish;
- do not expose Order, Journal, or Calendar row actions in this step.

Expected audit shape:

- review dashboard modules, row-action wiring, and browser smokes;
- identify stale assumptions or mixed ownership in the Step 80-97 sequence;
- document one bounded Step 99 owner boundary and test plan.

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

Run these before committing Step 98 audit work:

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

Browser tests should be run sequentially because they share browser/debug-server
resources. If a browser smoke fails with `listen EPERM: 127.0.0.1`, rerun the
same command with approved escalation.

## Recent Commits

- `3a66c0b0 docs(v6): audit recent session row actions`
- `a7ddcd84 docs(v6): close calendar owner contract`
- `ad13a835 test(v6): guard calendar owner boundaries`
- `ff91676b feat(v6): add calendar owner contract`
- `2f28f9a7 test(v6): guard journal owner boundaries`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
98. The handoff point is intentionally before exposing Order, Journal, or
Calendar.
