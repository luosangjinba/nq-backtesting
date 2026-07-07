# V6 Hidden Journal Row Action Harness

Date: 2026-07-07

## Decision

The hidden Journal row-action harness is available for owner-side testing, but
the dashboard Journal row action remains hidden.

The harness lives under `v6/src/journal/`, consumes an injected
`createJournalRowActionSessionContext` context factory, and exposes `prepare`
and `open` methods for future owner-surface wiring. It accepts injected
`openSurface` and `refreshSurface` callbacks so the harness can be tested
without importing shell UI, dashboard UI, runtime commands, persistence bridges,
or browser state.

## Boundary Notes

- No dashboard markup changed.
- No runtime behavior changed.
- `rowActionVisible` remains false.
- The harness does not dispatch commands.
- The harness does not load bars, open charts, advance replay, touch viewport
  state, query orders, or query calendar.
- The harness strips blocked context by depending on the Step 111 session
  context helper.

## Next Direction

Step 113 should add a hidden browser harness for the Journal row-action flow,
still without exposing `data-v6-row-action="journal"` in Recent Sessions.

## Verification

- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
