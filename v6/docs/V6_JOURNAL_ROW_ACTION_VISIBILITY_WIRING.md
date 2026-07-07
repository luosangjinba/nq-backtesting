# V6 Journal Row Action Visibility Wiring

Date: 2026-07-07

## Decision

Journal is visible in Recent Sessions.

The visibility wiring updates the owner contract, row-action boundaries,
dashboard handling, and browser coverage together:

- `journal-contract.js` reports `rowActionVisible: true`;
- `session-row-action-boundaries.js` marks Journal enabled and visible;
- `session-dashboard.js` delegates Journal row-action clicks to an injected
  Journal row-action adapter;
- `journal-row-action-adapter.js` connects the hidden Journal harness to the
  existing Journal owner surface;
- `session-journal-row-action-browser-smoke.js` covers the visible
  `data-v6-row-action="journal"` path.

## Boundary Notes

- The dashboard does not dispatch Journal commands directly.
- Journal row-action handling goes through the Journal-owned harness and context
  factory.
- Summary, Stats, and Copy remain visible and covered.
- Journal still cannot load bars, open charts, advance replay, touch viewport
  state, read orders, or query calendar.

## Next Direction

Step 117 should audit visible Journal row-action regression coverage as part of
the dashboard row-action browser pack.

## Verification

- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
