# Session 2026-07-04 - Step 530 Pane-Local Timeframe Follow

## Goal

Fix the remaining multi-pane display bug where changing the active pane to a
higher timeframe, especially `1H`, can leave the pane visually blank until reset
view is clicked.

## Trigger

Manual screenshots showed:

- two-pane layout;
- active pane moved to the left pane;
- changing that pane to `1H` made candles disappear;
- dragging the price axis then made axis/grid display look empty;
- reset view brought candles back, but only for a limited loaded range and did
  not address the underlying projection/extension path.

Step 529 fixed same-timeframe replay `Next` fan-out, but this bug is on the
pane-local timeframe and viewport/follow path.

## Reference Check

- Lightweight Charts `ITimeScaleApi` checked on 2026-07-04:
  `https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi`.
  Relevant time-scale range APIs stay behind V5 chart runtime/adapter.
- awesome-tradingview checked on 2026-07-04:
  `https://github.com/tradingview/awesome-tradingview`.
  No external plugin is required for this fix.

## Detailed Plan

1. Step 530.1 - Plan and reference check.
   - Add `pane-local-timeframe-follow-plan.md`.
   - Update TODO, session handoff, docs/spec indexes.
   - Commit planning docs.

2. Step 530.2 - Add reproducing browser smoke.
   - Cover two-pane vertical, left/primary active pane, TF change to `1H`.
   - Assert nonzero bars, follow state, logical range metadata, and axis/grid
     metadata after TF change and reset/manual interaction.
   - Commit smoke harness.

3. Step 530.3 - Resume target pane follow after explicit TF change.
   - Add an explicit `resumeViewportFollow` intent to user-initiated pane TF
     changes.
   - Keep viewport-demand left extension in manual mode.
   - Commit behavior change.

4. Step 530.4 - Harden higher-timeframe display-window loading.
   - Seek earlier backward windows when no higher-timeframe bars survive
     no-future filtering.
   - Preserve no-future-bars semantics.
   - Commit loading fix.

5. Step 530.5 - Regression and closeout.
   - Run new smoke and multi-pane/replay regression gates.
   - Update TODO/spec/session with results.
   - Commit closeout.

## Status

- Step 530.1: completed. Planning docs, TODO, session handoff, and indexes now
  point to pane-local timeframe/follow stabilization.
- Step 530.2: completed. Added
  `v5/tests/multi-pane-timeframe-follow-browser-smoke.js` as a current-bug
  baseline: after forcing primary into manual range and switching the active
  pane to `1H`, a 1H request is made but the pane remains `displayTimeframe=1`,
  `interactionMode=manual`, and `renderedBarCount=0`.
- Step 530.3: completed. Explicit pane timeframe changes now carry a
  `resumeViewportFollow` intent. The display-window controller resumes the
  target pane before replacing bars, so an old lower-timeframe manual visible
  range is not applied to the new higher-timeframe series. The viewport-demand
  bridge also drops pending demands whose timeframe no longer matches the
  current pane layout, and primary stale viewport-demand loads no longer commit
  after the replay state has moved to a different target timeframe.
- Step 530.4-530.5: pending.

## Step 530.3 Verification

- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node --check v5/src/features/chart-replay/viewport-demand-wiring.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `git diff --check`

## Next

Implement Step 530.4 next: audit the higher-timeframe display-window seek path
for no-future filtering edge cases and add the smallest focused regression if a
gap remains.
