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

- Step 531.1: in progress.
- Step 531.2-531.6: pending.

## Next

Finish Step 531.1 docs and commit, then add the two-pane wheel/TF isolation
browser smoke.
