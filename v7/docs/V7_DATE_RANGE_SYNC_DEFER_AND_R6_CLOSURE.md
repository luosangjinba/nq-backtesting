# V7 Date-range Sync Deferral And R6 Closure

Status: accepted product decision and completed R6 interaction audit (2026-07-23)

## Decision

V7 does not activate real-time Date-range synchronization in the chart
foundation. Dragging or zooming one Pane therefore continues to change only
that Pane's visible market-time window.

This is a deliberate product decision, not an unfinished R6 implementation:

- Crosshair sync already supports momentary comparison across Panes;
- explicit right-click Pane time location supports precise, intentional
  comparison at one market instant;
- Pane-local navigation preserves the main value of mixed instruments,
  timeframes, and ETH/RTH views;
- continuous visible-range fan-out would add feedback-loop suppression,
  history-request amplification, and rendering coupling to a path whose user
  value is currently unproven.

The versioned `dateRange` preference remains present with default `false` only
as inert compatibility data. There is no Date-range control in the Layout
menu, no chart subscription consumer, and no programmatic range fan-out.

## Revisit Gate

Date-range sync may be reconsidered only from concrete comparison-workflow
evidence. Any future implementation must be an explicit opt-in feature behind
the chart adapter, suppress projection feedback, coalesce history boundaries,
preserve independent Pane data identity, and never persist native chart
coordinates. It is not an automatic R7 task.

## R6 Closure Audit

The accepted R6 surface now covers:

- one-to-four resizable Pane layouts with stable P1-P4 identity and reviewed
  count-reduction priority;
- Pane-local instrument, timeframe, Viewport, OHLC, and presentation settings;
- Session-wide Replay and ETH/RTH with atomic complete-Pane replacement;
- Symbol, Interval, and Crosshair Layout Sync policies;
- explicit right-click cross-Pane market-time location, including automatic
  bounded left-history extension;
- the reviewed fixed Replay transport, GoTo paths, Settings surfaces, and
  performance/correctness corrections.

The cumulative human reviews accept H021, H054, H062, H063, H066, and the new
H067 omission invariant. Older R0 governance rules that still carry an
`executable` lifecycle are not silently promoted by this product review.

R6 interaction work is closed. The overall chart foundation is not yet closed:
the remaining declared foundation gap is UX-FND-004, complete Session-scoped
soft re-entry and hard-refresh Workspace restoration.

## Exact Next Slice

R7.1 must first specify the durable Workspace checkpoint and restore
transaction. It must restore Session identity, shared Replay cursor/reveal
boundary, Pane layout and stable identities, Pane-local instrument/timeframe/
Viewport intents, Session Hours, and accepted Layout Sync policy without
persisting bars or native chart coordinates.

Transient UI state stays reset on restore: Autoplay is paused, truncation and
menus are closed, and maximize is not persisted. Restoration must rematerialize
through Workspace Transaction and Bar Data owners, publish one complete
snapshot, isolate Sessions, migrate older configured records, and show an
explicit failure state rather than a mixed partial chart.
