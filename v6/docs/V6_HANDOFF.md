# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 101 completed.
- Next planned step: Step 102 - Chart Surface Boundary Smoke Expansion.
- Worktree expectation at handoff: clean.

The latest completed work is Workstation Chart Surface contract integration
audit:

- The chart surface owner contract matches `workstation-chart-surface`,
  `lightweight-chart-adapter`, `chart-host-manager`,
  `chart-data-surface-bridge`, and `chart-viewport-surface-bridge`.
- `lightweight-chart-adapter` remains the only file that directly calls
  Lightweight Charts chart creation, series data writes, and time-scale visible
  range APIs.
- `chart-data-surface-bridge` and `chart-viewport-surface-bridge` remain
  event-only.
- `manual-wall-input-bridge` and `reset-view-control-bridge` are separate
  control bridges limited to viewport commands.
- Dashboard row actions remain outside the workstation chart surface path.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step101_chart_surface_contract_integration_audit.md`
5. `v6/docs/V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`
6. `v6/tests/chart-surface-contract-integration-audit-smoke.js`
7. `v6/src/chart-engine/chart-surface-contract.js`
8. `v6/src/chart-engine/workstation-chart-surface.js`
9. `v6/src/chart-engine/chart-data-surface-bridge.js`
10. `v6/src/chart-engine/chart-viewport-surface-bridge.js`

## Next Step

Step 102 should add chart surface owner contract checks to the broader
boundary-smoke gate or a focused boundary helper used by it.

Keep Step 102 test-focused unless a concrete mismatch is found:

- keep chart-data and chart-viewport surface bridges event-only;
- keep manual-wall and reset-view control bridges limited to viewport commands;
- keep chart surface series writes and visible range application inside
  chart-engine browser surface files;
- do not modify dashboard row action visibility.

Expected implementation shape:

- extend `boundary-smoke.js` or add a focused helper invoked by it;
- reuse `chart-surface-contract.js` where practical;
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

Run these before committing Step 102 work:

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

- `a95d20df docs(v6): audit chart surface contract integration`
- `a74d0df4 docs(v6): close chart surface owner contract`
- `dcc8252c test(v6): guard chart surface reentry contract`
- `bc995ea9 feat(v6): add chart surface owner contract`
- `69f956f8 docs(v6): close workstation replay chart reentry audit`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
102. The handoff point is intentionally before expanding the global chart
surface boundary smoke and before exposing Order, Journal, or Calendar.
