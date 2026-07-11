# V6 Step 292 - Target-History Diagnostics Readout Fallback Browser Regression

Date: 2026-07-10

## Outcome

V6 now has real browser coverage for the pane-local target-history diagnostics
readout fallback path.

The smoke drives an activated `8h` leftward-history request, forces
`/v4/target_bars` to return an empty target window, and verifies that
chart-history falls back to the source-window path while the shell readout
reports the fallback diagnostics.

## Coverage

`v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`
verifies:

- the app starts the leftward-history runtime;
- an `8h` display timeframe activates target-history loading;
- `/v4/target_bars` is requested and returns zero bars;
- source-window loading happens after the target attempt;
- chart-history reports `target-history-empty` fallback;
- diagnostics report `target-history-fallback-source-window`;
- the readout dataset reports `path=fallback`;
- the readout dataset reports the fallback reason;
- the readout dataset reports target/source request counts;
- the readout dataset reports prepended bars;
- the readout text/title expose the same fallback diagnostics;
- source bars are extended by the fallback source-window path;
- replay remains source-`1m` driven.

## Boundary

This step adds test coverage only. It does not change chart-history,
bar-data, chart-data, replay, chart-engine, viewport, journal, order-ticket,
prop-firm, indicator, or seconds behavior.

The shell readout still consumes runtime events and does not call target APIs or
bar-data commands.

## Verification

- `node v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 293 should consolidate the target-history diagnostics readout browser
coverage into the broader timeframe/replay regression runner or add a focused
readout regression pack so success and fallback paths are run together before
future target-history optimization changes.
