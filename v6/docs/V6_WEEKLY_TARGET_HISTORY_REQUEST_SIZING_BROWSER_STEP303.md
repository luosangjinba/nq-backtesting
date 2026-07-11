# V6 Step 303 - Weekly Target-History Request Sizing Browser Assertion

Date: 2026-07-10

## Outcome

Step 303 adds real browser coverage for the `1W` target-history request sizing
path.

The new smoke drives a real chart session, applies `displayTimeframe: '1W'`,
and verifies the target-history path requests `/v4/target_bars` with `tf=1W`.

## Coverage

Added:

- `v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js`

The smoke asserts:

- the real chart path requests target bars with `tf=1W`;
- chart-history diagnostics report the target-history success path;
- target request count is `1` and source request count is `0`;
- the sizing audit is `session-aware-policy-sized`;
- weekly policy values are `targetDisplayBars=4` and
  `prefetchSourceBars=40000`;
- target-history bar counts match the mocked weekly target response;
- switching back to `1m` preserves source bars for round trips.

The compact Step 293 target-history browser pack now runs weekly sizing
coverage alongside fixed-duration success/fallback and daily success/fallback
coverage.

## Boundary

No runtime behavior changed.

Target bars still flow through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; shell
code and tests observe runtime state rather than calling target APIs directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-request-sizing-browser-closeout-step303-static-smoke.js`
- `git diff --check`

## Next

Step 304 should add focused `1W` target-history fallback browser coverage. It
should force `/v4/target_bars?tf=1W` to return empty target bars, assert
fallback to source-window projection, verify `target-history-empty` in
diagnostics/readout, preserve `1m` source round trips, and leave `1M` deferred.
