# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 100 completed.
- Next planned step: Step 101 - Workstation Chart Surface Contract Integration Audit.
- Worktree expectation at handoff: clean.

The latest completed work is Workstation Chart Surface owner contract:

- `workstation-chart-surface` now has an explicit owner contract.
- Allowed operations are chart host lifecycle, series data writes, visible
  logical range application, user visible-range measurement, subscriptions, and
  read-only snapshots.
- Blocked integrations include bar fetches, replay cursor ownership, session
  loading, dashboard row actions, orders, journal, and calendar.
- `chart-data-surface-bridge` and `chart-viewport-surface-bridge` remain
  event-only in the contract and smoke.
- The next direction is an audit that the contract is reflected consistently in
  the chart surface and bridge files.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step100_workstation_chart_surface_owner_contract.md`
5. `v6/src/chart-engine/chart-surface-contract.js`
6. `v6/tests/chart-surface-contract-smoke.js`
7. `v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
8. `v6/src/chart-engine/workstation-chart-surface.js`
9. `v6/src/chart-engine/chart-data-surface-bridge.js`
10. `v6/src/chart-engine/chart-viewport-surface-bridge.js`

## Next Step

Step 101 should audit that the chart surface owner contract is reflected by the
browser chart surface, chart-data bridge, chart-viewport bridge, and selected
workstation smokes.

Keep Step 101 audit-only unless a concrete mismatch is found:

- verify `chart-surface-contract.js` matches `workstation-chart-surface.js`;
- verify both chart surface bridges remain event-only;
- verify dashboard row actions remain unchanged;
- do not modify dashboard row action visibility.

Expected audit shape:

- document any mismatch or select the next bounded workstation slice;
- run selected workstation browser smokes on pane `main`;
- decide whether Step 102 should be a runtime guard, boundary-smoke expansion,
  or documentation-only handoff.

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

Run these before committing Step 101 work:

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

- `dcc8252c test(v6): guard chart surface reentry contract`
- `bc995ea9 feat(v6): add chart surface owner contract`
- `69f956f8 docs(v6): close workstation replay chart reentry audit`
- `c34ace79 test(v6): align workstation browser smokes with main pane`
- `b2cbcb1f docs(v6): audit workstation replay chart reentry`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
101. The handoff point is intentionally after adding the chart surface owner
contract and before exposing Order, Journal, or Calendar.
