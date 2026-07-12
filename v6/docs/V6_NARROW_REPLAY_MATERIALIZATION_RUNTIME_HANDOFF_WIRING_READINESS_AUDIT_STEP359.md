# V6 Narrow Replay Materialization Runtime Handoff Wiring Readiness Audit Step 359

## Status

Accepted.

## Outcome

Step 359 audits the future live wiring surfaces for
`replay-coordination-materialization-runtime-handoff` without implementing live
runtime wiring.

The future owner boundary remains:

- `runtime.replay-coordination-materialization-handoff`

The future implementation module remains:

- `replay-coordination-materialization-runtime-handoff`

## Wiring Surfaces

Future app registration point:

- `v6/src/app.js`
- runtime registry before lifecycle start
- future factory `createReplayCoordinationMaterializationRuntimeHandoff`

Future event subscription:

- subscribe to `chartEntryManualNext:advanced`
- subscribe inside the new runtime helper start lifecycle
- do not modify Manual Next or Auto Play runtimes

Future command dispatch wrapper:

- use a runtime-owned command-dispatch wrapper;
- gather injected results for the Step 358 executor;
- call only the Step 357 command surfaces:
  - `pane.getById`
  - `replay.getState`
  - `chartData.getSourceBars`
  - `barData.planTargetWindow`
  - `barData.loadTargetWindow`
  - `chartData.replaceBars`

## Rollback Criteria

Future rollback should be bounded to:

- remove app runtime registration;
- remove Manual Next advanced subscription;
- disable the command-dispatch wrapper;
- preserve the Step 358 pure executor;
- preserve the Step 357 plan.

## Boundary

This step is audit-only:

- no runtime behavior changes;
- no event subscription registration;
- no command registration;
- no command dispatch;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes;
- no chart-data runtime behavior changes;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-boundary-step359-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-boundary-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 360 should create a plan-only runtime implementation plan for
`replay-coordination-materialization-runtime-handoff`: start/stop lifecycle,
subscription cleanup, command dispatch wrapper order, executor invocation, and
rollback gates. It should still avoid app registration and live runtime wiring.
