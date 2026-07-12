# V6 Narrow Replay Materialization Runtime Handoff Plan Step 357

## Status

Accepted.

## Outcome

Step 357 defines the plan-only runtime handoff sequence for keeping higher
display-timeframe materialization aligned after replay cursor advances.

The future owner boundary remains:

- `runtime.replay-coordination-materialization-handoff`

The future implementation module remains:

- `replay-coordination-materialization-runtime-handoff`

This step does not wire that module into runtime startup.

## Trigger

The future handoff listens to:

- `chartEntryManualNext:advanced`

Auto Play is covered through this same trigger because Auto Play dispatches
Manual Next for each tick.

## Command Sequence

The future handoff sequence is:

1. `pane.getById`
2. `replay.getState`
3. `chartData.getSourceBars`
4. `barData.planTargetWindow`
5. `barData.loadTargetWindow`
6. `chartData.replaceBars`

`chartData.replaceBars` must preserve source bars and apply target bars only as
display materialization input.

## Fallback Gates

The plan records fallback gates before runtime wiring:

- source `1m` display: do not request target bars;
- missing pane context: skip handoff without replay cursor changes;
- missing replay cursor: skip handoff without chart-data changes;
- missing source bars: skip target replacement and preserve current bars;
- target window plan unavailable: fallback to source display;
- target window load unavailable: fallback to source display;
- all target bars filtered as future bars: preserve current display bars.

## Forbidden Surfaces

The future handoff must not call:

- `replay.next`
- `replay.previous`
- `replay.setCursorTime`
- `chartViewport.resetView`
- `chartViewport.setManualIntent`
- chart render series/range write surfaces;
- shell target-bar API calls;
- `targetMaterializationReplayDiagnostics.updateSnapshot`

## Boundary

This step is plan-only:

- no runtime behavior changes;
- no event subscription registration;
- no command dispatch;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes;
- no chart-data runtime behavior changes;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-plan-boundary-step357-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-boundary-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 358 should add a pure executor harness for
`replay-coordination-materialization-runtime-handoff`. It should evaluate the
Step 357 sequence and fallback gates from injected command results, still
without event subscription registration, command dispatch, or runtime behavior
wiring.
