# V6 Step 298 - Daily Target-History Request Sizing Browser Assertion

Date: 2026-07-10

## Outcome

V6 now has a focused browser assertion for `1D` target-history request sizing:

- `v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`

The smoke drives the real browser app through a `1D` display-timeframe
leftward-history activation path, mocks `/v4/target_bars` with daily target
bars, and verifies chart-history uses the target-history path.

## Coverage

The browser smoke asserts:

- the leftward-history runtime is started;
- `1D` display timeframe is applied;
- `/v4/target_bars` is requested with `tf=1D`;
- chart-history loads target-history successfully;
- target request count is `1`;
- source request count is `0`;
- request sizing status is `session-aware-policy-sized`;
- policy target display bars are `12`;
- source-window policy prefetches `17280` source minutes for daily history;
- `targetHistory.barCount` matches the target response;
- switching back to `1m` preserves source bars.

## Boundary

This step adds browser coverage only. It does not change chart-history request
execution, display-timeframe planning, bar-data commands, chart-data, replay,
chart-engine, viewport, journal, order-ticket, prop-firm, indicator, or seconds
behavior.

Target bars still load through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`; no direct
API calls were added.

## Verification

- `node v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `git diff --check`

## Next

Step 299 should decide whether to add the daily sizing smoke to a compact pack
or select the next session-aware target-history sizing slice. Keep `1W` and
`1M` out of runtime changes until daily coverage has a stable pack entry.
