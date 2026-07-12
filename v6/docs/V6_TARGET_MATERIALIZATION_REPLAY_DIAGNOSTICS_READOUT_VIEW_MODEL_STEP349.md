# V6 Target Materialization Replay Diagnostics Readout View Model - Step 349

## Status

Accepted.

## Outcome

Step 349 adds a pure shell-owned readout view model for target materialization
replay diagnostics without wiring visible DOM UI.

The model lives at:

- `v6/src/shell/target-materialization-replay-diagnostics-readout-view-model.js`

Coverage:

- `v6/tests/target-materialization-replay-diagnostics-readout-view-model-step349-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js`

## View Model States

The model maps diagnostics snapshots into stable readout states:

- empty or not-ready snapshots become `hidden` with reason `snapshot-not-ready`;
- normal replay snapshots become `hidden` with reason `normal-replay`;
- target-history materialization snapshots become `collapsed` with reason
  `target-history-active`;
- fallback snapshots become `collapsed` with reason `fallback`.

Collapsed models are visible to a future developer readout, but remain collapsed
by default. Hidden models expose no rows.

## Rows

Collapsed rows are generated only from the Step 348 first visible fields:

- `displayTimeframe`
- `targetHistoryStatus`
- `projectionOwner`
- `manualNextStatus`
- `autoPlayStatus`
- `fallbackStatus`

The model formats empty field values as `--` and preserves the existing
diagnostic strings for later shell rendering.

## Hidden Fields

The Step 348 internal-only fields remain hidden from rows:

- `paneId`
- `sourceCursorTime`
- `sourceCursorAuthority`
- `targetBarsDisplayInputOnly`
- `latestSourceTimestamp`
- `latestDisplayTimestamp`
- `targetHistoryReason`
- `displayApplyStatus`

The title records the invariant that replay cursor authority remains source
`1m` and target bars remain display materialization inputs, but it does not
expose those fields as visible rows.

## Boundary

This step is a pure model step.

It did not import command/event surfaces, subscribe to diagnostics events, wire
`pane-status-readout`, add DOM nodes, call target-bar APIs, modify
Display-Timeframe, Manual Next, or Auto Play runtimes, dispatch
`updateSnapshot`, mutate replay cursor movement, change no-bar gap skipping,
write chart data, mutate viewport intent, change target-history request sizing,
change chart-history fast-path behavior, or touch chart-engine, journal,
order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-step349-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-closeout-step349-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 350 should define the controlled DOM wiring plan for consuming this view
model from `shell.pane-status-readout`. It should specify the exact event/command
consumption sequence, DOM container, dataset attributes, and rollback criteria
before enabling visible UI.
