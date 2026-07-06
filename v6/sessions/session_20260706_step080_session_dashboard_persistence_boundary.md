# V6 Step 80 - Session Dashboard Persistence Boundary

Date: 2026-07-06

## Summary

Step 80 defined and gated the session dashboard persistence boundary before
making session lists durable.

The key rule is metadata-only listing:

- `session.list` may read session records;
- `session.list` must not emit `session.created` or `session.opened`;
- `session.list` must not activate chart-entry;
- `session.list` must not request bar-data windows;
- `session.list` must not write chart data;
- `session.list` must not mutate replay state or viewport intent.

## Docs

Added:

- `v6/docs/specs/session-dashboard-persistence-boundary.md`

It states that future durable session persistence may store session records and
active session id only. It must not store bars, bar cache windows, replay cursor,
viewport intent, chart adapter state, or pane presentation state.

## Gate

Added:

- `v6/tests/session-dashboard-persistence-boundary-smoke.js`

The smoke preloads a metadata session in the session repository, dispatches
`session.list`, and verifies:

- no session created/opened events;
- chart-entry remains idle;
- chart-entry initialization remains idle;
- bar cache remains empty;
- chart data store remains empty;
- replay state remains null;
- no bar fetch occurs.

It also verifies that `session.open` is the explicit entry path into chart-entry
planning, while still not fetching bars in this limited runtime slice.

## Commits

- `5285817e docs(v6): scope step eighty session boundary`
- `9a9025ba docs(v6): define session dashboard persistence boundary`
- `b3ff08f3 test(v6): gate session dashboard persistence boundary`

## Verification

- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

## Next

Step 81 should implement the first durable session metadata adapter. Keep it
metadata-only and prove restored session listing does not load bars or enter
chart/replay/viewport ownership until the user opens a session.
