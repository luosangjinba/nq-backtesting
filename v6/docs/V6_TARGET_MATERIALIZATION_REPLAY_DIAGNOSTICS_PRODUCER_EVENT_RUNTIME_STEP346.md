# V6 Target Materialization Replay Diagnostics Producer Event Runtime - Step 346

## Status

Accepted.

## Outcome

Step 346 wires producer event subscriptions inside
`runtime.target-materialization-replay-diagnostics`.

Updated runtime:

- `v6/src/replay/target-materialization-replay-diagnostics-runtime.js`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js`

## Runtime Wiring

The diagnostics runtime now subscribes to:

- `displayTimeframe:applied`;
- `chartEntryManualNext:advanced`;
- `chartEntryAutoPlay:started`;
- `chartEntryAutoPlay:ticked`;
- `chartEntryAutoPlay:stopped`.

Each producer event is mapped through the Step 345 mapper module and then
applied through the Step 344 `updateSnapshot` path. `null` mapper results are
ignored. Invalid update candidates are rejected by the existing update command
validation and do not corrupt the current diagnostics snapshot.

Producer event subscriptions are registered and unregistered by the diagnostics
runtime lifecycle.

## Boundary

This step changed only the diagnostics runtime owner.

It did not modify Display-Timeframe, Manual Next, or Auto Play runtimes. It did
not wire visible UI, call target-bar APIs, plan or load target windows, mutate
replay cursor movement, write chart data, mutate viewport intent, change
target-history request sizing, change chart-history fast-path behavior, or
touch chart-engine, journal, order-ticket, prop-firm, indicator, or seconds
behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 347 should add browser/runtime-read coverage proving that real
Display-Timeframe, Manual Next, and Auto Play flows produce diagnostics
snapshots readable through `getSnapshot`. It should still avoid visible UI until
the browser-visible read path is proven, and it must not change replay cursor,
target loading, chart-data, viewport, request sizing, or chart-history
fast-path behavior.
