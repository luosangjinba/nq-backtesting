# V6 High-Timeframe Target-History Browser Rendering Visibility Attribution - Step 323

## Status

Accepted.

## Outcome

Step 323 added browser rendering/visibility attribution for the remaining
corrected target-history visual latency.

New pure helper:

`v6/src/chart-history/high-timeframe-target-history-browser-rendering-attribution.js`

New coverage:

- `v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js`
- `v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js`

The browser smoke records:

- `target-history-apply-start`;
- `left-extension-loaded`;
- `diagnostics-readout-visible`;
- first and second `requestAnimationFrame` observations after readout.

## Finding

The browser readout is visible at the `LEFT_EXTENSION_LOADED` listener
observation. In the focused browser run, `preLeftExtensionP95Ms` accounts for
the corrected `visualLatencyP95Ms`, while `postLeftExtensionReadoutP95Ms` is
sub-frame.

That means the current evidence does not identify browser rendering,
chart-engine paint, or shell readout visibility as the dominant cause of the
remaining corrected visual latency.

The remaining window is before the target-history `LEFT_EXTENSION_LOADED`
event. It should be attributed next to target-history trigger/coordination
timing, not runtime rendering behavior.

## Decision

The next slice should be:

`target-history-trigger-coordination-latency-attribution`

Reason: the browser visibility boundary is already fast once the left-extension
event is emitted. V6 now needs to separate delayed target-history triggering,
display-timeframe apply coordination, delayed left-extension scheduling, and
history runtime event emission before any runtime optimization.

## Boundary

This step added only pure attribution logic, browser milestone reporting,
documentation, and closeout coverage.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-closeout-step323-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 324 should add target-history trigger/coordination latency attribution for
the pre-left-extension window before any runtime behavior change.
