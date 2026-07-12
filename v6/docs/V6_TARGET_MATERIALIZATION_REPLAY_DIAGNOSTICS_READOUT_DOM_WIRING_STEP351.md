# V6 Target Materialization Replay Diagnostics Readout DOM Wiring Step 351

## Status

Accepted.

## Outcome

Step 351 implements the smallest controlled DOM wiring slice inside
`shell.pane-status-readout`.

The shell now mounts pane-local materialization diagnostics readout containers
after `[data-v6-target-history-diagnostics]` for every pane status readout. The
containers are mounted hidden by default, read the initial diagnostics snapshot
through `targetMaterializationReplayDiagnostics.getSnapshot`, refresh on
`targetMaterializationReplayDiagnostics:snapshotReady`, and route every
snapshot through the Step 349 readout view model before rendering.

Hidden and normal snapshots render as hidden containers with no rows.
`target-history-active` and fallback snapshots render the collapsed
first-visible rows defined by the Step 349 view model and Step 350 dataset
contract.

## Boundary

This step is shell consumption only:

- `shell.pane-status-readout` reads diagnostics with command/event snapshot
  consumption.
- The browser smoke uses `updateSnapshot` only as a test driver to simulate
  already-produced diagnostics snapshots.
- Display-Timeframe, Manual Next, and Auto Play producer runtimes are not
  modified.
- The shell does not call target bar APIs.
- Replay remains source `1m` driven.
- Target bars remain display materialization inputs only.
- Target-history request sizing and chart-history fast-path behavior are
  unchanged.
- No replay cursor, chart-data, chart viewport, target loading, journal,
  order-ticket, prop-firm, indicator, or seconds behavior changes are included.

## Coverage

- `v6/tests/pane-status-readout-step183-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js`
- `v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-closeout-step351-static-smoke.js`

## Verification

- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 352 should verify the pane-status readout through real producer flows:
Display-Timeframe materialization, Manual Next, and Auto Play. That regression
should avoid direct `updateSnapshot` use in the browser flow, keep internal-only
fields hidden, and preserve the same shell-consumption boundary.
