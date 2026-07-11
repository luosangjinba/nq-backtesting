# V6 Step 306 - Monthly Target-History Request Sizing Browser Assertion

Date: 2026-07-10

## Outcome

Step 306 adds real browser coverage for the `1M` target-history request sizing
path.

The new smoke drives a real chart session, applies `displayTimeframe: '1M'`,
and verifies the target-history path requests `/v4/target_bars` with `tf=1M`.

## Coverage

Added:

- `v6/tests/monthly-target-history-request-sizing-browser-step306-smoke.js`

The smoke asserts:

- the real chart path requests target bars with `tf=1M`;
- chart-history diagnostics report the target-history success path;
- target request count is `1` and source request count is `0`;
- the sizing audit is `session-aware-policy-sized`;
- monthly policy values are `targetDisplayBars=1` and
  `prefetchSourceBars=40000`;
- target-history bar counts match the mocked monthly target response;
- switching back to `1m` preserves source bars for round trips.

The compact Step 293 target-history browser pack now runs monthly sizing
coverage alongside fixed-duration, daily, and weekly success/fallback coverage.

## Boundary

No runtime behavior changed.

Target bars still flow through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; shell
code and tests observe runtime state rather than calling target APIs directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/monthly-target-history-request-sizing-browser-step306-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/monthly-target-history-request-sizing-browser-closeout-step306-static-smoke.js`
- `git diff --check`

## Next

Step 307 should add focused `1M` target-history fallback browser coverage. It
should force `/v4/target_bars?tf=1M` to return empty target bars, assert
fallback to source-window projection, verify `target-history-empty` in
diagnostics/readout, and preserve `1m` source round trips.
