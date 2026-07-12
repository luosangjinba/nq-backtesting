# V6 Replay Coordination Materialization Runtime Handoff Pack Member Step 366

## Status

Accepted.

## Outcome

Step 366 adds the Step 365 focused app-registration browser smoke as an
optional target-history diagnostics regression pack member.

The new optional member is:

- id: `handoff-registration`
- script:
  `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`

The default target-history diagnostics pack remains unchanged at eight members.

## Pack Behavior

The optional member can run alone:

- `TARGET_HISTORY_PACK_MEMBERS=handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

It can also run with the existing optional members:

- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`

Existing optional members remain:

- `replay-coordination`
- `readout-producer-flow`

## Boundary

This step only changes pack selection coverage:

- no `v6/src/app.js` changes;
- no new command surfaces;
- no runtime behavior changes;
- no Step 362 skeleton changes;
- no producer runtime changes;
- no diagnostics runtime changes;
- no Display-Timeframe Runtime changes;
- no replay runtime target-bar routing;
- no replay cursor movement changes;
- no chart viewport intent changes;
- no request sizing or chart-history fast-path changes.

## Coverage

- `v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- updated `v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- updated `v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`

## Verification

- `node v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 367 should return to the HTF leftward-extension performance thread with a
focused browser measurement. It should measure `4h`, `8h`, `1D`, and `1W`
leftward extension after the replay coordination materialization runtime is
registered, identify whether remaining latency is in source/target request,
chart-data replacement, or viewport reapply, and keep runtime behavior changes
out until the bottleneck is explicit.
