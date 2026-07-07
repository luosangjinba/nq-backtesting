# V6 Step 84 - Recent Sessions Controls

Date: 2026-07-06

## Summary

Step 84 made Recent Sessions controls explicit dashboard-local behavior.

Added:

- `createRecentSessionsView` pure model for search, sort, and pagination;
- dashboard search over loaded session metadata;
- newest/oldest sort toggle;
- rows-per-page pagination;
- disabled placeholder row actions for Summary, Stats, and Copy;
- browser smoke proving search/sort/page operations do not load bars or mutate
  chart, replay, or viewport state.

## Boundary

Recent Sessions filtering, sorting, and paging only transform the metadata that
the session runtime already returned through `SESSION_COMMANDS.LIST`.

The dashboard does not request bars, write chart data, mutate replay state, or
touch viewport intent for search/sort/page changes.

Opening a row remains the explicit boundary crossing into the workstation:

- dashboard dispatches `SESSION_COMMANDS.OPEN`;
- chart entry runtime reacts to the session open event;
- downstream chart/replay/bar loading stays with the existing owners.

## Commits

- `f88e3fe2 docs(v6): scope recent sessions controls`
- `ce2ad615 feat(v6): model recent sessions controls`
- `bd8bdb9b feat(v6): wire recent sessions controls`

## Verification

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

## Next

Step 85 should define row action ownership before enabling Summary, Stats, Copy,
order, journal, calendar, or analytics actions from Recent Sessions.
