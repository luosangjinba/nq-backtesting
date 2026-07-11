# V6 High-Timeframe Target-History Visual-Latency Phase Attribution Stabilization - Step 322

## Status

Accepted.

## Outcome

Step 322 added a pure attribution stabilizer:

`v6/src/chart-history/high-timeframe-target-history-visual-latency-attribution.js`

and browser integration coverage:

`v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js`

The stabilizer consumes the corrected Step 321 selector result. When corrected
`visualLatencyP95Ms` remains over budget but the selected chart-data or
viewport phase cost is only sub-frame noise, it suppresses runtime phase
selection and returns:

- status: `visual-latency-attribution-needed`;
- owner boundary: `browser-rendering-or-measurement-boundary`;
- next slice: `target-history-browser-rendering-visibility-attribution`.

## Finding

The corrected browser records no longer support
`target-history-browser-visible-apply-lag-optimization`. They also do not yet
support a stable chart-data or viewport runtime optimization, because the phase
winner can swap between `chart-data-replacement` and `viewport-reapply` while
both costs remain sub-frame.

The remaining budget finding is browser-visible visual latency, not a proven
chart-history, chart-data, or chart-viewport runtime bottleneck.

## Decision

The next slice should be
`target-history-browser-rendering-visibility-attribution`.

Reason: V6 needs to identify whether the remaining corrected visual latency is
browser rendering, chart engine paint timing, screenshot/readout observation, or
another measurement boundary before runtime behavior changes.

## Boundary

This step added only a pure stabilizer, browser reporting coverage,
documentation, and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-step321-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-closeout-step322-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 323 should add browser rendering/visibility attribution for the remaining
corrected target-history visual latency before any runtime optimization.
