# V6 Target Materialization Replay Diagnostics Readout Owner Plan - Step 348

## Status

Accepted.

## Outcome

Step 348 defines the first readout owner and visibility plan for target
materialization replay diagnostics without wiring visible UI.

The accepted owner is `shell.pane-status-readout`. The first placement mode is
`developer-collapsed-pane-status-readout`, reusing the existing pane-local
diagnostics area before adding any new workstation chrome.

New plan and coverage:

- `v6/src/replay/target-materialization-replay-diagnostics-readout-owner-plan.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-owner-boundary-step348-static-smoke.js`

## First Visible Fields

The first collapsed developer readout may show:

- `displayTimeframe`
- `targetHistoryStatus`
- `projectionOwner`
- `manualNextStatus`
- `autoPlayStatus`
- `fallbackStatus`

These fields are intended to answer whether materialized target display data is
active, whether source projection owns the current view, and whether replay
coordination flows have produced recent diagnostics.

## Internal-Only Fields

These fields remain internal-only for the first readout:

- `paneId`
- `sourceCursorTime`
- `sourceCursorAuthority`
- `targetBarsDisplayInputOnly`
- `latestSourceTimestamp`
- `latestDisplayTimestamp`
- `targetHistoryReason`
- `displayApplyStatus`

The source cursor fields and target-bar input flag stay hidden initially because
the readout must not imply that target bars are replay authority. Replay remains
source `1m` driven, and target bars remain display materialization inputs.

## Visibility Rules

The readout is:

- hidden by default for normal replay;
- collapsed unless target-history materialization is active or a fallback has
  occurred;
- pane-local only;
- shown only after a diagnostics snapshot is ready;
- not expanded during order-ticket or journal workflows.

## Consumption Boundary

The shell readout may only consume diagnostics through:

- `targetMaterializationReplayDiagnostics.getSnapshot`
- `targetMaterializationReplayDiagnostics:snapshotReady`

The readout writes DOM-only status content. It must not call target-bar APIs,
dispatch diagnostics updates, move replay, load bars, replace chart data, reset
the viewport, write chart-engine series, change target-history request sizing,
or change chart-history fast-path delay policy.

## Boundary

This step is plan-only.

It did not modify Display-Timeframe, Manual Next, or Auto Play runtimes. It did
not wire visible UI, dispatch `updateSnapshot` from producer runtimes, call
target-bar APIs from shell code, mutate replay cursor movement, change no-bar
gap skipping, write chart data, mutate viewport intent, change target-history
request sizing, change chart-history fast-path behavior, or touch chart-engine,
journal, order-ticket, prop-firm, indicator, or seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-boundary-step348-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-closeout-step348-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 349 should build a pure diagnostics readout view-model or draft model from
the Step 348 plan and the existing diagnostics snapshot shape. It should map
snapshots into hidden, collapsed, and visible row states, keep internal-only
fields hidden, and still avoid DOM UI wiring until the model boundary is stable.
