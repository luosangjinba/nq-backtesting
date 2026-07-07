# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 99 completed.
- Next planned step: Step 100 - Workstation Chart Surface Owner Contract.
- Worktree expectation at handoff: clean.

The latest completed work is Workstation Replay/Chart re-entry audit:

- The workstation replay/chart path is ready to re-enter after dashboard
  closeout.
- Lightweight Charts API and TradingView ecosystem references were checked
  before selecting the next slice.
- `bar-data`, `replay`, `chart-entry`, `chart-data`, `chart-viewport`, and
  `chart-engine` boundaries still match V6 ownership rules.
- The browser chart surface remains the only path that should apply series data
  and visible logical ranges to Lightweight Charts.
- Workstation browser smokes now target the current shell pane id, `main`.
- The next direction is an explicit chart surface owner contract.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step099_workstation_replay_chart_reentry_audit.md`
5. `v6/docs/V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md`
6. `v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
7. `v6/src/chart-engine/workstation-chart-surface.js`
8. `v6/src/chart-engine/lightweight-chart-adapter.js`
9. `v6/src/chart-engine/chart-data-surface-bridge.js`
10. `v6/src/chart-engine/chart-viewport-surface-bridge.js`

## Next Step

Step 100 should add an explicit owner contract for the workstation browser chart
surface.

Keep Step 100 bounded:

- chart surface owns chart host lifecycle, series data writes, visible logical
  range application, user-driven visible range measurement, and read-only
  browser snapshots;
- chart surface must not fetch bars, advance replay, load sessions, compute
  replay cursor state, own dashboard row actions, or mutate order/journal/
  calendar state;
- chart-data and chart-viewport bridges must remain event-only;
- do not modify dashboard row action visibility.

Expected implementation shape:

- create a small chart surface owner contract module;
- add a contract smoke for allowed and blocked operations;
- run selected workstation browser smokes on pane `main`.

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

Run these before committing Step 100 work:

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

- `c34ace79 test(v6): align workstation browser smokes with main pane`
- `b2cbcb1f docs(v6): audit workstation replay chart reentry`
- `e31fc150 docs(v6): close session dashboard readiness audit`
- `8eb24471 docs(v6): audit session dashboard readiness`
- `ccccf944 docs(v6): close row action contract audit`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
100. The handoff point is intentionally before adding the chart surface owner
contract and before exposing Order, Journal, or Calendar.
