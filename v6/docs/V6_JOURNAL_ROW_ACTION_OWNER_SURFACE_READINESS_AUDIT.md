# V6 Journal Row Action Owner Surface Readiness Audit

Date: 2026-07-07

## Decision

The Journal owner surface is not ready for dashboard row-action exposure yet.

The existing workstation Journal panel is a valid journal-owned surface for the
workstation workflow: it dispatches journal and journal-persistence commands,
has controller coverage, and has browser coverage through the workflow panel
smoke. It is not yet a session-scoped dashboard row-action surface because it
does not accept a recent-session context, does not prove row-action opening from
the dashboard, and does not have browser coverage for
`data-v6-row-action="journal"`.

Keep the Journal dashboard row action hidden.

## Current Readiness

Ready:

- `journal-contract.js` marks the command surface as ready.
- `journal-contract.js` marks persistence as ready.
- `journal-surface.js` dispatches only journal and journal-persistence commands.
- `journal-surface-controller-smoke.js` guards the DOM controller and forbids
  chart, bars, replay, and viewport commands.
- `workflow-panels-browser-smoke.js` verifies the workstation Journal panel can
  open, close, keep active state, and remain mutually exclusive with other
  workflow panels.

Not ready:

- `journal-contract.js` still marks `surfaceReady` false.
- `journal-contract.js` still marks `rowActionVisible` false.
- `session-row-action-boundaries.js` still keeps Journal hidden and disabled.
- No browser smoke opens Journal from a recent-session row action.
- The current Journal panel is not session-scoped from a dashboard row context.

## Minimum Exposure Gate

Before Journal can become visible in Recent Sessions, the next implementation
must add or prove a journal-owned session context contract that:

- opens the Journal surface from a selected recent-session row;
- passes only session metadata/context owned by the dashboard row;
- dispatches only journal or journal-persistence commands;
- does not load bars, open charts, advance replay, touch viewport state, query
  orders, or query calendar;
- includes a dedicated browser smoke for `data-v6-row-action="journal"`;
- keeps Order and Calendar hidden.

## Next Direction

Step 111 should define the Journal row-action session context contract and
browser harness while keeping the row action hidden until that contract is
implemented.

## Verification

- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
