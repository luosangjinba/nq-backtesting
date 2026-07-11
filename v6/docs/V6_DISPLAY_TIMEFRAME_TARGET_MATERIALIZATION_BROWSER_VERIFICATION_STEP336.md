# V6 Display-Timeframe Target Materialization Browser Verification - Step 336

## Status

Accepted.

## Outcome

Step 336 verifies the Step 335 runtime handoff in browser-visible
display-timeframe flows.

New coverage:

- `v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `v6/tests/display-timeframe-target-materialization-browser-boundary-step336-static-smoke.js`

## Browser Verification

The browser smoke drives the real V6 shell through a session create flow and
mocked source/target bar endpoints. It verifies target materialization for:

- `8h`
- `1D`
- `1W`

For each high display timeframe, the runtime applies visible target bars from
`runtime.bar-data`, preserves source `1m` bars, and keeps target-bar visibility
filtered by the source replay cursor.

Switching back to `1m` restores source projection through
`runtime.chart-data-projection` and proves the preserved source bar timeline is
still available for replay authority.

## Fallback

The browser smoke also covers target-data-missing fallback. When
`/v4/target_bars` returns no target bars, the display-timeframe runtime reports
`target-history-no-visible-bars` and falls back to the source-window projection
path without shrinking preserved source bars.

## Responsiveness

The Step 336 browser records feed the existing high-timeframe target-history
responsiveness audit. The verified `8h`, `1D`, and `1W` target materialization
records select:

`high-timeframe-target-history-responsive-materialization-ready`

This accepts the current runtime handoff for browser-visible materialization
verification without adding request sizing, replay cursor, viewport intent,
chart-engine, shell, journal, order-ticket, prop-firm, indicator, or seconds
behavior changes.

## Boundary

Shell code remains a command/event consumer. The Step 336 boundary smoke keeps
target API calls, source cursor reads, target window planning/loading, and chart
data replacement inside runtime owner surfaces.

The runtime does not call replay cursor mutation commands, direct chart viewport
intent commands, or direct Lightweight Charts series APIs for this handoff.

## Verification

- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-boundary-step336-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-closeout-step335-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 337 should verify replay coordination after display-timeframe target
materialization is active. Focus on manual next and autoplay around source `1m`
cursor movement, high display timeframe visible target bars, no-bar gap
skipping, and fallback preservation without changing request sizing or the
chart-history fast path.
