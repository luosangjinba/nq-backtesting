# V7 Pane Priority Identity — R6.10c1

Status: executable; human interaction and visual review pending (2026-07-23)

## Product Decision

Pane identity is stable and independent of focus. V7 exposes four compact
user-facing identities, `P1` through `P4`, backed by the existing opaque Pane
ids. A click changes only the active Pane; it never renumbers the layout.

The reviewed priority is geometry-based:

1. farther right first;
2. when right edges are equal, higher first.

The same rule makes P1 the right Pane in a column layout and the top Pane in a
row layout. It also covers spanning Pane variants without a special active-
Pane exception.

| Layout | Spatial Pane identities |
| --- | --- |
| single | P1 |
| two columns | left P2; right P1 |
| two rows | top P1; bottom P2 |
| three columns | left P3; middle P2; right P1 |
| three rows | top P1; middle P2; bottom P3 |
| two left, one right | left-top P2; left-bottom P3; right P1 |
| one left, two right | left P3; right-top P1; right-bottom P2 |
| four grid | left-top P3; right-top P1; left-bottom P4; right-bottom P2 |
| three left, one right | left P2/P3/P4 top-to-bottom; right P1 |
| one left, three right | left P4; right P1/P2/P3 top-to-bottom |
| one top, three bottom | top P1; bottom P4/P3/P2 left-to-right |
| three top, one bottom | top P4/P3/P1 left-to-right; bottom P2 |

Multi-Pane status lines display the short identity. Single Pane hides the
redundant P1 label. DOM and accessibility metadata also expose the stable Pane
number so a later explicit time-location menu can name targets without relying
on symbol, timeframe, focus, or current geometry.

## Count Transition Contract

Reducing Pane count always retains the stable prefix `P1..Pn`:

- two to one retains the right Pane in columns or the top Pane in rows;
- four-grid to three retains right-top P1, right-bottom P2, and left-top P3;
- P4 is dropped even when it is active; focus then falls back to P1;
- every retained Pane keeps its instrument, timeframe, Viewport owner, and
  chart identity.

Expanding creates only the missing lower-priority identities through the
existing complete Pane-set materialization. Same-count layout changes merely
place the same identities into the new reviewed geometry. Neither path consults
or moves Replay.

The accepted Pane layout wire format stores a variant and split ratios, not
spatial leaf order, so this product correction requires no persistence schema
bump. Existing Session layouts adopt the corrected identity geometry when
opened.

## Ownership And Existing-Capability Check

Lightweight Charts native panes still do not fit independent product Panes:
they share one chart time scale. The already-reviewed outer DOM split tree
remains the correct owner. This correction changes only pure layout leaves and
Replay Workspace UI identity presentation; chart series ownership, Bar Data,
Viewport, Workspace Transaction, and Replay remain unchanged.

The previous Time synchronization slice is not a dependency. It remains in
commit `1bdcaab5` and can be reverted separately. Two shared visual fixtures
will need regeneration during that future rollback because both Time controls
and Pane positions are visible in them; no Pane identity source rollback is
required.

## Automated Gate

- Pane Layout Domain binds the spatial slot matrix for all 12 variants and
  proves every priority occurs exactly once;
- Pane identity tests bind opaque ids to stable P1-P4 labels and reject unknown
  identities;
- Pane Workspace State proves 4-to-3 and multi-to-one retain content by
  priority and that a removed active Pane falls back to P1;
- real Chrome proves P1 is right in two columns, top in two rows, and that the
  four-grid geometry is P1 right-top, P2 right-bottom, P3 left-top, P4
  left-bottom; it then proves real 4-to-3 and 3-to-1 materialization retains
  the exact survivor content without moving Replay;
- updated visual fixtures expose the compact identity labels only in
  multi-Pane layouts.

Stop after the independent commit for human interaction and visual review.
Only after acceptance should the separate real-time Time-sync rollback and
right-click time-location target design proceed.
