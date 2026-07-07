# V6 Journal Row Action Exposure Gate Audit

Date: 2026-07-07

## Decision

Journal is ready for a deliberate exposure implementation step.

The exposure gate now has the required owner-side prerequisites:

- `journal-contract.js` has `commandSurfaceReady`, `persistenceReady`, and
  `surfaceReady` set to true;
- the Journal row-action session context strips blocked chart, bars, replay,
  viewport, orders, calendar, and journal-entry fields;
- the hidden Journal row-action harness is owner-side and uses injected
  callbacks;
- the hidden browser harness opens the existing Journal owner surface with real
  dashboard session metadata.

Step 116 update: visible Journal row-action browser coverage and wiring landed
after this audit. The exposure step updated `journal-contract.js`,
`session-row-action-boundaries.js`, dashboard handling, and browser coverage
together.

## Required Exposure Changes

A future exposure step must:

- set `journal-contract.js` `rowActionVisible` to true;
- set the Journal row action boundary to enabled and visible;
- wire the dashboard row-action click path to a Journal-owned adapter;
- add visible browser coverage for `data-v6-row-action="journal"`;
- prove Summary, Stats, and Copy remain unchanged;
- prove Journal still cannot load bars, open charts, advance replay, touch
  viewport state, read orders, or query calendar.

## Current Boundary State

- Recent Sessions renders Summary, Stats, Copy, and Journal.
- Journal is enabled and visible.
- `rowActionVisible` is true.
- The dashboard click handler handles `journal` row actions through a
  Journal-owned adapter.

## Next Direction

Step 116 should implement Journal row-action visibility wiring only if it adds
the visible browser smoke in the same step. Otherwise, Journal must remain
hidden.

## Verification

- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
