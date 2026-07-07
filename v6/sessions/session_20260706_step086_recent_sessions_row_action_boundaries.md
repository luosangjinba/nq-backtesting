# V6 Step 86 - Recent Sessions Row Action Boundaries

Date: 2026-07-06

## Summary

Step 86 defined Recent Sessions row action ownership before enabling any row
action behavior.

Changed:

- added explicit boundary metadata for Summary, Stats, Copy, Order, Journal,
  and Calendar row actions;
- kept visible Recent Sessions actions disabled while their owners are not
  implemented;
- rendered row actions from the boundary metadata instead of ad hoc dashboard
  button markup;
- added a model smoke for row action owners and disabled status;
- extended the Recent Sessions browser smoke so clicking disabled placeholders
  cannot mutate chart, replay, bars, viewport, or dashboard surface state.

## Boundary

The dashboard still owns only dashboard UI and session metadata orchestration.

Planned owners:

- Summary: `session-summary`;
- Stats: `session-analytics`;
- Copy: `session-repository`, metadata-only when enabled;
- Order: `orders-runtime`;
- Journal: `journal-runtime`;
- Calendar: `calendar-runtime`.

No row action may become a hidden command path into chart data, replay, bar data,
viewport intent, orders, journal, or calendar.

## Commits

- `dbf6e104 docs(v6): scope recent row action boundaries`
- `50c7c75a feat(v6): define recent row action boundaries`
- `09183e3c test(v6): guard recent row action placeholders`

## Verification

- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

## Next

Step 87 should define the Session Summary owner contract before enabling the
Recent Sessions Summary action.
