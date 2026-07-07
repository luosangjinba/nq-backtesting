# V6 Journal Row Action Session Context Contract

Date: 2026-07-07

## Decision

The Journal row-action session context is defined, but the dashboard Journal
row action remains hidden.

The context belongs to `journal-runtime`. It accepts only recent-session
metadata that a dashboard row already owns and converts the dashboard row id to
`sessionId`. It must not carry bars, chart state, replay state, viewport state,
orders, calendar events, or existing journal entries.

## Allowed Context

The Journal owner may receive:

- `sessionId`
- `name`
- `symbol`
- `symbols`
- `timeframe`
- `startTime`
- `endTime`
- `status`
- `accountBalance`
- `profileId`
- `workspaceId`
- `createdAt`
- `source`

`source` is fixed to `recent-session-row`.

## Blocked Context

The context contract blocks:

- `activeReplayState`
- `bars`
- `calendarEvents`
- `chartState`
- `journalEntries`
- `orders`
- `replayState`
- `viewportState`

## Boundary Notes

- No dashboard row action was exposed.
- No runtime behavior changed.
- The contract is a pure Journal-owned helper under `v6/src/journal/`.
- A future browser harness may use this contract before wiring a visible
  `data-v6-row-action="journal"` button.

## Next Direction

Step 112 should add a hidden Journal row-action harness or owner-surface adapter
that consumes this context while keeping the visible dashboard row actions
unchanged.

## Verification

- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
