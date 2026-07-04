# Pane Display State Unification Plan

Phase: Phase 3 - Real Chart Interaction / Multi-pane replay stabilization.

Step: 533 completed.

## Trigger

Manual testing after Step 532 still shows multi-pane display corruption after
continuous pane-local interactions:

1. left pane is active and changed to `1H`;
2. repeated drag/wheel interactions can make the right pane inherit `1H`;
3. the right pane can go visually blank until reset view;
4. after reset, panes can render different latest replay anchors.

This means the previous Step 529 fan-out, Step 531 isolation, and Step 532
coverage fixes removed important race sources, but did not fully replace the
underlying split display-state model.

## Reference Check

- Lightweight Charts local vendor notes checked on 2026-07-04. The relevant
  behavior remains native range observation plus runtime-owned visible range
  state; no Lightweight plugin or custom wheel implementation is needed.
- Existing V5 `awesome-tradingview`/vendor guidance remains unchanged: use the
  chart runtime and adapter boundary instead of route-owned direct chart writes.

## Working Diagnosis

V5 still has two chart display-state tracks:

- `primary` uses chart runtime global `state`;
- secondary/tertiary panes use `paneDisplayStateByPaneId`;
- `stateForPane()` falls back to primary state when a pane record is absent;
- route and pane orchestration still carry `displayTimeframe`,
  `replayDisplayTimeframe`, and session fallback values that can become stale;
- display-window loads and viewport-demand loads do not yet carry a pane-local
  generation/revision that prevents old requests from writing into a pane after
  the pane changes TF or interaction mode.

The target is not another symptom patch. Step 533 should make all mounted panes,
including `primary`, use one pane display-state model and reject stale pane
display writes.

## Target Behavior

- Primary is just the default pane id, not a separate global display-state path.
- Every pane has explicit pane-local bars, display context, visible range,
  follow/manual state, and viewport demand.
- Missing pane state must initialize from defaults, not borrow another pane's
  current bars or display timeframe.
- A pane TF change increments a pane-local display revision.
- Replay display-window loads, viewport-demand loads, and chart writes must
  target a specific `paneId` and must not apply if their revision is stale.
- With interval sync off, no drag, wheel, reset, viewport demand, or display
  load on one pane may change another pane's display timeframe.
- Same-timeframe replay `Next` fan-out from Step 529 remains coordinated.
- Higher-timeframe no-future filtering and initial coverage from Step 532 remain
  intact.

## Step 533 Detailed Plan

1. Step 533.1 - Plan and documentation.
   - Add this spec and the current session handoff.
   - Update TODO, docs index, specs index, and sessions index.
   - Commit planning docs before behavior changes.

2. Step 533.2 - Add continuous multi-pane interaction smoke.
   - Build a two-pane replay layout.
   - Keep interval sync off.
   - Make the left/primary pane active and change it to `1H`.
   - Interleave left-pane wheel zoom, left-pane left drag, active-pane changes,
     and right-pane reset/view interaction.
   - Assert the right pane remains `1m`, keeps rendered bars, and does not
     inherit the left pane's display context.
   - Commit the failing or target harness before implementation.

3. Step 533.3 - Introduce unified chart pane state helpers.
   - Refactor chart runtime state helpers so `primary` and non-primary panes are
     resolved through the same pane state store.
   - Missing pane records initialize from chart defaults and presentation
     context, not from another pane's live bars.
   - Keep chart runtime as the only chart-series writer.
   - Commit the chart-runtime state unification with focused smoke coverage.

4. Step 533.4 - Add pane display revision guards.
   - Add a pane-local display revision/generation to chart display context or
     pane display state.
   - Increment it on explicit pane TF changes and display-context replacement.
   - Carry revision through display-window requests/results where needed.
   - Reject stale display loads, viewport demands, or chart writes that no
     longer match the target pane's current display context.
   - Commit the stale-write guard.

5. Step 533.5 - Remove route/controller fallback leakage.
   - Reduce route-level `displayTimeframe` fallback influence so the shared TF
     control reads active layout pane state and chart/replay display loaders
     read target pane state.
   - Ensure status/render refresh cannot rewrite inactive pane TFs.
   - Commit the route/controller cleanup.

6. Step 533.6 - Regression and closeout.
   - Run the new continuous interaction smoke plus:
     `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
     `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
     `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
     `node v5/tests/triple-pane-initial-coverage-browser-smoke.js`
     `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
     `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
     `node v5/tests/replay-right-edge-follow-browser-smoke.js`
     `git diff --check`
   - Update TODO/spec/session with the final result.
   - Commit closeout docs.

## Non-Goals

- Do not rewrite the Lightweight adapter.
- Do not remove native Lightweight wheel/drag behavior.
- Do not change replay cursor ownership or no-future semantics.
- Do not remove interval sync.
- Do not make route UI request bars or write chart series.
- Do not tune visual density beyond what is needed for state correctness.

## Verification Standard

Step 533 is complete only when:

- all panes use one chart-runtime pane state path;
- missing pane state no longer falls back to another pane's live bars/TF;
- stale pane display loads cannot overwrite newer pane TF state;
- the reported continuous left `1H` / right `1m` interaction class is covered;
- existing fan-out, viewport-demand, initial coverage, no-future, and right-edge
  follow gates still pass.

## Step 533 Result

Completed on 2026-07-04.

- Added `multi-pane-continuous-interaction-isolation-browser-smoke.js` to cover
  the reported left `1H` / right `1m` repeated wheel/left-demand/reset class.
- Non-primary chart state no longer borrows primary live bars, visible range,
  interaction, or viewport-follow state when a pane record is missing or
  partial.
- Chart display contexts now carry `displayRevision`; display-window loads bump
  and validate the target pane revision before writing bars/context.
- Viewport-demand display loads restore the demanded manual visible range after
  loading more history.
- Inactive/non-primary pane TF fallback no longer reads the route active-pane
  display timeframe.
- Pane-local display loads now set pane-local viewport-follow cursor metadata,
  so secondary/tertiary panes do not rely on primary metadata for replay
  follow/right-edge gates.

Final verification:

- `node v5/tests/multi-pane-continuous-interaction-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-wheel-timeframe-isolation-browser-smoke.js`
- `node v5/tests/triple-pane-timeframe-isolation-browser-smoke.js`
- `node v5/tests/multi-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/triple-pane-initial-coverage-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`
- `node v5/tests/replay-pane-fanout-ordering-browser-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `git diff --check`

Note: one parallel run of the browser group produced a transient
`replay-pane-fanout-ordering` initial-load wait timeout under concurrent Chrome
load; the same smoke passed when rerun directly.
