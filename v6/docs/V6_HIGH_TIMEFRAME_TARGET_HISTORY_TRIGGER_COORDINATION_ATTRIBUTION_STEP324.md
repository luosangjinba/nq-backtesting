# V6 High-Timeframe Target-History Trigger Coordination Attribution - Step 324

## Status

Accepted.

## Outcome

Step 324 added trigger/coordination attribution for the pre-left-extension
target-history visual-latency window identified in Step 323.

New pure helper:

`v6/src/chart-history/high-timeframe-target-history-trigger-coordination-attribution.js`

New coverage:

- `v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js`
- `v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`

The browser smoke records:

- `target-history-apply-start`;
- `display-timeframe-applied-event`;
- `display-apply-returned`;
- `target-fetch-started`;
- `target-fetch-ended`;
- `chart-data-applied`;
- `viewport-projected`;
- `left-extension-loaded`;
- `diagnostics-readout-visible`.

## Finding

The focused browser attribution classifies the dominant pre-left-extension
window as:

- status: `leftward-request-scheduling-attribution-needed`;
- owner boundary: `chart-history.leftward-history-input-bridge`;
- selected phase: `scheduling`;
- next slice: `target-history-leftward-request-scheduling-plan`.

This matches the current bridge design: display-timeframe and viewport runtime
events trigger a zero-delay surface check, then leftward requests are debounced
through the bridge's delayed request scheduling. That scheduling delay is useful
for drag/scroll stability, but it is now the measured dominant target-history
visual-latency window for high-timeframe display application.

## Decision

The next slice should be:

`target-history-leftward-request-scheduling-plan`

Reason: before changing runtime behavior, V6 needs a bounded scheduling plan
that distinguishes manual drag/wheel stabilization from programmatic
display-timeframe application. The plan should preserve sticky-drag and
leftward-extension stability while allowing high-timeframe target-history
application to request left extension sooner.

## Boundary

This step added only pure attribution logic, browser milestone reporting,
documentation, and closeout coverage.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-closeout-step324-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 325 should plan the leftward request scheduling change before runtime
behavior changes.
