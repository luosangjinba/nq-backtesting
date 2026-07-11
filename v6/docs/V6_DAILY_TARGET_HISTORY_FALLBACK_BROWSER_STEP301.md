# V6 Step 301 - Daily Target-History Fallback Browser Coverage

Date: 2026-07-10

## Outcome

Step 301 adds real browser coverage for the `1D` target-history fallback path.

The new smoke forces `/v4/target_bars?tf=1D` to return an empty target-bar
response, then verifies chart-history falls back to the source-window
projection path without changing replay ownership or direct API boundaries.

## Coverage

Added:

- `v6/tests/daily-target-history-fallback-browser-step301-smoke.js`

The smoke asserts:

- the real chart path requests target bars with `tf=1D`;
- empty daily target bars produce `target-history-empty`;
- chart-history diagnostics report
  `target-history-fallback-source-window`;
- the pane diagnostics readout shows the fallback path, target/source request
  counts, prepended bars, and fallback reason;
- the session-aware sizing audit remains `session-aware-policy-sized`;
- the daily policy target remains `12` display bars and `17280` source minutes;
- switching back to `1m` keeps usable source bars for round trips.

The existing Step 293 compact target-history browser pack now runs the daily
fallback smoke alongside:

- fixed-duration target-history readout success;
- fixed-duration target-history readout fallback;
- daily target-history request sizing success.

## Boundary

No runtime behavior changed in this step.

Target bars still flow through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`.
Shell/readout code still consumes runtime state and events; it does not call
`/v4/target_bars` directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/daily-target-history-fallback-browser-step301-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/daily-target-history-fallback-closeout-step301-static-smoke.js`
- `git diff --check`

## Next

Step 302 should select or audit the first `1W` target-history request sizing
slice. Keep it bounded: prove the weekly sizing expectation and pack criteria
before changing runtime request sizing or adding monthly coverage.
