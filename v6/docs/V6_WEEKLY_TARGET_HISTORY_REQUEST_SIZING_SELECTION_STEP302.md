# V6 Step 302 - Weekly Target-History Request Sizing Selection

Date: 2026-07-10

## Decision

Step 302 selects **`1W` target-history request sizing browser assertion** as
the next bounded target-history slice.

Daily target-history now has both success and fallback browser coverage in the
compact Step 293 regression pack. That clears the daily safety gate that Step
300 intentionally placed before weekly expansion.

## Implementation

Added a pure selector:

- `selectWeeklyTargetHistorySizingSlice`

The selector chooses `1W` after daily success and fallback are packed. If the
backend advertises `1W`, the reason is:

- `weekly-target-history-backend-supported-after-daily-pack`

If daily is packed but backend support is not explicitly present, the selector
still selects `1W` as a browser sizing audit candidate with:

- `weekly-target-history-browser-sizing-audit-needed`

This keeps Step 303 focused on proving the real browser path before any runtime
sizing change.

## Sizing Audit

The pure request-sizing smoke now covers `1W`:

- status: `session-aware-policy-sized`;
- estimated target bars: `null`;
- target display bars: `4`;
- source prefetch bars: `40000`.

`1M` remains deferred. Monthly target-history should follow weekly browser
coverage instead of being bundled into this step.

## Boundary

No runtime behavior changed.

Target-history browser paths must continue to load target bars through
`BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`. Shell code must keep consuming runtime
state/events and must not call `/v4/target_bars` directly.

Replay cursor movement, no-bar gap skipping, chart viewport intent,
chart-engine behavior, journal, order-ticket, prop-firm, indicator, and seconds
behavior remain unchanged.

## Verification

- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-session-aware-sizing-selection-step297-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-request-sizing-selection-closeout-step302-static-smoke.js`
- `git diff --check`

## Next

Step 303 should add real browser coverage for `1W` target-history request
sizing. It should mirror the daily sizing smoke where possible, assert
`tf=1W`, assert the weekly policy values from this step, preserve source bars
for `1m` round trips, and leave `1M` deferred.
