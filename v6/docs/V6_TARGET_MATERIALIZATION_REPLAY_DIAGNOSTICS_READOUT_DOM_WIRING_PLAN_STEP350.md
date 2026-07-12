# V6 Target Materialization Replay Diagnostics Readout DOM Wiring Plan - Step 350

## Status

Accepted.

## Outcome

Step 350 defines the controlled DOM wiring plan for the target materialization
replay diagnostics readout without enabling visible UI.

The plan lives at:

- `v6/src/shell/target-materialization-replay-diagnostics-readout-dom-wiring-plan.js`

Coverage:

- `v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-plan-step350-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js`

## Owner And Container

The accepted owner remains `shell.pane-status-readout`.

The future pane-local container is the existing pane status readout:

- container selector: `[data-v6-pane-status-readout]`
- insertion point: after `[data-v6-target-history-diagnostics]`
- future readout selector: `[data-v6-target-materialization-diagnostics]`
- future row selector: `[data-v6-target-materialization-diagnostics-row]`
- future element template: `span.target-materialization-diagnostics-readout`

No `workstation-shell` DOM is changed in this step.

## Dataset Attributes

The future readout should use these attributes:

- `data-v6-target-materialization-diagnostics`
- `data-v6-target-materialization-diagnostics-mode`
- `data-v6-target-materialization-diagnostics-reason`
- `data-v6-target-materialization-diagnostics-pane-id`
- `data-v6-target-materialization-diagnostics-snapshot-ready`
- `data-v6-target-materialization-diagnostics-row`
- `data-v6-target-materialization-diagnostics-field`
- `data-v6-target-materialization-diagnostics-value`

## Consumption Sequence

The future shell readout sequence is:

1. Mount pane-local readout containers inside `shell.pane-status-readout`.
2. Read the current snapshot through
   `targetMaterializationReplayDiagnostics.getSnapshot`.
3. Route the snapshot through the Step 349
   `target-materialization-replay-diagnostics-readout-view-model`.
4. Refresh on `targetMaterializationReplayDiagnostics:snapshotReady`.

The shell readout writes DOM-only readout content. It must not call target bars,
dispatch diagnostics updates, move replay, request/load bars, write chart data,
reset viewport, or write chart engine series.

## Rendering Rules

- Hidden view models remove row content and set hidden mode.
- Collapsed view models render first-visible fields only.
- Internal-only fields are never rendered as rows.
- Pane id mismatch does not render into another pane.
- Missing containers are skipped without runtime side effects.

## Rollback Criteria

Rollback or keep the UI disabled if:

- pane status readout layout overlaps chart OHLC;
- app shell browser smoke regresses;
- shell code calls target-bar APIs;
- shell code dispatches `updateSnapshot`;
- producer runtimes import diagnostics commands;
- the view model exposes internal-only fields.

## Boundary

This step is plan-only.

It did not wire `pane-status-readout`, add DOM nodes, import command/event
surfaces into shell readout code, call target-bar APIs, modify Display-Timeframe,
Manual Next, or Auto Play runtimes, dispatch `updateSnapshot`, mutate replay
cursor movement, change no-bar gap skipping, write chart data, mutate viewport
intent, change target-history request sizing, change chart-history fast-path
behavior, or touch chart-engine, journal, order-ticket, prop-firm, indicator, or
seconds behavior.

## Verification

- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-plan-step350-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-closeout-step350-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 351 should implement the smallest controlled DOM wiring slice in
`shell.pane-status-readout`: mount hidden pane-local containers, read
diagnostics through `getSnapshot`, refresh from `snapshotReady`, render through
the Step 349 view model, and keep browser coverage focused on hidden/normal and
collapsed target-history/fallback states.
