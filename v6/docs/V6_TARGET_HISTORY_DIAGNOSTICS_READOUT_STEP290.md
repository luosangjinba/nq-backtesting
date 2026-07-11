# V6 Step 290 - Target-History Diagnostics Readout

Date: 2026-07-10

## Outcome

V6 now has a small shell-owned chart-history diagnostics readout attached to
each pane status readout.

The readout consumes `chartHistory:leftExtensionLoaded` events and displays the
latest completed leftward extension diagnostics for that pane:

- path;
- duration;
- target/source request counts;
- fallback reason;
- prepended bar count.

## Boundary

The readout is intentionally presentation-only:

- target bars still load through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`;
- the shell readout does not call target APIs or bar-data commands;
- chart-history remains the owner of leftward extension diagnostics;
- replay remains source-`1m` driven;
- chart runtime, viewport intent, chart-engine, journal, order-ticket,
  prop-firm, indicator, and seconds behavior are unchanged.

## Implementation

- Added `v6/src/shell/target-history-diagnostics-readout-model.js`.
- Extended `v6/src/shell/pane-status-readout.js` to render pane-local
  diagnostics from chart-history events.
- Added a compact `data-v6-target-history-diagnostics` element to each pane
  readout in `v6/src/shell/workstation-shell.js`.
- Added focused CSS for the compact readout.

## Verification

- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 291 should add a real browser regression for the readout on the activated
target-history path. The test should drive high-timeframe leftward extension,
assert the visible/computed readout text or dataset, and preserve the existing
source-bar and replay-source invariants.
