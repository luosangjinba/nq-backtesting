# V6 Step 237 - Chart Entry Manual Previous Replacement Contract

## Decision

Step 237 defines the chart-entry contract for manual Previous replay chart
updates. It does not implement chart-entry previous behavior and does not enable
the transport Previous button.

The first chart-facing Previous implementation should be a chart-entry owned
replacement flow:

1. chart-entry dispatches `REPLAY_COMMANDS.PREVIOUS`;
2. chart-entry resolves the visible pane set;
3. chart-entry builds pane-local visible bars for the new replay cursor;
4. chart-entry calls `CHART_DATA_COMMANDS.REPLACE_BARS`;
5. downstream chart adapter and viewport owners react to chart-data revision and
   cursor state through their existing boundaries.

Shell, chart adapter, and chart-data must not remove a latest rendered bar
directly.

## Why Replacement

Manual Next appends one cursor-visible bar per pane and relies on chart-data
dedupe/merge. Manual Previous is not symmetric with append:

- source timeframe panes can remove one visible source bar;
- higher display timeframe panes may stay in the same projected bucket for
  several source cursor steps;
- multi-pane layouts can have different pane-local display timeframes;
- no-future visibility must be based on the new replay cursor, not on the last
  rendered candle;
- viewport intent must remain owned by chart viewport runtime.

Therefore Step Back should replace the pane-local chart-data record for the new
cursor instead of mutating rendered series or deleting a visible bar.

## Owner Responsibilities

Replay runtime:

- owns `REPLAY_COMMANDS.PREVIOUS`;
- moves the cursor backward and clamps at cursor index `0`;
- emits replay state events;
- does not know about panes, chart-data, bar-data, viewport, or shell controls.

Chart-entry manual previous:

- owns the future transport-facing chart replay previous command;
- resolves target pane ids using the same payload model as manual next;
- dispatches `REPLAY_COMMANDS.PREVIOUS` exactly once per source cursor step;
- builds a pane-local replacement record for each target pane;
- calls `CHART_DATA_COMMANDS.REPLACE_BARS`;
- emits a chart-entry manual previous event after all target pane replacements
  are complete;
- keeps errors local to its runtime state.

Pane runtime:

- owns pane-local instrument, source timeframe intent, and display timeframe;
- chart-entry reads pane records but does not mutate pane settings.

Chart-data runtime:

- owns pane-local visible records and revisions;
- receives replacement payloads only through `REPLACE_BARS`;
- does not inspect replay state or request bars;
- does not expose rollback/remove semantics for Step Back.

Bar-data runtime:

- owns cache lookup and bounded loading;
- may be used by chart-entry only when current chart-data is not sufficient to
  produce a correct no-future replacement;
- remains the only runtime that requests bars.

Chart-data projection runtime:

- owns source-to-display timeframe projection when display timeframe is higher
  than source timeframe;
- should receive source bars and the previous replay cursor timestamp from
  chart-entry;
- chart-entry chooses the projected bars that are visible at or before the new
  cursor.

Chart viewport runtime:

- owns manual/default wall intent;
- must preserve current viewport intent when chart-data is replaced for
  previous replay;
- should be updated only through existing chart-data revision/cursor projection
  boundaries, not directly by shell.

Shell transport:

- owns DOM state and user input only;
- keeps `data-v6-transport-step-back` disabled until chart-entry previous,
  viewport preservation, and browser coverage are implemented;
- does not dispatch `REPLAY_COMMANDS.PREVIOUS` directly.

## Replacement Source Strategy

Use a combined strategy:

1. Prefer current chart-data filtering.
   - Source timeframe panes can filter the current pane record to bars whose
     timestamp is at or before the new replay cursor timestamp.
   - Higher display timeframe panes may retain the same projected bucket if the
     new cursor is still inside that bucket.
   - This avoids a full session-start reload on every step back.

2. Fall back to bounded bar-data loading.
   - If current chart-data has no bars, has an ambiguous projected bucket, or
     cannot prove no-future visibility, chart-entry requests a bounded bar-data
     window ending at the new replay cursor.
   - The fallback window should be sized to the visible/revealed replay range or
     current pane record span, not an unbounded full date range.
   - Bar-data still owns the actual request/cache behavior.

3. Project only when needed.
   - For display timeframe equal to source timeframe, replacement bars are
     source bars at or before cursor.
   - For higher display timeframe panes, chart-entry uses
     `CHART_DATA_PROJECTION_COMMANDS.PROJECT` and keeps projected bars whose
     bucket start is visible at or before the previous cursor.

## No-Future Rule

For every target pane, the replacement record must not contain data newer than
the accepted replay cursor for that pane's display timeframe.

The allowed visible edge is:

- source timeframe pane: `bar.timestamp <= replayCursorTimestamp`;
- higher display timeframe pane: projected bucket start/end must not reveal a
  bucket whose source data is entirely after the replay cursor.

If a bucket contains the cursor, it may remain visible only with source data
clipped or projected from the available source bars up to that cursor. It must
not include future source bars from later in that bucket.

## Viewport Rule

Manual Previous must preserve user viewport intent:

- do not reset view;
- do not move default/manual wall origin unless the viewport owner explicitly
  projects a chart-data revision;
- do not call chart adapter APIs directly from chart-entry or shell.

## First Implementation Slice

Step 238 should implement **Chart Entry Manual Previous Runtime Skeleton**:

- add `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS` and events;
- create a focused chart-entry manual previous runtime module;
- register `GET_STATE` and `PREVIOUS`;
- dispatch `REPLAY_COMMANDS.PREVIOUS`;
- replace pane-local chart-data through `CHART_DATA_COMMANDS.REPLACE_BARS`;
- keep the transport Previous button disabled;
- keep shell transport unwired.

If replacement helpers become non-trivial, they should be small chart-entry
domain helpers, not stacked into the runtime entry file.

## Non-Goals

- Do not enable the transport Previous button in Step 237.
- Do not implement chart-entry manual previous behavior in Step 237.
- Do not add chart-data rollback/remove commands.
- Do not mutate chart adapter series directly.
- Do not change viewport, bar-data, pane state, indicators, trading simulation,
  order tickets, prop firm rule engines, or journal workflows.

