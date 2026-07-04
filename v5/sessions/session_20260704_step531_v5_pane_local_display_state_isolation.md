# Session 2026-07-04 - Step 531 Pane-Local Display State Isolation

## Goal

Stop active-pane timeframe and interaction state from leaking into other panes
in multi-pane replay layouts.

## Trigger

Manual testing after Step 530 showed:

- left active pane switched to `1H` now renders, but initial loading can still
  require a left drag to fill the canvas boundary;
- wheel zooming the active left `1H` pane can make the right pane switch from
  `1m` to `1H`;
- three-pane layouts show more variants of the same coupling.

This indicates remaining bottom-level pane-local display state leakage rather
than a single rendering bug.

## Reference Check

- Lightweight Charts `ITimeScaleApi` checked on 2026-07-04:
  `https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi`.
  The relevant visible/logical range behavior remains behind V5 chart
  runtime/adapter ownership.
- awesome-tradingview checked on 2026-07-04:
  `https://github.com/tradingview/awesome-tradingview`.
  No external plugin is needed for this boundary fix.

## Detailed Plan

1. Step 531.1 - Plan and documentation.
   - Add `pane-local-display-state-isolation-plan.md`.
   - Update TODO, docs indexes, and session handoff indexes.
   - Commit planning docs.

2. Step 531.2 - Add reproducing two-pane isolation smoke.
   - Cover active left/primary pane switched to `1H`.
   - Wheel zoom the active pane.
   - Assert right/secondary pane remains `1m` in layout and chart metadata.
   - Commit the harness.

3. Step 531.3 - Stop implicit interval fan-out on non-sync paths.
   - Audit callers around `layout.setPaneDisplayTimeframe`.
   - Ensure all-pane TF changes require explicit interval-sync intent.
   - Commit the fix.

4. Step 531.4 - Make active-pane TF fallback pane-local.
   - Reduce route/global `displayTimeframe` fallback leakage.
   - Keep primary replay display context separate from non-primary pane display
     context.
   - Commit the boundary tightening.

5. Step 531.5 - Add three-pane isolation regression.
   - Assert one active `1H` pane interaction does not mutate other panes'
     display timeframes.
   - Commit the regression and any minimal fix.

6. Step 531.6 - Regression and closeout.
   - Run the planned multi-pane/replay gates.
   - Update TODO/spec/session with results.
   - Commit closeout docs.

## Status

- Step 531.1: completed. Planning spec, TODO, docs index, specs index, and
  session index now point to the pane-local display-state isolation step.
- Step 531.2: completed. Added
  `v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`. The smoke
  covers two panes with interval sync off: primary/left active switches to
  `1H`, wheel zooms the primary pane, and secondary/right remains `1m` in both
  layout state and chart canvas metadata.
- Step 531.3: completed. `layout.setPaneDisplayTimeframe` no longer applies
  interval fan-out implicitly from stored layout sync state. Callers must pass
  explicit `applyIntervalSync`; the chart replay pane orchestrator does so only
  on the shared active-pane TF control path when interval sync is currently
  enabled.
- Step 531.4: completed. Non-primary panes no longer fall back to the primary
  replay display timeframe when their pane TF is unset. Primary may still use
  replay display context as its fallback; secondary/tertiary default to the
  session timeframe unless their layout pane record explicitly says otherwise.
- Step 531.5: completed. Added
  `v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`. It covers a
  triple layout with secondary explicitly set to `5m`, primary set to `1H`,
  and primary wheel interaction; secondary remains `5m` and tertiary remains
  `1m`.
- Step 531.6: completed. Regression/closeout gates passed and Step 531 is
  closed.

## Step 531.2 Verification

- `node --check v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `git diff --check`

## Step 531.3 Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/tests/layout-runtime-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `git diff --check`

## Step 531.4 Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-display-coordinator.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `git diff --check`

## Step 531.5 Verification

- `node --check v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
- `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
- `git diff --check`

## Step 531.6 Verification

- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `git diff --check`

## Next

Step 531 is complete. Manually retest the reported two-pane and three-pane
display/replay cases in the running app; if the multi-pane queue is quiet,
return to the Settings parity candidate from Step 528.
