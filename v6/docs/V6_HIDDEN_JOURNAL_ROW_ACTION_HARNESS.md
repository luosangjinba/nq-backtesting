# V6 Hidden Journal Row Action Harness

Date: 2026-07-07

## Decision

The hidden Journal row-action harness is available for owner-side testing. Step
116 later exposed the dashboard Journal row action through a shell adapter that
uses this owner-side harness.

The harness lives under `v6/src/journal/`, consumes an injected
`createJournalRowActionSessionContext` context factory, and exposes `prepare`
and `open` methods for future owner-surface wiring. It accepts injected
`openSurface` and `refreshSurface` callbacks so the harness can be tested
without importing shell UI, dashboard UI, runtime commands, persistence bridges,
or browser state.

## Boundary Notes

- Dashboard markup now includes the visible Journal action through Step 116.
- No chart, bars, replay, viewport, orders, or calendar runtime behavior changed.
- The direct hidden harness default still reports `rowActionVisible` false unless
  an adapter opts into visibility.
- The harness does not dispatch commands.
- The harness does not load bars, open charts, advance replay, touch viewport
  state, query orders, or query calendar.
- The harness strips blocked context by depending on the Step 111 session
  context helper.

## Next Direction

Step 113 added a hidden browser harness for the Journal row-action flow. Step
116 later added the visible `data-v6-row-action="journal"` adapter path.

## Verification

- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
