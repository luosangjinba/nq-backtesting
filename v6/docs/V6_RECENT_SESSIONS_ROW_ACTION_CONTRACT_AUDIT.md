# V6 Recent Sessions Row Action Contract Audit

Date: 2026-07-07

## Decision

The Recent Sessions row action set is now contract-complete for the current
session-dashboard phase.

Visible actions:

- Summary: enabled, owner `session-summary`, read-only metadata surface.
- Stats: enabled, owner `session-analytics`, read-only metadata plus
  unavailable metric placeholders.
- Copy: enabled, owner `session-repository`, metadata-only duplication.

Hidden actions:

- Order: hidden/disabled, owner `orders-runtime`, contract-ready only.
- Journal: hidden/disabled, owner `journal-runtime`, contract-ready only.
- Calendar: hidden/disabled, owner `calendar-runtime`, contract-ready only.

## Boundary

The dashboard may render row action buttons and dispatch explicit owner commands
for enabled actions only. It must not compute analytics, clone sessions, query
orders, query journal entries, query calendar events, load bars, open chart
runtime, advance replay, or touch viewport state.

Order, Journal, and Calendar remain inaccessible from Recent Sessions until
their owner surfaces are implemented and guarded by browser tests.

## Verification

- `v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `v6/tests/session-row-action-boundaries-smoke.js`
- `v6/tests/boundary-smoke.js`
- `v6/tests/recent-sessions-controls-browser-smoke.js`
