# Session — R6.10c3 Post-location History Fill Correction

Date: 2026-07-23
Status: human accepted on 2026-07-23

## Human Review Finding

The first R6.10c3 review found that some target Panes could center the selected
time with a large blank area on the left but would not extend older candles
until a later mouse drag/wheel interaction. Screenshots showed the problem in
both two- and four-Pane layouts.

## Root Cause

Explicit location captured and published the new manual Viewport but, unlike a
native chart drag, did not publish the resulting logical range to the existing
history-boundary owner. The next mouse interaction supplied that missing
boundary notification, which explains why history loading then resumed.

## Correction

- the chart adapter now publishes the accepted post-location logical range
  through the same `onHistoryBoundary` port used by native Viewport changes;
- Replay Workspace controller retains the existing `from < 24` decision and
  Workspace Execution retains all queuing/materialization ownership;
- no provider request, bar mutation, or transaction logic moved into the chart
  adapter;
- a real browser assertion now requires the notification during explicit
  location, without any follow-up mouse event.

The user repeated the interaction review and reported acceptance on
2026-07-23. H066 is accepted: programmatic Pane time location now triggers the
same owner-routed left-history extension as native navigation without waiting
for a later mouse event.
