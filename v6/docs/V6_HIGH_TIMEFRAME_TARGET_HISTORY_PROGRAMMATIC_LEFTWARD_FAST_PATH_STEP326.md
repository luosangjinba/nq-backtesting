# V6 High-Timeframe Target-History Programmatic Leftward Request Fast Path - Step 326

## Status

Accepted.

## Outcome

Step 326 implemented the bridge-owned programmatic leftward request fast path
selected in Step 325.

New pure resolver:

`v6/src/chart-history/leftward-history-request-schedule.js`

Bridge integration:

`v6/src/chart-history/leftward-history-input-bridge.js`

New and updated coverage:

- `v6/tests/leftward-history-request-schedule-step326-smoke.js`
- `v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`

## Behavior

Native visible-range input still schedules leftward-history requests through
`requestDelayMs`.

Programmatic display-timeframe application now arms a one-shot fast path. After
the zero-delay surface check confirms the measured visible range still needs
leftward history, high-timeframe target-history activation can dispatch without
the second delayed request debounce.

The bridge also guards against duplicate immediate requests from the same pane:
once a programmatic fast request dispatches, further fast requests for that pane
are ignored until `LEFT_EXTENSION_LOADED` clears the gate.

Viewport projection can participate only while the display-timeframe apply
fast path is armed. Projection events after left extension completes do not keep
triggering immediate target-history requests.

## Finding

The browser trigger-coordination smoke no longer classifies the dominant window
as `leftward-request-scheduling-attribution-needed`. In the focused run after
the fast path, the pre-left-extension P95 was around one browser/task turn
rather than the previous delayed debounce window.

That means the old scheduling bottleneck has been removed and the next step
should re-measure the high-timeframe target-history responsiveness budget.

## Boundary

This step changed only leftward-history input bridge scheduling.

It did not change chart-history request planning/runtime loading,
target-history request sizing, chart viewport intent, chart-engine behavior,
replay cursor movement, no-bar gap skipping, shell behavior, journal,
order-ticket, prop-firm, indicator, or seconds behavior. Replay remains source
`1m` driven.

## Verification

- `node v6/tests/leftward-history-request-schedule-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-programmatic-leftward-fast-path-closeout-step326-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 327 should re-measure high-timeframe target-history responsiveness after
the fast path before selecting any further optimization.
