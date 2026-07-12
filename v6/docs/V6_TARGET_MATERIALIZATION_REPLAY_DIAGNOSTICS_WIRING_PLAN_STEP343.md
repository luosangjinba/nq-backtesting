# V6 Target Materialization Replay Diagnostics Wiring Plan - Step 343

## Status

Accepted.

## Outcome

Step 343 defines the pure
`target-materialization-replay-diagnostics-runtime-wiring-plan`.

New plan module:

`v6/src/replay/target-materialization-replay-diagnostics-wiring-plan.js`

New coverage:

- `v6/tests/target-materialization-replay-diagnostics-wiring-plan-step343-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js`

## Plan

Future live diagnostics wiring is owned by
`runtime.target-materialization-replay-diagnostics`.

The minimal producer sequence is:

1. consume `displayTimeframe:applied` from Display-Timeframe Runtime and map
   display apply, projection owner, target-history, fallback, and timestamp
   fields into the diagnostics snapshot;
2. consume `chartEntryManualNext:advanced` from Manual Next Runtime and map
   manual-next status plus source cursor authority fields;
3. consume `chartEntryAutoPlay:ticked`, `chartEntryAutoPlay:started`, and
   `chartEntryAutoPlay:stopped` from Auto Play Runtime and map autoplay status
   fields;
4. apply future updates through
   `targetMaterializationReplayDiagnostics.updateSnapshot`;
5. keep shell consumption on
   `targetMaterializationReplayDiagnostics:snapshotReady` and
   `targetMaterializationReplayDiagnostics.getSnapshot`.

## Fallback Gates

Future live wiring must no-op or keep the previous snapshot if any gate fails:

- diagnostics runtime is not started;
- producer event payload cannot be normalized;
- snapshot validation would break source `1m` replay cursor authority;
- snapshot validation would break target-bars-display-input-only state;
- shell would need direct target API access instead of command/event snapshot
  reading;
- target-history request sizing would change;
- chart-history fast-path behavior would change.

## Rollback Criteria

Disable or revert future live diagnostics wiring if it:

- mutates replay cursor state;
- loads or plans target bars;
- writes chart-data bars;
- mutates viewport intent;
- writes visible shell diagnostics UI before the readout step;
- regresses the replay-coordination target-history pack member.

## Boundary

This step added a pure wiring plan and static boundary coverage.

It did not add `updateSnapshot`, subscribe to producer events, wire visible UI,
change replay cursor movement, target-bar loading, target-history request
sizing, chart-history fast-path behavior, chart-data writes, viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, or seconds
behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-wiring-plan-step343-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 344 should implement the smallest diagnostics runtime update command
surface: `targetMaterializationReplayDiagnostics.updateSnapshot`. It should
normalize and validate snapshot updates behind the existing runtime, keep
`getSnapshot` and `snapshotReady` read-only for shell consumers, and still avoid
producer-event subscriptions, visible UI, replay cursor mutation, target-bar
loading, chart-data writes, viewport changes, request sizing changes, and
chart-history fast-path changes.
