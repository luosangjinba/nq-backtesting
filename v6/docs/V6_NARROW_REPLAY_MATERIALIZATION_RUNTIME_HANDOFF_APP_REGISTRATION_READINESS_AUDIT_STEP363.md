# V6 Narrow Replay Materialization Runtime Handoff App Registration Readiness Audit Step 363

## Status

Accepted.

## Outcome

Step 363 adds an audit-only app registration readiness helper for the unwired
`replay-coordination-materialization-runtime-handoff` runtime skeleton.

The helper validates the future app registration surfaces without registering
the runtime in `v6/src/app.js`.

## Selected Future App Surfaces

Future import surface:

- file: `v6/src/app.js`
- import:
  `createReplayCoordinationMaterializationRuntimeHandoff`
- import path:
  `./replay/replay-coordination-materialization-runtime-handoff.js`
- placement: after the existing
  `createTargetMaterializationReplayDiagnosticsRuntime` import

Future registration surface:

- file: `v6/src/app.js`
- factory call:
  `createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand })`
- insertion point:
  after `registry.registerRuntime(createChartEntryManualNextRuntime());` and
  before `registry.registerRuntime(createChartEntryManualPreviousRuntime());`
- runtime id:
  `runtime.replay-coordination-materialization-handoff`

The startup order keeps Manual Next as the producer of
`chartEntryManualNext:advanced` before the handoff runtime consumes it, while
leaving Manual Previous and Auto Play downstream behavior unchanged.

## Dependency Injection Source

- `subscribeEvent`: existing `v6/src/app.js` import from
  `v6/src/runtime/events.js`
- `dispatchCommand`: future `v6/src/app.js` import from
  `v6/src/runtime/commands.js`
- executor: default from
  `v6/src/replay/narrow-replay-materialization-runtime-handoff-executor.js`,
  unless a focused future test injects an override

## Rollback Plan

- remove the runtime factory import from `v6/src/app.js`
- remove the `dispatchCommand` import if no longer used
- remove the handoff `registry.registerRuntime(...)` call
- disable the focused app-registration browser smoke
- preserve the Step 362 unwired runtime skeleton
- preserve the Step 358 pure executor

## Focused Future Browser Coverage

- new focused replay-coordination materialization handoff app-registration
  browser smoke
- existing Step 337 replay coordination browser smoke
- existing Step 352 producer-flow readout browser smoke

## Boundary

This step remains audit-only:

- no `v6/src/app.js` modification;
- no runtime registration;
- no command registration;
- no live event subscription registration;
- no command dispatch from the audit helper;
- no producer runtime changes;
- no replay cursor movement changes;
- no target loading behavior changes;
- no chart-data runtime behavior changes;
- no viewport behavior changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`

## Verification

- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 364 should define the plan-only app registration slice before live
registration. It should translate this readiness audit into the exact minimal
`v6/src/app.js` diff, focused browser smoke shape, rollback gates, and
verification order while still avoiding live app registration.
