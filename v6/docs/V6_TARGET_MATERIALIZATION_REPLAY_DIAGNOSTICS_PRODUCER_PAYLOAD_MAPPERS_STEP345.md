# V6 Target Materialization Replay Diagnostics Producer Payload Mappers - Step 345

## Status

Accepted.

## Outcome

Step 345 adds pure producer payload mappers for converting existing runtime
events into `targetMaterializationReplayDiagnostics.updateSnapshot` payloads.

New mapper module:

`v6/src/replay/target-materialization-replay-diagnostics-producer-payload-mappers.js`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js`

## Mapping Surface

The mapper module covers:

- `displayTimeframe:applied`;
- `chartEntryManualNext:advanced`;
- `chartEntryAutoPlay:started`;
- `chartEntryAutoPlay:ticked`;
- `chartEntryAutoPlay:stopped`.

Mapped payloads preserve:

- source `1m` replay cursor authority;
- target-bars-display-input-only state;
- shell read-only consumption through the diagnostics snapshot.

Malformed producer payloads return safe partial updates or `null`.

## Boundary

This step added pure mapping helpers only.

It did not subscribe to producer events, dispatch
`targetMaterializationReplayDiagnostics.updateSnapshot` from producer runtimes,
wire visible UI, call target-bar APIs, plan or load target windows, mutate replay
cursor movement, write chart data, mutate viewport intent, change target-history
request sizing, change chart-history fast-path behavior, or touch chart-engine,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 346 should wire producer event subscriptions inside
`runtime.target-materialization-replay-diagnostics` using the Step 345 mappers
and Step 344 update path. It should not modify Display-Timeframe, Manual Next,
or Auto Play runtimes, wire visible UI, mutate replay cursor, load target bars,
write chart-data bars, mutate viewport intent, change request sizing, or change
chart-history fast-path behavior.
