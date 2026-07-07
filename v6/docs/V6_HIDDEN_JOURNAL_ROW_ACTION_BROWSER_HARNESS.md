# V6 Hidden Journal Row Action Browser Harness

Date: 2026-07-07

## Decision

The hidden Journal row-action harness now has browser coverage, but the
dashboard Journal row action remains hidden.

The browser smoke imports the Journal-owned hidden harness and the Step 111
session context factory inside the browser, creates a normal dashboard session,
and drives the harness with that session metadata. The harness opens the
existing Journal owner surface through injected callbacks only.

## Boundary Notes

- Recent Sessions still renders only Summary, Stats, and Copy row actions.
- No `journal` row-action button is rendered in Recent Sessions.
- The hidden harness receives only the normalized session context.
- The existing Journal workflow panel opens through the injected owner-surface
  callback.
- No dashboard click handler, chart, bars, replay, viewport, orders, or calendar
  path is wired to Journal.

## Next Direction

Step 114 should audit whether the hidden browser harness is enough to mark the
Journal owner surface `surfaceReady`, while keeping `rowActionVisible` false
until a deliberate exposure step.

## Verification

- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
