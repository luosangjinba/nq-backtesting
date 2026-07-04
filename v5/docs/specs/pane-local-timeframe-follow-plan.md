# Pane-Local Timeframe Follow Plan

Phase: Phase 3 - Real Chart Interaction / Multi-pane replay stabilization.

Step: 530 completed.

## Trigger

Manual testing found a remaining multi-pane display bug after Step 529:

1. switch a two-pane layout so the left pane is active;
2. change that pane's timeframe to `1H`;
3. candles disappear;
4. dragging the price axis can also make axis/grid display look empty;
5. reset view brings candles back, but only for the currently loaded range and
   left-extension behavior is still incomplete.

Step 529 removed the same-timeframe replay `Next` event catch-up path, but this
bug is on a different path: active-pane timeframe switching and pane-local
viewport/follow state.

## Working Hypothesis

The target pane can keep an old manual visible range after a user explicitly
changes its timeframe. The new higher-timeframe display window may be loaded,
but the chart still applies the old pane-local visible range, so the candles
are outside the current view until reset clears manual mode.

Higher timeframes add another edge case: no-future filtering only allows a
higher-timeframe candle after it has closed. At a cursor like `09:30`, the
`09:00-10:00` `1H` candle is intentionally not displayable. Display-window
loading must therefore seek far enough backward to find at least one allowed
closed higher-timeframe candle, without violating no-future replay semantics.

## Target Behavior

- Explicit active-pane timeframe changes should load the target pane's display
  window and then restore follow mode for that pane.
- Pane-local viewport-demand left extension should preserve manual visible
  range and must not automatically resume follow.
- Higher-timeframe display loading should not leave the pane visually blank
  when an earlier closed display candle exists.
- Reset view should remain a viewport/follow action, not a substitute for
  missing display-window projection.
- Primary and non-primary pane behavior should be symmetric where the user
  action is the same, while preserving global primary replay state ownership.

## Step 530 Detailed Plan

1. Step 530.1 - Plan and reference check.
   - Record this spec, session handoff, and TODO direction.
   - Note the Lightweight Charts time-scale APIs are still adapter-owned and
     no external plugin is needed.
   - Commit planning docs.

2. Step 530.2 - Add a reproducing browser smoke.
   - Build a two-pane vertical replay session.
   - Make the left/primary pane active and set its TF to `1H`.
   - Assert the target pane has `displayTimeframe=60`, nonzero
     `fullBarCount/renderedBarCount`, follow interaction, visible logical
     range metadata, and preserved price/time scale metadata.
   - Trigger a pane-local manual range or reset and assert axes/grid metadata
     and bars remain present.
   - Commit the smoke harness.

3. Step 530.3 - Resume target pane follow after explicit TF change.
   - Extend the pane-local display-timeframe path with an explicit
     `resumeViewportFollow` intent.
   - Apply it only for user-initiated TF changes, not viewport-demand loads.
   - Keep chart runtime as the owner of visible range/follow mutation.
   - Completed: the target pane now resumes follow before replacing bars, so
     an old manual visible range cannot be applied to a newly loaded higher
     timeframe. Pending/stale viewport-demand loads are also guarded so lower
     timeframe extension results do not overwrite an explicit pane TF change.
   - Commit the behavior change.

4. Step 530.4 - Harden higher-timeframe display-window loading.
   - If a backward higher-timeframe window renders no display bars because the
     current candle is not closed, seek earlier windows until at least one
     allowed display bar is found or the bounded attempt limit is reached.
   - Preserve no-future-bars semantics.
   - Completed: higher-timeframe backward loads now continue bounded seeking
     when the current request window filters to zero displayable bars.
   - Commit the loading fix.

5. Step 530.5 - Regression and closeout.
   - Run the new smoke plus:
     `node v5/tests/multi-pane-active-pane-browser-smoke.js`
     `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
     `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
     `node v5/tests/replay-right-edge-follow-browser-smoke.js`
     `git diff --check`
   - Update TODO/session/spec with the result.
   - Completed: regression gates passed and Step 530 is closed.
   - Commit closeout docs.

## Non-Goals

- Do not change replay `Next` fan-out from Step 529.
- Do not show an unfinished higher-timeframe candle before its close.
- Do not make viewport-demand left extension auto-follow.
- Do not make route UI write chart series or request bars directly.
- Do not rewrite layout runtime or pane shell in this step.
