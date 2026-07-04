# Session 2026-07-04 - Step 532 Pane-Local Initial Coverage

## Goal

Make pane-local explicit timeframe changes and pane initialization load enough
historical bars to cover the target pane's visible width without requiring an
immediate left drag.

## Trigger

Manual testing showed the left active pane can now switch to `1H` and render,
but initial display may still leave the left side under-covered. Dragging left
then extends and fills the canvas, which points to an initial coverage gap.

## Detailed Plan

1. Step 532.1 - Plan and documentation.
   - Add `pane-local-initial-coverage-plan.md`.
   - Update TODO, docs index, specs index, and session index.
   - Commit planning docs.

2. Step 532.2 - Add two-pane initial coverage smoke.
   - Cover primary/left active switched to `1H`.
   - Assert rendered bars cover the target pane's estimated visible capacity
     without manual left drag.
   - Commit harness.

3. Step 532.3 - Load enough initial display-window bars.
   - Use target pane viewport metrics and bounded backward seek to reach a
     minimum coverage goal.
   - Preserve no-future filtering.
   - Commit runtime fix.

4. Step 532.4 - Guard duplicate demand races.
   - Verify initial coverage does not race with stale viewport demand.
   - Preserve manual left-extension behavior.
   - Commit guard or no-code documentation.

5. Step 532.5 - Add three-pane coverage regression.
   - Verify one pane's `1H` coverage does not mutate other panes.
   - Commit regression and any minimal fix.

6. Step 532.6 - Regression and closeout.
   - Run planned multi-pane/replay gates.
   - Update TODO/spec/session with results.
   - Commit closeout docs.

## Status

- Step 532.1: in progress.
- Step 532.2-532.6: pending.

## Next

Finish Step 532.1 docs and commit, then add the two-pane initial coverage
browser smoke.
