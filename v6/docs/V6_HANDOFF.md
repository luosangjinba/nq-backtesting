# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 94 completed.
- Next planned step: Step 95 - Journal Owner Contract.
- Worktree expectation at handoff: clean.

The latest completed work is Orders owner contract:

- `orders-runtime` now has an explicit contract.
- Order allowed fields are first-pass metadata/read fields.
- Order blocked integrations include chart, replay, bars, viewport, journal,
  calendar, and dashboard direct access.
- Order command, persistence, and write surfaces are not ready.
- Order remains hidden/disabled from Recent Sessions.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step094_orders_owner_contract.md`
5. `v6/src/shell/session-row-action-boundaries.js`
6. `v6/src/orders/orders-contract.js`
7. `v6/tests/orders-contract-smoke.js`
8. `v6/tests/session-row-action-boundaries-smoke.js`
9. `v6/tests/boundary-smoke.js`
10. `v6/src/shell/session-dashboard.js`

## Next Step

Step 95 should define the Journal owner contract before exposing any Recent
Sessions Journal row action.

Keep Step 95 contract-only unless the user explicitly asks to continue further:

- Journal must remain hidden/disabled until its owner contract and guards exist;
- Journal must not load bars;
- Journal must not open chart runtime;
- Journal must not advance replay;
- Journal must not touch viewport state;
- dashboard must not compute, persist, or query journal data directly.

Expected first-pass Journal shape:

- owner: `journal-runtime`;
- allowed first-pass metadata/read fields;
- blocked write/runtime integrations;
- Journal row action remains hidden/disabled unless contract and guards exist.

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
- Journal: disabled/future, owner `journal-runtime`.
- Calendar: disabled/future, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 95 work:

- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/orders-contract-smoke.js`

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

- `826a5e74 test(v6): guard orders owner boundaries`
- `8b61e350 feat(v6): add orders owner contract`
- `50b54920 feat(v6): enable session copy action`
- `64582c7b feat(v6): expose session copy command`
- `eb6c3f2d feat(v6): copy session metadata in repository`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
95. The handoff point is intentionally before exposing Journal.
