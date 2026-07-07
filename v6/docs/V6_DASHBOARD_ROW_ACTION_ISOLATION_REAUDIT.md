# V6 Dashboard Row Action Isolation Re-audit

Date: 2026-07-07

## Decision

Dashboard row-action isolation still holds after the chart control bridge
browser regression audit.

No row-action ownership mismatch was found:

- Summary, Stats, Copy, and Journal are now visible Recent Sessions row actions.
- Order and Calendar remain disabled/hidden row actions with owner
  contracts in place.
- Summary is owned by `session-summary` and remains read-only metadata.
- Stats is owned by `session-analytics` and remains read-only metadata plus
  unavailable metric placeholders.
- Copy is owned by `session-repository` and remains metadata-only duplication.
- Order and Calendar remain contract-ready but not visible from Recent
  Sessions.
- Row actions do not directly control chart, bars, replay, viewport, orders,
  journal, or calendar state.

## Browser Coverage

`recent-sessions-controls-browser-smoke.js` is the current browser guard for
row-action isolation. It verifies:

- visible row action buttons are Summary, Stats, Copy, and Journal with their owner data
  attributes;
- clicking Summary/Stats does not change chart data summary, bar-data cache,
  chart-entry state, or replay state;
- search, sort, and pagination do not change chart/data/replay state;
- opening a session is an explicit Open action, not a row-action side effect.

## Step 107 Direction

Step 107 should audit dashboard browser coverage for Summary, Stats, and Copy
surfaces.

Scope:

- verify Summary and Stats surfaces still render read-only metadata-only state;
- verify Copy still creates a metadata-only duplicate session;
- keep Order and Calendar hidden until their owner surfaces have
  browser coverage.

Acceptance:

- dashboard row-action isolation re-audit smoke passes;
- Summary, Stats, Copy, and Journal browser smokes pass;
- recent sessions controls and session dashboard browser smokes pass;
- boundary and owner contract smokes pass.

## Verification

- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
