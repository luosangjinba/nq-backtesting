# V6 Narrow Replay Materialization Runtime Handoff Pure Executor Harness Step 358

## Status

Accepted.

## Outcome

Step 358 adds a pure executor harness for the future narrow replay
materialization runtime handoff.

The executor consumes the Step 357 plan and injected command results, then
returns either:

- a `chartData.replaceBars` intent for visible target bars; or
- a named fallback gate.

It does not dispatch commands, subscribe to events, register commands, or wire
runtime behavior.

## Owner

The future owner boundary remains:

- `runtime.replay-coordination-materialization-handoff`

The future implementation module remains:

- `replay-coordination-materialization-runtime-handoff`

## Pure Executor Inputs

Inputs are injected into the harness:

- Manual Next advanced event payload;
- pane context result;
- replay state result;
- source bars result;
- target window plan result;
- target window load result.

No command bus or event bus access occurs in this step.

## Happy Path

The pure executor validates the future sequence:

1. consume `chartEntryManualNext:advanced`;
2. resolve pane context;
3. read replay cursor;
4. read source bars;
5. evaluate target window plan;
6. evaluate target window load;
7. filter target bars with source-cursor no-future reveal policy;
8. return a `chartData.replaceBars` intent with `preserveSource: true`.

## Fallback Gates

The harness returns named fallback gates for:

- source `1m` display;
- missing pane context;
- missing replay cursor;
- missing source bars;
- target window plan unavailable;
- target window load unavailable;
- all target bars filtered as future bars.

Fallbacks return no replace intent and do not mutate replay cursor, chart-data,
viewport, or target loading state.

## Boundary

This step remains pure:

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

- `v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-executor-boundary-step358-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-boundary-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 359 should audit the live runtime wiring surfaces for
`replay-coordination-materialization-runtime-handoff`: app registration,
event subscription placement, command dispatch wrapper shape, and rollback
criteria. It should still avoid runtime behavior wiring.
