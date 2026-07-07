# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 98 completed.
- Next planned step: Step 99 - Workstation Replay/Chart Re-entry Audit.
- Worktree expectation at handoff: clean.

The latest completed work is Session Dashboard readiness re-audit:

- The dashboard remains a session-first orchestration surface.
- Dashboard imports remain limited to session command contracts, runtime command
  dispatch, recent session view helpers, row action boundaries, and read-only
  Summary/Stats surfaces.
- Dashboard dispatches only `session.list`, `session.create`, `session.open`,
  `session.delete`, and `session.copy`.
- Summary, Stats, and Copy remain the only visible Recent Sessions row actions.
- Order, Journal, and Calendar remain hidden/disabled and contract-ready only.
- The next direction is workstation replay/chart readiness re-entry.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step098_session_dashboard_readiness_reaudit.md`
5. `v6/docs/V6_SESSION_DASHBOARD_READINESS_REAUDIT.md`
6. `v6/tests/session-dashboard-readiness-audit-smoke.js`
7. `v6/src/shell/session-dashboard.js`
8. `v6/src/shell/session-row-action-boundaries.js`
9. `v6/docs/V6_RECENT_SESSIONS_ROW_ACTION_CONTRACT_AUDIT.md`
10. `v6/tests/recent-sessions-controls-browser-smoke.js`

## Next Step

Step 99 should re-audit the workstation replay/chart path after dashboard
readiness closeout.

Keep Step 99 audit-only unless the user explicitly asks to continue further:

- re-read replay, chart-entry, chart-data, chart-viewport, bar-data, and
  workstation browser smokes;
- verify the dashboard closeout did not change workstation ownership
  assumptions;
- identify one bounded Step 100 implementation slice;
- do not modify dashboard row action visibility.

Expected audit shape:

- review relevant workstation contracts and browser smokes;
- capture the selected workstation owner boundary;
- document the Step 100 test plan.

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

Run these before committing Step 99 audit work:

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
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`

Browser tests should be run sequentially because they share browser/debug-server
resources. If a browser smoke fails with `listen EPERM: 127.0.0.1`, rerun the
same command with approved escalation.

## Recent Commits

- `8eb24471 docs(v6): audit session dashboard readiness`
- `ccccf944 docs(v6): close row action contract audit`
- `3a66c0b0 docs(v6): audit recent session row actions`
- `a7ddcd84 docs(v6): close calendar owner contract`
- `ad13a835 test(v6): guard calendar owner boundaries`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
99. The handoff point is intentionally before workstation replay/chart re-entry
and before exposing Order, Journal, or Calendar.
