# V7 Real-time Time Sync Rollback — R6.10c2

Status: accepted after human interaction and visual review (2026-07-23)

## Product Decision

Real-time Time synchronization by ordinary chart click is removed. It couples
focus and Crosshair interaction to Viewport navigation, is difficult to aim
precisely across mixed timeframes, and has lower practical value than an
explicit command anchored to a selected bar.

The accepted Layout Sync menu therefore exposes Symbol, Interval, and
Crosshair only. An ordinary pointer click may focus a Pane and update its
native Crosshair/OHLC state; it must not reposition another Pane.

Pointer displacement remains an adapter-local interaction fact: only a real
drag of at least two pixels may publish a captured manual Viewport and request
history-boundary evaluation. A click without displacement publishes neither.

## Compatibility

The versioned Layout Sync value retains its `time` boolean as inert data. This
avoids a persistence schema reversal and lets Sessions written during the
short-lived R6.10c slice reopen safely. No menu control, UI controller call, or
chart-adapter consumer reads that field as behavior.

The rollback does not alter:

- stable P1-P4 identities or priority-based count reduction;
- accepted Symbol, Interval, and Crosshair synchronization;
- active-Pane focus behavior;
- Replay cursor/reveal ownership;
- Workspace transactions, Bar Data requests, series writes, or Viewport
  persistence.

## Replacement Boundary

The replacement will be specified independently as a right-click action on an
exact source bar. It may target one named P1-P4 Pane or all other visible
Panes. It must move target Viewports only; it must not move Replay, replace a
Pane Workspace, or reinterpret an ordinary click.

No right-click implementation and no Date-range synchronization are part of
this rollback commit.

## Automated Gate

- focused controller and adapter Harnesses have no real-time Time consumer;
- a real-browser adapter assertion distinguishes an ordinary click from a
  native chart drag, preserving manual Viewport capture only for the latter;
- the real-browser Layout menu contains exactly Symbol, Interval, and
  Crosshair;
- stable Pane geometry, priority reduction, Crosshair sync, and Session
  re-entry continue to pass;
- visual baselines are regenerated after removal of the Time row while keeping
  the accepted P1-P4 labels.

Human interaction and visual review accepted the isolated rollback on
2026-07-23. The next independent slice specifies explicit right-click time
location; Date-range synchronization remains deferred.
