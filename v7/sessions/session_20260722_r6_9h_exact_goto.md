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

## Review Correction

The first review exposed a nested Calendar popover that opened above the Exact
dialog and was clipped, making date selection unusable. Exact GoTo now requests
the same Calendar Surface in an inline presentation: visible date and time
fields, prior/next month navigation, full month grid, and time steppers all
remain inside the one dialog. The real-Chrome Harness now clicks a selectable
Session date and changes the minute through the visible controls before
asserting the one normalized target value.

The follow-up review reported `chart-candles-not-painted` after repeated Exact
and Quick New York Session actions. An isolated real-data two-Pane probe ran
twelve alternating Exact/Quick cycles over the reported `2026-03-10 10:45` to
`2026-05-22 10:45` New York range: all target proposals reached the one shared
cursor and no target-resolution conflict occurred. The failure source is the
chart adapter's single transient pixel observation. Its bounded paint gate now
checks up to four two-frame paint opportunities within the same two-second
deadline before rejecting. The real-Chrome Workspace Harness additionally
executes three Quick New York Session ↔ Exact cycles and requires ready state
with no `CHART_CANDLES_NOT_PAINTED` receipt.
