# V6 Handoff

Last updated: 2026-07-07

## Current State

- Branch: `v5/fx-replay-workstation`
- Current V6 step state: Step 96 completed.
- Next planned step: Step 97 - Recent Sessions Row Action Contract Audit.
- Worktree expectation at handoff: clean.

The latest completed work is Calendar owner contract:

- `calendar-runtime` now has an explicit row-action owner contract.
- Calendar allowed fields are first-pass economic/calendar event metadata.
- Calendar blocked integrations include chart, replay, bars, viewport, orders,
  journal, and dashboard direct access.
- Calendar command, provider, persistence, and write surfaces are not ready.
- Calendar remains hidden/disabled from Recent Sessions.

## Restart Reading Order

After restarting the server or assistant context, read these first:

1. `v6/TODO.md`
2. `v6/docs/INDEX.md`
3. `v6/docs/V6_HANDOFF.md`
4. `v6/sessions/session_20260707_step096_calendar_owner_contract.md`
5. `v6/src/shell/session-row-action-boundaries.js`
6. `v6/src/calendar/calendar-contract.js`
7. `v6/tests/calendar-contract-smoke.js`
8. `v6/tests/session-row-action-boundaries-smoke.js`
9. `v6/tests/boundary-smoke.js`
10. `v6/src/shell/session-dashboard.js`

## Next Step

Step 97 should audit the completed Recent Sessions row action ownership set
after Summary, Stats, Copy, Order, Journal, and Calendar contracts are in place.

Keep Step 97 audit-only unless the user explicitly asks to continue further:

- Summary, Stats, and Copy must remain the only visible Recent Sessions row
  actions;
- Order, Journal, and Calendar must remain hidden/disabled;
- dashboard must not gain direct owner logic for orders, journal, or calendar;
- audit should not add new runtime features.

Expected audit shape:

- verify each row action owner contract;
- verify visible and hidden action sets;
- verify browser row-action behavior still avoids chart/replay/data side
  effects;
- document the next implementation direction.

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

Run these before committing Step 97 work:

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

- `ad13a835 test(v6): guard calendar owner boundaries`
- `ff91676b feat(v6): add calendar owner contract`
- `2f28f9a7 test(v6): guard journal owner boundaries`
- `6ac21fc0 feat(v6): add journal owner contract`
- `826a5e74 test(v6): guard orders owner boundaries`

## Server Restart Note

Restarting the API/HTML service should not require code changes. After restart,
verify the service state with the normal local V6 page and continue from Step
97. The handoff point is intentionally before exposing Order, Journal, or
Calendar.
