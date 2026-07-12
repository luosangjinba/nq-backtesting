# V6 Narrow Replay Materialization Runtime Handoff Unwired Runtime Skeleton Step 362

## Status

Accepted.

## Outcome

Step 362 adds an unwired runtime skeleton module for
`replay-coordination-materialization-runtime-handoff`.

The skeleton implements the Step 361 contract-shaped factory:

- `createReplayCoordinationMaterializationRuntimeHandoff(dependencies)`

It remains unwired:

- not registered in `v6/src/app.js`;
- no default import of runtime command/event bus helpers;
- no producer runtime modifications.

## Runtime Skeleton

The skeleton exports:

- `createReplayCoordinationMaterializationRuntimeHandoff`
- `collectReplayCoordinationMaterializationRuntimeHandoffCommandResults`
- `buildReplayCoordinationMaterializationRuntimeHandoffResult`

The factory returns:

- `id`
- `start`
- `stop`
- `getState`

## Injected Dependencies

The skeleton uses injectable dependencies:

- `subscribeEvent`
- `dispatchCommand`
- `executor`

The default `subscribeEvent` is a no-op cleanup function. The default
`dispatchCommand` throws if used, so the skeleton cannot accidentally call the
real runtime bus unless a future app registration step injects it explicitly.

## Wrapper Behavior

The command wrapper collects injected command results in this order:

1. `pane.getById`
2. `replay.getState`
3. `chartData.getSourceBars`
4. `barData.planTargetWindow`
5. `barData.loadTargetWindow`

The skeleton only calls `chartData.replaceBars` when the injected executor
returns a `replaceIntent`. Fallback results do not call replace.

## Boundary

This step remains unwired:

- no app registration;
- no runtime behavior changes in the running app;
- no event subscription registration through real bus helpers;
- no command registration;
- no real command dispatch by default;
- no diagnostics event emission;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes in the running app;
- no chart-data runtime behavior changes in the running app;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js`
- `v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`

## Verification

- `node v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 363 should perform an app-registration readiness audit for the unwired
runtime skeleton. It should verify exact `v6/src/app.js` insertion position,
startup order, dependency injection source, rollback plan, and focused browser
coverage before any live app registration.
