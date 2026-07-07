# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 93 completed.
- Next planned step: Step 94 - Orders Owner Contract.
- Worktree expectation at handoff: clean.

The latest completed work is Session Copy metadata action:

- Copy row action is enabled from Recent Sessions.
- Copy dispatches `session.copy`; dashboard does not clone session objects.
- `session-repository` creates a metadata-only duplicate with:
  - a new session id;
  - the configured Copy suffix;
  - copied session metadata fields only.
- Copy closes Summary/Stats surfaces and refreshes Recent Sessions.
- Browser coverage proves Copy does not mutate chart, replay, bar-data, or
  viewport runtime state.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step093_session_copy_metadata_action.md`
5. `v6/src/shell/session-row-action-boundaries.js`
6. `v6/src/session/session-copy-contract.js`
7. `v6/src/session/session-repository.js`
8. `v6/src/session/session-runtime.js`
9. `v6/src/shell/session-dashboard.js`
10. `v6/tests/session-copy-action-browser-smoke.js`

## Next Step

Step 94 should define the Orders owner contract before exposing any Recent
Sessions Order row action.

Keep Step 94 contract-only unless the user explicitly asks to continue further:

- Order must remain hidden/disabled until its owner contract and guards exist;
- Order must not load bars;
- Order must not open chart runtime;
- Order must not advance replay;
- Order must not touch viewport state;
- dashboard must not compute, persist, or query order data directly.

Expected first-pass Order shape:

- owner: `orders-runtime`;
- allowed first-pass metadata/read fields;
- blocked write/runtime integrations;
- Order row action remains hidden/disabled unless contract and guards exist.

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
- Order: disabled/future, owner `orders-runtime`.
- Journal: disabled/future, owner `journal-runtime`.
- Calendar: disabled/future, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 94 work:

- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`

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

- `50b54920 feat(v6): enable session copy action`
- `64582c7b feat(v6): expose session copy command`
- `eb6c3f2d feat(v6): copy session metadata in repository`
- `820be36b test(v6): guard session copy boundaries`
- `bc7b48f0 feat(v6): add session copy contract`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
94. The handoff point is intentionally before exposing Order.
