# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 92 completed.
- Next planned step: Step 93 - Session Copy Metadata Action.
- Worktree expectation at handoff: clean.

The latest completed work is Session Copy owner contract:

- `session-repository` now has an explicit Copy contract.
- Copy allowed fields are metadata-only.
- Copy blocked fields include ids and stateful chart/replay/data/order/journal
  surfaces.
- Copy id/name policies are explicit placeholders:
  - new session id required;
  - append copy suffix.
- Copy remains disabled until the repository-owned metadata action is
  implemented.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step092_session_copy_owner_contract.md`
5. `v6/src/shell/session-row-action-boundaries.js`
6. `v6/src/session/session-copy-contract.js`
7. `v6/tests/session-copy-contract-smoke.js`
8. `v6/tests/session-row-action-boundaries-smoke.js`
9. `v6/src/session/session-repository.js`
10. `v6/src/shell/session-dashboard.js`

## Next Step

Step 93 should implement the first metadata-only Copy action through the
`session-repository` owner contract.

Keep Step 93 metadata-only:

- Copy must create a new session id;
- Copy must append the configured copy suffix;
- Copy must not load bars;
- Copy must not open chart runtime;
- Copy must not advance replay;
- Copy must not touch viewport state;
- Copy must not copy orders, journal, or calendar data;
- dashboard must not clone or persist copied sessions directly.

Expected first-pass action shape:

- owner: `session-repository`;
- command/helper accepts source session id;
- repository creates a metadata-only duplicate;
- dashboard refreshes Recent Sessions after successful copy;
- browser smoke proves no chart, replay, bar-data, or viewport runtime changes.

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
- Copy: disabled, contract-ready owner `session-repository`, metadata-only when
  enabled.
- Order: disabled/future, owner `orders-runtime`.
- Journal: disabled/future, owner `journal-runtime`.
- Calendar: disabled/future, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 93 work:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`

For Summary/Stats regression:

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

- `820be36b test(v6): guard session copy boundaries`
- `bc7b48f0 feat(v6): add session copy contract`
- `f4f00ed6 test(v6): verify read-only session stats surface`
- `7b9f8846 feat(v6): open read-only session stats surface`
- `bc49e851 feat(v6): add session analytics surface model`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
93. The handoff point is intentionally before enabling Copy.
