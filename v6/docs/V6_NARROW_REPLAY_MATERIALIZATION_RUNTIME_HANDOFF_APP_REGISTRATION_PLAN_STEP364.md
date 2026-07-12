# V6 Narrow Replay Materialization Runtime Handoff App Registration Plan Step 364

## Status

Accepted.

## Outcome

Step 364 adds a plan-only app registration helper for the unwired
`replay-coordination-materialization-runtime-handoff` runtime.

The plan consumes the Step 363 readiness audit and describes the exact minimal
future `v6/src/app.js` change without applying it.

## Minimal Future App Diff

The future app registration step should make exactly these app-level changes:

1. Add `dispatchCommand` import from `./runtime/commands.js` after the existing
   runtime events import.
2. Add `createReplayCoordinationMaterializationRuntimeHandoff` import from
   `./replay/replay-coordination-materialization-runtime-handoff.js` after the
   existing target-materialization diagnostics runtime import.
3. Add
   `registry.registerRuntime(createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand }));`
   after `registry.registerRuntime(createChartEntryManualNextRuntime());` and
   before `registry.registerRuntime(createChartEntryManualPreviousRuntime());`.

## Dependency Injection Plan

- `subscribeEvent`: use the existing app-level event dependency from
  `v6/src/runtime/events.js`
- `dispatchCommand`: add app-level import from `v6/src/runtime/commands.js`
- executor: use the Step 362 skeleton default executor from
  `v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js`

## Focused Future Browser Smoke

The future live registration step should add:

- `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`

It should assert:

- the runtime registry includes
  `runtime.replay-coordination-materialization-handoff`;
- Manual Next advanced flow remains source `1m` driven;
- target bars remain display materialization input only;
- Step 337 replay coordination browser smoke still passes;
- Step 352 producer-flow readout browser smoke still passes.

## Rollback Gates

- remove `dispatchCommand` import from `v6/src/app.js` if unused
- remove runtime factory import from `v6/src/app.js`
- remove runtime registration call from `v6/src/app.js`
- disable the focused registration browser smoke
- preserve the Step 362 unwired runtime skeleton
- preserve the Step 358 pure executor

## Boundary

This step remains plan-only:

- no `v6/src/app.js` modification;
- no runtime registration;
- no command registration;
- no live event subscription registration;
- no command dispatch from the plan helper;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes;
- no chart-data runtime behavior changes;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 365 should implement the planned app registration and focused browser
smoke in the smallest live wiring slice. It should modify `v6/src/app.js` only
as described above, add the focused registration browser smoke, and preserve
the rollback gates.
