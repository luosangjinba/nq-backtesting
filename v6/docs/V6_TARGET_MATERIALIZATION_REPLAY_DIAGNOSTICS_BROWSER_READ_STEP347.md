# V6 Target Materialization Replay Diagnostics Browser Read - Step 347

## Status

Accepted.

## Outcome

Step 347 adds browser/runtime-read coverage proving that real V6 flows update
the diagnostics snapshot and keep it readable through
`targetMaterializationReplayDiagnostics.getSnapshot`.

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-browser-read-step347-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js`

## Covered Browser Flow

The browser smoke creates a real replay session, stubs source and target bar API
responses, then verifies diagnostics snapshots after:

- Display-Timeframe Runtime applies `8h` target materialization;
- Manual Next advances the replay cursor;
- Auto Play starts, ticks, and stops.

The smoke reads diagnostics through the command bus with
`targetMaterializationReplayDiagnostics.getSnapshot`. It does not call
`updateSnapshot` from the test or from producer runtimes.

## Boundary

This step added browser coverage only.

It did not modify Display-Timeframe, Manual Next, or Auto Play runtimes. It did
not wire visible UI, call target-bar APIs from shell code, mutate replay cursor
movement, change no-bar gap skipping, write chart data outside existing owners,
mutate viewport intent, change target-history request sizing, change
chart-history fast-path behavior, or touch chart-engine, journal, order-ticket,
prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-browser-read-step347-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 348 should define the diagnostics readout owner and visibility plan before
adding visible UI. It should decide where the readout lives, which fields are
shown first, when it is hidden or collapsed, and which boundary tests keep shell
readout code from calling target APIs or mutating replay/chart state.
