# V7 Exact GoTo — R6.9h

Status: implemented; awaiting human interaction and visual review

## Product Boundary

Exact GoTo is a separate Workspace-level action beside Quick GoTo. The Quick
menu contains only its eight forward anchors; it does not contain a hidden
exact-date entry. Both presentations still submit through the existing
`goto-exact`/Replay Navigation path and move the one shared Replay cursor for
all visible Panes atomically.

The date/time is New York wall time and defaults to the current Replay cursor.
It remains an exclusive cutoff: a target of `13:00` can reveal through `12:59`
on a one-minute Pane and never reveals the target minute early.

## Session Range Presentation

The dialog shows the Replay Session start/end bounds. Its Calendar Surface
receives an immutable wall-date range, visually distinguishes the included
dates and both boundaries, and disables dates before or after that range.
This is generic Calendar presentation state; it contains no Replay, news,
order, journal, or economic-event ownership.

Dates alone cannot enforce boundary-day time. Submit therefore validates the
resolved instant against the closed Session range. An invalid or nonexistent
New York wall time keeps the dialog open, moves neither Replay nor Workspace,
and reports the explicit lower and upper New York bounds.

## Ownership

- Replay Workspace UI owns the separate trigger, dialog draft, and feedback.
- Calendar Surface owns date/time conversion and generic range presentation.
- Replay Navigation and Workspace Transaction retain the only cursor proposal
  and complete visible-Pane commit path.
- Economic Calendar may later reuse Calendar primitives, but remains an
  independent business module and is not required by Exact GoTo.

## Automated Gate

- Calendar Surface Harness covers ordered/valid dates plus
  before/start/inside/end/after/single range classification.
- Replay Pane Workspace real-Chrome Harness covers entry separation, current
  cursor default, disabled outside dates, highlighted boundaries, explicit
  out-of-range feedback with zero revisions, valid exclusive-cutoff movement,
  all-Pane completion, and the fixed dialog visual.
- Architecture, source-quality, relevant Replay Harnesses, JSON parsing, and
  `git diff --check` must pass before the review commit.

## Human Review Boundary

Verify the separate entry, default date/time, Calendar range treatment,
boundary-day errors, forward/backward/no-op Exact GoTo, and mixed-Pane atomic
response. Do not treat this document as acceptance evidence until the user
explicitly accepts the visible interaction.
