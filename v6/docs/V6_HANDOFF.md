# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 103 completed.
- Next planned step: Step 104 - Chart Control Bridge Integration Audit.
- Worktree expectation at handoff: clean.

The latest completed work is Chart Control Bridge owner contract:

- `chart-control-bridge-contract.js` defines the owner, listed control bridges,
  allowed viewport commands, allowed operations, and blocked integrations.
- `chart-control-bridge-contract-smoke.js` guards the standalone contract and
  confirms dashboard row action visibility remains Summary, Stats, and Copy.
- `boundary-smoke.js` now imports the chart control bridge owner contract and
  uses it to guard `manual-wall-input-bridge` and `reset-view-control-bridge`.
- Boundary smoke now verifies dashboard row action visibility remains Summary,
  Stats, and Copy.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step103_chart_control_bridge_owner_contract.md`
5. `v6/tests/boundary-smoke.js`
6. `v6/src/chart-engine/chart-control-bridge-contract.js`
7. `v6/src/chart-engine/chart-surface-contract.js`
8. `v6/src/chart-engine/manual-wall-input-bridge.js`
9. `v6/src/chart-engine/reset-view-control-bridge.js`
10. `v6/docs/V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`

## Next Step

Step 104 should audit chart-engine control bridge wiring against the new owner
contract.

Keep Step 104 bounded:

- verify `manual-wall-input-bridge` and `reset-view-control-bridge` remain the
  only contract-listed control bridges;
- verify the bridges only translate user chart controls into viewport commands;
- do not modify runtime behavior unless the audit exposes a mismatch;
- keep dashboard row action visibility unchanged.

Expected implementation shape:

- add or update a focused integration audit document/smoke;
- keep the chart control bridge contract as the source of truth;
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

Run these before committing Step 104 work:

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

- `87e10e9e test(v6): guard chart control bridge boundaries`
- `3c6839c1 feat(v6): add chart control bridge contract`
- `6d8cd6e2 docs(v6): close chart surface boundary smoke expansion`
- `b0e72b67 test(v6): expand chart surface boundary smoke`
- `1e081506 docs(v6): close chart surface contract integration audit`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
104. The handoff point is intentionally before any control bridge integration
audit expansion and before exposing Order, Journal, or Calendar.
