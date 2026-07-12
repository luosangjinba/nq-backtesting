# V6 Narrow Replay Materialization Runtime Handoff Readiness Audit Step 356

## Status

Accepted.

## Outcome

Step 356 audits the exact surfaces required before any narrow replay
materialization runtime handoff behavior changes.

The selected future owner boundary is:

- `runtime.replay-coordination-materialization-handoff`

The future implementation should be a new replay-coordination runtime helper:

- `replay-coordination-materialization-runtime-handoff`

It should not be added to Manual Next, Auto Play, Display-Timeframe, or the
diagnostics runtime directly.

Reason:

- replay cursor advances are the trigger;
- Display-Timeframe Runtime remains the display-timeframe switch owner;
- Manual Next and Auto Play remain replay/source advancement producers;
- diagnostics runtime remains read-only observability.

## Allowed Surfaces

Future handoff event trigger:

- `chartEntryManualNext:advanced`

Auto Play is covered through Manual Next because Auto Play dispatches Manual
Next on each tick.

Future handoff may consume these command surfaces:

- `pane.getById`
- `replay.getState`
- `chartData.getSourceBars`
- `barData.planTargetWindow`
- `barData.loadTargetWindow`
- `chartData.replaceBars`

## Forbidden Surfaces

Future handoff must not use:

- `replay.next`
- `replay.previous`
- `replay.setCursorTime`
- `chartViewport.resetView`
- `chartViewport.setManualIntent`
- chart-engine series writes;
- chart-engine visible range writes;
- shell target-bar API calls;
- `targetMaterializationReplayDiagnostics.updateSnapshot`

## Readiness Gates

The readiness audit is ready only when:

- Manual Next advanced event is available;
- Auto Play coverage flows through Manual Next advanced;
- Display-Timeframe Runtime remains the TF-switch owner;
- diagnostics runtime remains read-only observability;
- source `1m` replay cursor authority is preserved;
- target bars remain display materialization input only;
- target-bar reveal policy uses source cursor;
- chart-data replacement preserves source bars;
- bar-data owns target window plan/load;
- target-history request sizing is unchanged;
- chart-history fast path is unchanged;
- default target-history pack is preserved;
- optional pack members are preserved.

## Boundary

This step is audit-only:

- no runtime behavior changes;
- no command or event registration;
- no target-bar API calls;
- no replay cursor movement changes;
- no no-bar gap skipping changes;
- no target-history request sizing changes;
- no chart-history fast-path changes;
- no chart-data, viewport, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-readiness-boundary-step356-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-boundary-step356-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`
- `node v6/tests/target-materialization-diagnostics-readout-chain-closeout-step355-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 357 should create a plan-only
`narrow-replay-materialization-runtime-handoff-plan` for the selected
`runtime.replay-coordination-materialization-handoff` owner. It should define
the event/command sequence and fallback gates before any runtime wiring.
