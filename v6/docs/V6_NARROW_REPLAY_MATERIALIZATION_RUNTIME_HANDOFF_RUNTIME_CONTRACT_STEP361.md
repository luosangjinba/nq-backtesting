# V6 Narrow Replay Materialization Runtime Handoff Runtime Contract Step 361

## Status

Accepted.

## Outcome

Step 361 defines the contract-only future runtime surface for
`replay-coordination-materialization-runtime-handoff`.

The owner boundary remains:

- `runtime.replay-coordination-materialization-handoff`

The implementation module remains:

- `replay-coordination-materialization-runtime-handoff`

This step does not add the runtime to `v6/src/app.js`, subscribe to events, or
dispatch commands.

## Factory Contract

Future factory:

- `createReplayCoordinationMaterializationRuntimeHandoff(dependencies)`

The future runtime must return:

- `id`
- `start`
- `stop`

## Dependency Contract

Future dependencies:

- `subscribeEvent`
- `dispatchCommand`
- `executor: executeNarrowReplayMaterializationRuntimeHandoffPlan`

## Result Contracts

Wrapper result shape:

- `status`
- `commandIntents`
- `replaceIntent`
- `fallbackGateId`

Fallback result shape:

- `status: fallback`
- `replaceIntent: null`
- `runtimeBehaviorChanges: false`
- `runtimeWiringReady: false`

Diagnostics result shape remains no-op until live wiring:

- no diagnostics event surface yet;
- payload fields are `ownerBoundary`, `status`, `fallbackGateId`, and
  `replaceIntent`.

## App Registration Preconditions

Future app registration requires:

- runtime contract accepted;
- runtime plan accepted;
- pure executor accepted;
- wiring readiness audit accepted;
- app registration step selected.

## Boundary

This step is contract-only:

- no runtime behavior changes;
- no app registration;
- no event subscription registration;
- no command registration;
- no command dispatch;
- no diagnostics event emission;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes;
- no chart-data runtime behavior changes;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 362 should create an unwired runtime skeleton module for
`replay-coordination-materialization-runtime-handoff` that implements the
contract shape with injectable dependencies and no app registration. It may
test start/stop cleanup with injected fake subscribe/dispatch functions, but
must not add the runtime to `v6/src/app.js`.
