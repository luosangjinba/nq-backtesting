# V6 Target Materialization Replay Diagnostics Update Command - Step 344

## Status

Accepted.

## Outcome

Step 344 adds the smallest diagnostics runtime update command surface behind
the Step 343 wiring plan.

Updated command contract:

- `targetMaterializationReplayDiagnostics.updateSnapshot`

Updated runtime:

- `v6/src/replay/target-materialization-replay-diagnostics-runtime.js`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js`

## Behavior

`updateSnapshot` merges the current diagnostics snapshot with the update
payload, normalizes it through the Step 341 snapshot contract, and validates
that:

- source `1m` replay cursor authority is preserved;
- target bars remain display materialization inputs only;
- source timestamp does not lag the visible display timestamp.

Valid updates replace the runtime snapshot, return a cloned `ready` snapshot,
and emit `targetMaterializationReplayDiagnostics:snapshotReady` for read-only
consumers.

Invalid updates return `status: rejected`, validation errors, the rejected
candidate snapshot, and the still-current snapshot. Invalid updates do not
corrupt runtime state.

## Boundary

This step added only the bounded update command surface.

It did not subscribe to Display-Timeframe, Manual Next, or Auto Play producer
events. It did not wire visible UI, call target-bar APIs, plan or load target
windows, mutate replay cursor movement, change no-bar gap skipping, write chart
data, mutate viewport intent, change target-history request sizing, change
chart-history fast-path behavior, or touch chart-engine, journal, order-ticket,
prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 345 should add pure producer payload mappers for the existing
Display-Timeframe, Manual Next, and Auto Play event payloads into
`targetMaterializationReplayDiagnostics.updateSnapshot` payloads. It should not
subscribe to events, dispatch the update command from producer runtimes, wire
visible UI, or change replay cursor, target loading, chart-data, viewport,
request sizing, or chart-history fast-path behavior.
