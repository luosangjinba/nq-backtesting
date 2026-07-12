# V6 Target Materialization Replay Diagnostics Runtime - Step 342

## Status

Accepted.

## Outcome

Step 342 adds the smallest runtime state surface behind the Step 341
diagnostics/readout owner contract.

New runtime:

- `v6/src/replay/target-materialization-replay-diagnostics-runtime.js`

New command/event contract:

- `targetMaterializationReplayDiagnostics.getSnapshot`
- `targetMaterializationReplayDiagnostics:snapshotReady`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-runtime-boundary-step342-static-smoke.js`

## Owner Boundary

Owner:

`runtime.target-materialization-replay-diagnostics`

The runtime owns only a read-only diagnostic snapshot state. The initial
snapshot is normalized and validated through the Step 341 contract helper, and
all command/event payloads return cloned snapshot objects.

Allowed surface:

- register `GET_SNAPSHOT`;
- emit `SNAPSHOT_READY` on runtime start;
- report `idle` when no snapshot exists;
- report `ready` when a valid snapshot exists.

Forbidden surface:

- target-bar API calls;
- target window planning or loading;
- replay cursor mutation;
- manual next or autoplay routing;
- chart data writes;
- viewport intent mutation;
- visible shell UI changes.

## Boundary

This is a runtime state-surface step only. It does not wire Display-Timeframe
Runtime, Manual Next Runtime, Auto Play Runtime, or shell readout updates into
live diagnostics yet.

Replay remains source `1m` driven. Target bars remain display materialization
inputs only. Target-history request sizing and chart-history fast-path behavior
remain unchanged.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-boundary-step342-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 343 should plan the minimal runtime wiring path that can feed this
diagnostics runtime from existing Display-Timeframe, Manual Next, and Auto Play
events. It should stay read-only, keep shell consumption as command/event
snapshot reading, and avoid changing replay cursor movement, target-bar
loading, request sizing, chart-data writes, or viewport behavior.
