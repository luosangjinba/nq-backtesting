# V6 Target Materialization Replay Diagnostics Readout Producer Flow Step 352

## Status

Accepted.

## Outcome

Step 352 verifies the Step 351 pane-status readout through real producer flows.

The browser regression creates a replay session, materializes `8h` target
history through `DISPLAY_TIMEFRAME_COMMANDS.APPLY`, advances replay through
`CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT`, drives Auto Play through
`CHART_ENTRY_AUTO_PLAY_COMMANDS.START` and `STOP`, and reads the resulting
`shell.pane-status-readout` DOM state.

The test does not directly dispatch
`targetMaterializationReplayDiagnostics.updateSnapshot`. The readout updates
through the diagnostics runtime's producer-event subscriptions and the Step 351
`getSnapshot`/`snapshotReady` shell consumption path.

## Verified Readout States

- Real Display-Timeframe materialization renders a collapsed
  `target-history-active` readout.
- Real Manual Next updates the visible `manualNextStatus` row.
- Real Auto Play start/tick/stop updates the visible `autoPlayStatus` row.
- Empty target bars render a collapsed fallback readout.
- Returning to normal `1m` replay hides the materialization readout with no
  rows.
- Internal-only fields such as source cursor authority, target-bars display
  input, and latest source timestamp remain out of row text.

## Boundary

This step is regression coverage only:

- no Display-Timeframe, Manual Next, or Auto Play producer runtime changes;
- no shell target-bar API calls;
- no direct diagnostics update dispatch from the browser flow;
- no replay cursor, target loading, chart-data, viewport, request sizing, or
  chart-history fast-path behavior changes;
- source `1m` remains replay cursor authority;
- target bars remain display materialization input only.

## Coverage

- `v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-closeout-step352-static-smoke.js`

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 353 should add the Step 352 browser smoke as an optional focused member of
the target-history diagnostics regression pack. Keep the default pack unchanged
unless the pack owner already has a narrow inclusion policy for this new
readout-producer-flow member.
