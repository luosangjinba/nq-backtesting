# V7 Explicit Pane Time Location — R6.10c3

Status: human accepted on 2026-07-23 after the post-location history-fill correction

## Product Decision

V7 replaces rejected real-time Time synchronization with one explicit,
one-shot command. The user right-clicks an exact candle in one source Pane and
chooses one named target Pane or `All other panes`. Ordinary clicks continue to
change focus only and never move another Pane.

The context menu uses stable P1-P4 identities and shows each target's current
instrument and timeframe. Pane numbers do not follow active focus or reading
order.

## Time Semantics

The selected value is the source candle's canonical market `startEpochMs`, not
its compressed chart-display time. This is required because different
timeframes and RTH filtering can place the same market instant at unrelated
display coordinates.

A target Pane may move only when one of its real candles contains the selected
market instant:

- exact source selection requires a real plotted candle; future whitespace,
  axes, and inter-bar gaps do not open the V7 menu;
- the target keeps its current logical span and centers the containing candle;
- the accepted post-location range is immediately reported to the existing
  history-boundary owner, so a newly exposed left edge can fill without a
  follow-up mouse event;
- if the selected instant predates loaded target history, Bar Data and
  Workspace Transaction owners load bounded older history before retrying;
- if no target candle contains the instant, the command reports unavailable
  and does not snap to an unrelated session, weekend, holiday, or future bar.

Each history request is bounded to at most 35 source-data days. One command may
request at most 16 successive windows, serially, so it cannot create an
unbounded fetch loop or overlapping Workspace transactions.

## Ownership

```text
Pane context menu
  -> Pane Time Location Domain (selection, command, pure target plan)
  -> Replay Workspace coordinator
     -> Lightweight Chart Adapter (coordinate/time mapping, target Viewport)
     -> Workspace Transaction -> Bar Data Runtime (history only when required)
```

- Pane Time Location Domain owns validation and the pure `located`,
  `history-required`, or `unavailable` decision.
- Replay Workspace UI owns only menu DOM, target orchestration, and feedback.
- Lightweight Chart Adapter is the only owner allowed to read native chart
  coordinates or write the target visible logical range.
- Workspace Transaction and Bar Data owners remain the only history
  materialization path; the menu/controller never requests providers directly.
- Replay Runtime remains the only Replay cursor/reveal owner and is not called
  by this command.

## Protected Invariants

When target history is already present, a successful command changes only the
chosen target Viewport. It does not change:

- source or active Pane;
- Replay cursor, reveal state, transport, or revision;
- Pane instrument, timeframe, ETH/RTH, or layout;
- Workspace revision or chart-series data;
- any non-target Pane Viewport.

History materialization may advance Workspace state only through the existing
atomic transaction path. It still must not move Replay or alter Pane
configuration. Partial `All other panes` failure leaves successful targets
located, leaves unavailable targets untouched, and names the unavailable
targets without substituting other candles.

Date-range synchronization remains absent. The R6 closure decision deliberately
defers it beyond the chart foundation; its persisted key remains inert
compatibility data only.

## R7.3o Dense RTH Preservation Correction

A later two-Pane review exposed a source-ledger regression outside the
time-location owner. After a dense RTH replacement, locating P1 history in P2
materialized the complete Pane set. P2 correctly received
`time-location-history`, while unchanged P1 received an ordinary navigation
request whose window was narrower than P1's already accepted RTH source wall.
Replacing P1 with only that acquired window collapsed its candles against the
retained wide logical span.

The Pane-local source ledger now retains ordered accepted raw batches when they
fully cover that smaller request under the exact same raw source scope. P2
still loads and locates through the bounded Workspace/Bar Data path; P1 keeps
its independent Viewport and source history. A real-Chrome regression recreates
the dense RTH source Pane, invokes the actual right-click `Locate in P2`
command, and proves P1 bar count and logical span do not collapse.

## Automated Gate

- domain Harness covers branded selections/commands, span-preserving plans,
  missing history, no-containing-bar behavior, and fixture-backed failures;
- controller Harness covers mixed instruments/timeframes, bounded history
  retry, partial unavailability, unchanged active source, and blank-space
  rejection;
- real chart-adapter Chrome covers exact candle hit testing, future-whitespace
  rejection, target centering, manual Viewport capture, immediate history-
  boundary publication, and no mutation on unavailable plans;
- real four-Pane Chrome covers P1-P4 labels, mixed NQ 1m / ES 4h targets,
  `All other panes`, unchanged Replay/Workspace revisions, and a dedicated
  context-menu visual;
- architecture, source-quality, full regression, and `git diff --check` gates
  must pass before commit.

## Human Review Gate

1. Open a four-Pane Session and make at least one target use another instrument
   and another timeframe.
2. Right-click a real candle. Confirm the menu names the source and stable
   P1-P4 targets with instrument/timeframe labels.
3. Locate the time in one target. Confirm that target keeps approximately the
   same zoom, centers the matching time, and the source stays active.
4. Use `All other panes`; confirm every eligible target moves while Replay,
   layout, symbol, timeframe, and ETH/RTH stay unchanged.
5. Right-click future whitespace, an axis, and an inter-bar gap; confirm the V7
   menu does not open.
6. Select an older source candle whose target history is not loaded, or whose
   centered target Viewport exposes blank space at the left. Without clicking,
   dragging, or zooming afterward, confirm bounded history fills automatically
   and the exact market time stays centered.
7. Repeat in RTH across an overnight/weekend boundary. Confirm no target snaps
   to an unrelated RTH session when no containing candle exists.
8. Confirm Escape, outside click, resize, layout change, or a pending Workspace
   operation closes the menu; ordinary left-clicks still never move another
   Pane.

The user completed the repeat review on 2026-07-23 and accepted the corrected
automatic left-history extension. Acceptance evidence is recorded in
`sessions/session_20260723_r6_10c3_location_history_correction.md`.
