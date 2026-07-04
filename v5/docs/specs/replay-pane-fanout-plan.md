# Replay Pane Fan-Out Plan

Phase: Phase 3 - Real Chart Interaction / Replay workstation stabilization.

Step: 529 planned.

## Purpose

Manual testing still reports multi-pane display instability around pane-local
timeframe changes and pane-local chart movement. One likely structural cause is
the current replay advancement shape:

1. replay runtime advances the shared cursor and writes the primary pane;
2. `REPLAY_EVENTS.NEXT` is emitted;
3. route-level replay pane projection catches the event and updates
   secondary/tertiary panes.

That path is not a direct primary-pane data dependency, but it is still a
primary-first / event-catch-up model. It can race with pane-local display
loading, active-pane timeframe changes, manual viewport state, and layout sync
changes.

Step 529 should replace same-timeframe replay pane updates with one coordinated
fan-out transaction for each revealed replay batch.

## Target Shape

For a replay `Next` or coalesced rapid-next batch:

1. replay runtime computes one `revealedBars` batch and one target cursor;
2. a replay/chart synchronization boundary receives a layout pane snapshot;
3. same-timeframe panes receive the same `CHART_COMMANDS.APPEND_BARS` payload
   in one coordinated fan-out;
4. different-timeframe panes project their own display window anchored to the
   same cursor through replay/bar-data owned loading;
5. `REPLAY_EVENTS.NEXT` remains a notification event, not the main mutation
   channel for same-timeframe pane K-line distribution.

The intended control flow is:

`replay runtime -> coordinated pane fan-out -> chart runtime writes target panes -> replay NEXT event`

The old control flow should no longer be the primary path:

`replay runtime -> primary append -> NEXT event -> route projection catch-up -> secondary append`

## Ownership Rules

- Replay runtime remains the owner of cursor progression, reveal state, and
  no-future-bars semantics.
- Chart runtime remains the only owner of chart series writes.
- Bar-data runtime remains the only requester/cache owner for bars.
- Layout runtime remains the owner of pane list, active pane id, pane
  timeframes, sync flags, and split ratios.
- Route/pane orchestrator may provide a read-only layout pane snapshot and
  dispatch commands; it must not become a chart data owner.
- Same-timeframe fan-out may update data and follow cursor for target panes,
  but must not overwrite a pane's manual visible range unless that pane is in
  follow mode according to chart runtime state.
- Different-timeframe panes must not receive raw replay-timeframe bars. They
  must continue to load/project their own display timeframe window anchored to
  the replay cursor.

## Step 529 Detailed Plan

1. Step 529.1 - Plan and current-path audit.
   - Record this spec, session handoff, and TODO direction.
   - Confirm the current path from `replay-navigation-controller` to
     `replay-chart-sync` to `chart-replay-pane-projection`.
   - Commit the planning docs before behavior changes.

2. Step 529.2 - Add ordering/contract coverage.
   - Add a multi-pane fan-out smoke that verifies same-timeframe panes are
     updated from one replay result, not by relying on the post-`NEXT` event
     projection path.
   - The smoke should assert primary/secondary cursor metadata, full-bar
     deltas, rendered bars, no forward fetch during append, and trace/order
     markers that prove the secondary append happens before `NEXT` notification
     is used for projection.
   - Commit the test harness before implementation if it can be made to fail
     against the current catch-up model.

3. Step 529.3 - Introduce the fan-out boundary.
   - Extend replay chart synchronization with a pane-aware fan-out API such as
     `appendRevealedBarsToPanes`.
   - The API receives `revealedBars`, `cursorTimestamp`, replay timeframe, and
     a layout pane snapshot; it does not read layout runtime internals itself.
   - Same-timeframe panes dispatch `CHART_COMMANDS.APPEND_BARS` with the same
     `revealedBars` and same cursor follow payload.
   - Commit the new boundary with focused unit/contract coverage.

4. Step 529.4 - Move replay `Next` same-timeframe writes to fan-out.
   - Change replay `Next` so same-timeframe pane updates happen before
     `REPLAY_EVENTS.NEXT` notification.
   - Primary is no longer special for same-timeframe append except as one pane
     id in the fan-out target list.
   - Keep cursor persistence after visible update, preserving the Step 484
     latency decision.
   - Commit the behavior change.

5. Step 529.5 - Reduce old projection responsibility.
   - `chart-replay-pane-projection` should stop appending same-timeframe
     `revealedBars` as its normal `NEXT` reaction.
   - It may keep different-timeframe display-window projection and fallback
     behavior while the fan-out path is hardened.
   - Commit the projection cleanup.

6. Step 529.6 - Regression and manual bug triage.
   - Run multi-pane replay and viewport tests:
     `node v5/tests/replay-right-edge-follow-browser-smoke.js`
     `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
     `node v5/tests/replay-cadence-latency-browser-smoke.js`
     `node v5/tests/multi-pane-active-pane-browser-smoke.js`
     `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
     `git diff --check`
   - Manually retest pane TF changes and pane-local chart movement.
   - If the display bugs remain, continue diagnosis in pane-local viewport
     state, display-window loading, and layout sync, now with the replay
     distribution race removed.
   - Commit final docs and closeout.

## Non-Goals

- Do not rewrite layout runtime or pane shell in Step 529.
- Do not change Lightweight Charts usage outside chart runtime/adapter needs.
- Do not make route UI request bars or write chart series.
- Do not merge different-timeframe panes into replay-timeframe append.
- Do not remove `REPLAY_EVENTS.NEXT`; keep it as a notification channel for UI
  and non-mutating observers.
- Do not treat this as proof that all multi-pane TF/pan display bugs are fixed.
  This step removes a likely race source first, then leaves remaining bugs
  easier to isolate.

## Verification Standard

Step 529 is complete only when:

- same-timeframe panes advance from the same replay batch before `NEXT`
  notification catch-up can run;
- primary and non-primary panes preserve pane-local TF and manual viewport
  rules;
- different-timeframe panes still project display windows anchored to the new
  cursor;
- replay cadence and multi-pane rapid-next gates remain acceptable;
- the old secondary same-timeframe catch-up path is either removed or reduced
  to a defensive fallback with explicit trace coverage.

## Step 529 Result

Completed on 2026-07-04.

- `replay-navigation-controller` now routes same-timeframe replay `Next`
  display writes through `appendRevealedBarsToPanes` before
  `REPLAY_EVENTS.NEXT` notification.
- `replay-chart-sync` owns the coordinated reveal-batch fan-out boundary. It
  appends same-timeframe panes with the same `revealedBars` and returns
  different-timeframe panes for display-window projection.
- `chart-replay-pane-projection` no longer dispatches same-timeframe
  `chart.appendBars`; it keeps different-timeframe display-window projection.
- `replay-pane-fanout-ordering-browser-smoke.js` asserts primary and secondary
  append before replay `NEXT` notification.

Final verification:

- `node v5/tests/replay-chart-sync-fanout-smoke.js`
- `node v5/tests/chart-replay-pane-projection-smoke.js`
- `node v5/tests/chart-follow-logical-range-smoke.js`
- `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
- `node v5/tests/replay-cadence-latency-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

Manual follow-up: retest the previously observed pane TF change and pane-local
movement display bugs. If they remain, the next likely root-cause areas are
pane-local viewport state, display-window loading, and layout sync rather than
same-timeframe replay distribution.
