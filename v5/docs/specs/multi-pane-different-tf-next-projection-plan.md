# Step 537 Multi-Pane Different-TF Next Projection Plan

## Problem

Manual testing after Step 536 found that when left and right replay panes use
different display timeframes, candles can appear noticeably later than the
`Next` click.

The current same-timeframe path fans out inside `replay.next`, but
different-timeframe panes are still projected by a route event handler after the
`REPLAY_EVENTS.NEXT` event. That leaves a visible gap between the replay cursor
advance and the different-timeframe pane display update.

## Goal

Make `replay.next` complete one shared visible update for every pane in the
layout:

- same-timeframe panes receive the revealed replay bars through chart runtime
  append fanout;
- different-timeframe panes project their display window for the same cursor
  before `REPLAY_EVENTS.NEXT` is emitted;
- no pane should rely on route-level event catch-up for the normal `Next`
  visible path.

## Boundaries

- Replay runtime owns cursor/reveal ordering.
- Chart runtime remains the only writer of chart series.
- Bar-data runtime remains the only requester/cache owner for bars.
- Layout state supplies pane ids and display timeframes.
- Route event projection may remain as a defensive fallback, but the primary
  `Next` path must not depend on it.

## Steps

1. Step 537.1 - Document the bug and plan.
   - Update TODO/session/spec references.
   - Commit the plan before code changes.

2. Step 537.2 - Add a regression assertion for different-TF `Next`.
   - Tighten the existing multi-pane TF-change Next browser smoke so the
     different-timeframe pane must have its viewport cursor at the new replay
     cursor as soon as the command-observed update is complete.
   - Commit the failing or tightened test.

3. Step 537.3 - Move different-TF projection into replay `Next` fanout.
   - Let `projectDisplayForCursor` target an explicit pane id.
   - Have `replay.next` synchronously project every different-timeframe pane
     returned by `appendRevealedBarsToPanes`.
   - Emit `REPLAY_EVENTS.NEXT` only after same-TF append and different-TF
     projection have both finished.
   - Commit the runtime fix.

4. Step 537.4 - Verify and close.
   - Run targeted projection/fanout smokes and replay controls regression.
   - Update TODO/session result notes.
   - Commit the closeout docs.

## Acceptance

- The different-TF pane keeps its own display timeframe after `Next`.
- The different-TF pane viewport cursor follows the replay cursor without
  waiting for route event catch-up.
- Same-timeframe append fanout behavior remains unchanged.
- Existing multi-pane TF, replay controls, and pane projection smokes pass.

## Result

Completed in Step 537.

- The browser regression was tightened to use a non-default `1H` pane beside
  `1m` panes and to assert that the different-timeframe pane has reached the
  new replay cursor immediately after `replay.next` returns.
- `replay.next` now projects every different-timeframe pane returned by the
  chart fanout result before emitting `REPLAY_EVENTS.NEXT`.
- `projectDisplayForCursor` accepts explicit pane ids, so projection no longer
  silently targets only the default replay pane.
- Display-window projection now refreshes pane-local viewport follow even when
  the higher-timeframe bar set is unchanged.
- Route-level replay projection treats `paneFanoutProjected` payloads as
  already applied, keeping the event handler as a fallback instead of the normal
  visible path.
