# Session — R6.10c1 Stable Pane Priority Identity

Date: 2026-07-23
Status: executable; human interaction and visual review pending

## Delivered

- changed layout leaves from reading order to stable right/high priority;
- defined opaque Pane ids as user-facing P1-P4 without coupling identity to
  active focus;
- retained P1..Pn whenever Pane count decreases;
- displayed compact Pane numbers only in multi-Pane status lines;
- kept Replay, Bar Data, chart-series ownership, and Time sync untouched.

## Automated Evidence

- all 12 pure layout variants have the reviewed spatial priority exactly once;
- four-to-three retains P1/P2/P3 and drops P4, including when P4 is active;
- multi-to-one retains P1 content;
- real Chrome proves two-column, two-row, and four-grid geometry and captures
  the revised multi-Pane presentation, then proves real 4-to-3 and 3-to-1
  materialization retains the correct Pane content without moving Replay;
- focused ownership/source-quality gates and the complete Harness suite pass
  before commit.

## Rollback Isolation

R6.10c Time remains isolated in `1bdcaab5`. This step does not import or call
its projection logic. A future Time revert may require regenerating two shared
visual fixtures, but it does not require reverting stable Pane identity.

## Next Boundary

Stop for human review. After acceptance, decide the Time rollback and specify
the right-click target-Pane location interaction against P1-P4.
