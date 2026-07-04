# Pane-Local Initial Coverage Plan

Phase: Phase 3 - Real Chart Interaction / Multi-pane replay stabilization.

Step: 532 planned.

## Trigger

Manual testing after Steps 530 and 531 showed that active-pane `1H` switching
no longer blanks the pane and no longer leaks TF into other panes, but the first
render can still show only a partial historical span. Dragging left then loads
more bars and fills toward the canvas left boundary.

That means pane-local display-window loading currently satisfies "some visible
bars exist" but not "enough display bars exist to cover the target pane's
visible capacity after an explicit TF change or pane initialization."

## Working Hypothesis

The display-window controller derives a bounded count from viewport metrics,
but higher timeframe no-future filtering and pane-local initialization can leave
the first rendered result short of the pane's logical capacity. A subsequent
manual left drag emits viewport demand and backfills more bars, so the missing
piece is initial coverage, not left-extension itself.

## Target Behavior

- Explicit pane TF changes load enough historical display bars to cover the
  pane's visible width without requiring an immediate left drag.
- Non-primary pane initialization uses the target pane's own viewport metrics.
- Higher timeframe no-future filtering still forbids unfinished candles.
- If the first request window filters to too few bars, loading seeks earlier
  within bounded attempts until coverage is adequate or data is exhausted.
- Existing viewport-demand left extension remains available after initial
  coverage.
- Coverage loading for one pane must not mutate other panes' TF, bars, or
  visible range.

## Step 532 Detailed Plan

1. Step 532.1 - Plan and documentation.
   - Add this plan and the session handoff.
   - Update TODO, docs index, specs index, and sessions index.
   - Commit planning docs.

2. Step 532.2 - Add two-pane initial coverage smoke.
   - Build a two-pane vertical replay session.
   - Make primary/left active and switch it to `1H`.
   - Assert initial rendered coverage is sufficient for the pane's estimated
     visible capacity without a manual left drag.
   - Commit the harness as target behavior when possible; if current behavior
     fails, commit a current-bug baseline first.

3. Step 532.3 - Load enough initial display-window bars.
   - Audit display-window count and seek logic in replay runtime.
   - Use target pane viewport metrics to compute a minimum coverage goal for
     explicit TF changes and pane initialization.
   - Continue bounded backward seeking when rendered bars are below the target
     coverage.
   - Completed: backward display-window loading now continues bounded seeking
     while merged display bars are below the target pane's initial coverage
     goal.
   - Commit the runtime fix.

4. Step 532.4 - Guard against duplicate demand races.
   - Ensure initial coverage does not immediately trigger stale or duplicate
     viewport-demand loads that overwrite the new display context.
   - Preserve manual left-extension behavior after initial load.
   - Completed: the coverage smoke now verifies a manual left-extension after
     initial coverage still loads more `1H` history without overwriting other
     panes.
   - Commit the guard or document no code change if existing guards suffice.

5. Step 532.5 - Add three-pane coverage regression.
   - Cover a triple layout with independent pane TFs.
   - Switch one pane to `1H` and assert its initial coverage is adequate while
     other panes retain their TF and chart metadata.
   - Commit the regression harness and any minimal fix.

6. Step 532.6 - Regression and closeout.
   - Run:
     `node v5/tests/multi-pane-timeframe-follow-browser-smoke.js`
     `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
     `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
     `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
     `node v5/tests/replay-display-timeframe-no-future-smoke.js`
     `node v5/tests/replay-right-edge-follow-browser-smoke.js`
     `git diff --check`
   - Update TODO/spec/session with final results.
   - Commit closeout docs.

## Non-Goals

- Do not change interval-sync semantics from Step 531.
- Do not show unfinished higher-timeframe candles.
- Do not remove viewport-demand left extension.
- Do not let route UI request bars or write chart series.
- Do not tune visual zoom density beyond what is needed to satisfy initial
  coverage.
