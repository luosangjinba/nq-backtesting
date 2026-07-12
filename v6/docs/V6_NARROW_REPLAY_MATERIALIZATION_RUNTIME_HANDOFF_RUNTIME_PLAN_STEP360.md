# V6 Narrow Replay Materialization Runtime Handoff Runtime Plan Step 360

## Status

Accepted.

## Outcome

Step 360 defines the plan-only future runtime implementation shape for
`replay-coordination-materialization-runtime-handoff`.

The owner boundary remains:

- `runtime.replay-coordination-materialization-handoff`

The implementation module remains:

- `replay-coordination-materialization-runtime-handoff`

This step does not add the runtime to `v6/src/app.js`, subscribe to events, or
dispatch commands.

## Runtime Lifecycle Plan

The future runtime should use this lifecycle:

1. create runtime helper with isolated unsubscribe and in-flight state;
2. start by subscribing to `chartEntryManualNext:advanced`;
3. handle the event through a runtime-owned dispatch wrapper;
4. invoke `executeNarrowReplayMaterializationRuntimeHandoffPlan`;
5. stop by calling the unsubscribe callback and clearing in-flight state.

## Dispatch Wrapper Order

The future wrapper order remains:

1. `pane.getById`
2. `replay.getState`
3. `chartData.getSourceBars`
4. `barData.planTargetWindow`
5. `barData.loadTargetWindow`
6. `chartData.replaceBars`

The wrapper must use the Step 358 executor result to decide whether
`chartData.replaceBars` is needed. Fallback results must not write chart-data,
move replay cursor, mutate viewport intent, or request additional target bars.

## Rollback Gates

The plan records rollback gates before live wiring:

- disable runtime registration;
- skip Manual Next advanced subscription;
- disable dispatch wrapper;
- preserve current display on executor fallback;
- stop cleans subscription.

## Boundary

This step is plan-only:

- no runtime behavior changes;
- no app registration;
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

- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 361 should define a runtime contract for
`replay-coordination-materialization-runtime-handoff`: factory signature,
dependency injection shape, emitted diagnostics or no-op fallback result shape,
and app registration preconditions. It should still avoid app registration and
live runtime wiring.
