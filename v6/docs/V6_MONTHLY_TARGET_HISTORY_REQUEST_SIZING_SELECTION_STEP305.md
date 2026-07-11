# V6 Step 305 - Monthly Target-History Request Sizing Selection

Date: 2026-07-10

## Decision

Step 305 selects **`1M` target-history request sizing browser assertion** as
the next bounded target-history slice.

Daily and weekly target-history now both have success and fallback browser
coverage in the compact Step 293 regression pack. That clears the weekly safety
gate before monthly expansion.

## Implementation

Added a pure selector:

- `selectMonthlyTargetHistorySizingSlice`

The selector chooses `1M` after weekly success and fallback are packed. If the
backend advertises `1M`, the reason is:

- `monthly-target-history-backend-supported-after-weekly-pack`

If weekly is packed but backend support is not explicitly present, the selector
still selects `1M` as a browser sizing audit candidate with:

- `monthly-target-history-browser-sizing-audit-needed`

This keeps Step 306 focused on proving the real browser path before any runtime
sizing change.

## Sizing Audit

The pure request-sizing smoke now covers `1M`:

- status: `session-aware-policy-sized`;
- estimated target bars: `null`;
- target display bars: `1`;
- source prefetch bars: `40000`.

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
- `node v6/tests/weekly-target-history-fallback-browser-closeout-step304-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/monthly-target-history-request-sizing-selection-closeout-step305-static-smoke.js`
- `git diff --check`

## Next

Step 306 should add real browser coverage for `1M` target-history request
sizing. It should mirror the daily/weekly sizing smokes where possible, assert
`tf=1M`, assert the monthly policy values from this step, and preserve source
bars for `1m` round trips.
