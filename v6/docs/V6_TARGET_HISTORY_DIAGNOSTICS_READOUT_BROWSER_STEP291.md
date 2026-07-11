# V6 Step 291 - Target-History Diagnostics Readout Browser Regression

Date: 2026-07-10

## Outcome

V6 now has a real browser regression for the pane-local target-history
diagnostics readout.

The smoke drives the activated high-timeframe leftward-history path, loads
target bars through the existing bar-data target window command path, and then
asserts the readout that Step 290 added to the pane status surface.

## Coverage

`v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js` verifies:

- the app starts the leftward-history runtime;
- an `8h` display timeframe activates target-history loading;
- `/v4/target_bars` is used for target bars;
- chart-history reports a loaded target-history extension;
- the readout dataset reports `path=target`;
- the readout dataset reports target/source request counts;
- the readout dataset reports the prepended bar count;
- the readout text exposes path, duration, request counts, and prepended bars;
- the readout title exposes fallback reason `none`;
- source bars are preserved for the high-TF-to-`1m` round trip;
- replay remains source-`1m` driven.

## Boundary

This step adds test coverage only. It does not change chart-history,
bar-data, chart-data, replay, chart-engine, viewport, journal, order-ticket,
prop-firm, indicator, or seconds behavior.

The shell readout still consumes runtime events and does not call target APIs or
bar-data commands.

## Verification

- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `git diff --check`

## Next

Step 292 should add the matching browser regression for the readout fallback
path. It should force a target-history fallback, assert the readout reports
`path=fallback` and the fallback reason, and keep the source-bar/replay-source
invariants intact.
