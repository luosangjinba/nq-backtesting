# Session — R6.9h Exact GoTo

Date: 2026-07-22
Status: awaiting human interaction and visual review

## Delivered

- separated Exact GoTo from the eight-action Quick GoTo menu into its own
  Workspace-level entry;
- defaulted its New York date/time control to the shared Replay cursor;
- added a reusable immutable Calendar date-range presentation contract;
- highlighted Replay Session dates and boundaries and disabled outside dates;
- retained closed-range instant validation for boundary-date time values;
- kept invalid input in the dialog with explicit New York bounds and zero
  Replay/Workspace transactions;
- retained the existing exclusive-cutoff `goto-exact` path and atomic response
  across all visible Panes.

## Evidence

- Calendar Surface and Replay navigation/response Harnesses pass;
- Replay Pane Workspace real-Chrome Harness binds separation, defaults,
  Calendar range state, invalid-input immutability, exact range end, mixed-Pane
  response, and a fixed Exact GoTo visual baseline;
- architecture, source-quality, JSON, and diff checks pass before commit.

## Review Boundary

Human review should cover the separate `Exact` entry, dialog visual hierarchy,
range highlighting/disabled dates, explicit boundary feedback, and exact
forward/backward/no-op behavior in single and multi-Pane layouts.
