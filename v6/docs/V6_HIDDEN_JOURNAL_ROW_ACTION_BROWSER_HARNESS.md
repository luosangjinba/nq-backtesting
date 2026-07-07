# V6 Hidden Journal Row Action Browser Harness

Date: 2026-07-07

## Decision

The hidden Journal row-action harness now has browser coverage. Step 116 later
made the dashboard Journal row action visible through a separate adapter.

The browser smoke imports the Journal-owned hidden harness and the Step 111
session context factory inside the browser, creates a normal dashboard session,
and drives the harness with that session metadata. The harness opens the
existing Journal owner surface through injected callbacks only.

## Boundary Notes

- Recent Sessions now renders Summary, Stats, Copy, and Journal row actions.
- The hidden harness remains callable independently from the visible adapter.
- The hidden harness receives only the normalized session context.
- The existing Journal workflow panel opens through the injected owner-surface
  callback.
- The visible dashboard click handler delegates to the Journal-owned adapter;
  chart, bars, replay, viewport, orders, and calendar paths remain unwired.

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
