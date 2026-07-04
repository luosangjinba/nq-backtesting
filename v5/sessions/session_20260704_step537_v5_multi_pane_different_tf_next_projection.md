# Step 537 V5 Multi-Pane Different-TF Next Projection

Date: 2026-07-04

## Trigger

Manual testing reported severe visible delay after clicking `Next` when two
replay panes use different timeframes.

## Diagnosis

The Step 534 fanout rebuild made same-timeframe panes update inside
`replay.next`, but different-timeframe panes still depended on the chart route's
`REPLAY_EVENTS.NEXT` projection handler. That handler runs after the replay
event and can load a display window later than the cursor advance.

## Plan

1. Document Step 537 and commit the plan.
2. Tighten browser coverage for the different-timeframe `Next` path.
3. Move different-timeframe pane projection into replay runtime's synchronous
   `Next` fanout before event emission.
4. Run targeted regression gates, then update TODO/session closeout.

## Result

Completed.

The failing browser reproduction showed `primary` and `tertiary` at replay
cursor `1780306260` while the non-default `secondary` `1H` pane still had
viewport cursor `1780306200` when `replay.next` returned.

The fix moved different-timeframe pane projection into replay runtime's `Next`
fanout:

- `projectDisplayForCursor` now accepts an explicit `paneId`.
- `replay.next` projects all `paneFanout.projected` panes before emitting
  `REPLAY_EVENTS.NEXT`.
- Display-window loads sync viewport follow even when the display bar set did
  not change.
- Route event projection skips already-applied fanout projections.

## Verification

- `node v5/tests/chart-replay-pane-projection-smoke.js` passed.
- `node v5/tests/replay-chart-sync-fanout-smoke.js` passed.
- `node v5/tests/pane-display-state-store-static-smoke.js` passed.
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js` passed.
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js` passed.
- `node v5/tests/replay-controls-browser-smoke.js` passed.
- `git diff --check` passed.

## Commits

- `a2a7370 docs(v5): plan different timeframe next projection`
- `02e4437 test(v5): expose different timeframe next projection lag`
- `39086ef fix(v5): project different timeframe panes during next`
