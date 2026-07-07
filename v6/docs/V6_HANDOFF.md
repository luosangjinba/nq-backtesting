# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 90 completed.
- Next planned step: Step 91 - Session Analytics Read-only Surface.
- Worktree expectation at handoff: clean.

The latest completed work is Session Analytics owner contract:

- `session-analytics` now has an explicit read-only public contract.
- Analytics may read session metadata fields only.
- Analytics exposes empty metric placeholders for future Stats UI.
- Boundary tests prevent analytics from touching chart, replay, bars, viewport,
  orders, journal, calendar, UI, storage, or network paths.
- Stats and Copy row actions remain disabled.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step090_session_analytics_owner_contract.md`
5. `v6/src/shell/session-row-action-boundaries.js`
6. `v6/src/session-analytics/session-analytics-contract.js`
7. `v6/tests/session-analytics-contract-smoke.js`
8. `v6/tests/session-row-action-boundaries-smoke.js`
9. `v6/src/session-summary/session-summary-contract.js`
10. `v6/src/shell/session-dashboard.js`

## Next Step

Step 91 should build the first read-only Session Analytics surface/model before
enabling the Recent Sessions Stats action.

Keep Step 91 read-only and metadata-only unless the required owners expose
explicit read contracts:

- analytics must remain read-only;
- analytics must not load bars;
- analytics must not open chart runtime;
- analytics must not advance replay;
- analytics must not touch viewport intent;
- analytics must not read orders, journal, or calendar until those owners expose
  explicit read contracts;
- dashboard must not compute analytics directly.

Expected first-pass surface shape:

- owner: `session-analytics`;
- session metadata section from the analytics contract;
- explicit unavailable/empty metric placeholders;
- deterministic close/focus behavior similar to the Summary surface;
- Stats action remains disabled until the surface and browser guards exist.

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
- Stats: disabled, contract-ready owner `session-analytics`.
- Copy: disabled, future owner `session-repository`, metadata-only when enabled.
- Order: disabled/future, owner `orders-runtime`.
- Journal: disabled/future, owner `journal-runtime`.
- Calendar: disabled/future, owner `calendar-runtime`.

## Key Tests

Run these before committing Step 91 work:

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`

For Summary regression:

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

- `c2a32db6 test(v6): guard session analytics boundaries`
- `18b71f81 feat(v6): add session analytics contract`
- `99c86805 docs(v6): close session summary polish`
- `3ea0d684 feat(v6): polish session summary surface`
- `fab143df docs(v6): scope session summary polish`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
91. The handoff point is intentionally before enabling Stats.
