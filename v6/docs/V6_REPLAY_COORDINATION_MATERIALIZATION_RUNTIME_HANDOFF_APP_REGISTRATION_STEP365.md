# V6 Replay Coordination Materialization Runtime Handoff App Registration Step 365

## Status

Accepted.

## Outcome

Step 365 registers the replay coordination materialization runtime handoff in
`v6/src/app.js`.

The registered runtime is:

- `runtime.replay-coordination-materialization-handoff`

It uses the Step 362 runtime skeleton:

- `createReplayCoordinationMaterializationRuntimeHandoff`

## App Registration

The app now imports `dispatchCommand` from `./runtime/commands.js`.

The app now imports
`createReplayCoordinationMaterializationRuntimeHandoff` from
`./replay/replay-coordination-materialization-runtime-handoff.js`.

The runtime is registered after:

- `registry.registerRuntime(createChartEntryManualNextRuntime());`

and before:

- `registry.registerRuntime(createChartEntryManualPreviousRuntime());`

The registration injects app-level dependencies:

- `subscribeEvent`
- `dispatchCommand`

The skeleton default executor remains in use.

## Focused Browser Coverage

Step 365 adds:

- `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`

The smoke verifies:

- runtime registry contains and starts
  `runtime.replay-coordination-materialization-handoff`;
- `8h` target materialization remains active after Manual Next;
- Manual Next remains source `1m` driven;
- target bars remain display materialization input only;
- source `1m` fetches and target `8h` fetches both occur through the existing
  owner surfaces.

## Boundary

This step keeps the registration slice narrow:

- no new command surfaces;
- no producer runtime changes;
- no diagnostics runtime changes;
- no Display-Timeframe Runtime changes;
- no replay runtime target-bar routing;
- no replay cursor movement changes;
- no chart viewport intent changes;
- no chart-engine direct writes;
- no request sizing or chart-history fast-path changes.

## Historical Static Coverage Update

After this step, historical Step 360-364 static tests no longer assert that the
current app lacks the handoff runtime import or registration. They still assert
that the historical helpers remain pure and that producer runtimes do not import
or own the handoff.

## Coverage

- `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-closeout-step365-static-smoke.js`

## Verification

- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 366 should add the Step 365 focused registration browser smoke as an
optional target-history diagnostics regression pack member. Keep the default
eight-member pack unchanged.
