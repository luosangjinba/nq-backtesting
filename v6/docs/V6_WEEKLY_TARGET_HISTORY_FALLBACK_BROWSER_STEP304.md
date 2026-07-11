# V6 Step 304 - Weekly Target-History Fallback Browser Coverage

Date: 2026-07-10

## Outcome

Step 304 adds real browser coverage for the `1W` target-history fallback path.

The new smoke forces `/v4/target_bars?tf=1W` to return an empty target-bar
response, then verifies chart-history falls back to source-window projection
and reports the fallback reason through diagnostics/readout.

## Coverage

Added:

- `v6/tests/weekly-target-history-fallback-browser-step304-smoke.js`

The smoke asserts:

- the real chart path requests target bars with `tf=1W`;
- empty weekly target bars produce `target-history-empty`;
- chart-history diagnostics report
  `target-history-fallback-source-window`;
- the pane diagnostics readout shows fallback path, target/source request
  counts, prepended bars, and fallback reason;
- weekly sizing remains `session-aware-policy-sized` with
  `targetDisplayBars=4` and `prefetchSourceBars=40000`;
- switching back to `1m` keeps usable source bars for round trips.

The Step 293 compact target-history browser pack now covers:

- fixed-duration target-history success;
- fixed-duration target-history fallback;
- daily target-history sizing success;
- daily target-history fallback;
- weekly target-history sizing success;
- weekly target-history fallback.

## Boundary

No runtime behavior changed.

Target bars still flow through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; shell
code observes runtime state/events and does not call `/v4/target_bars`
directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/weekly-target-history-fallback-browser-step304-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-fallback-browser-closeout-step304-static-smoke.js`
- `git diff --check`

## Next

Step 305 should select or audit the first `1M` target-history request sizing
slice. Keep it bounded to selection/audit first; do not jump directly into
monthly browser runtime coverage until the monthly policy and pack criteria are
explicit.
