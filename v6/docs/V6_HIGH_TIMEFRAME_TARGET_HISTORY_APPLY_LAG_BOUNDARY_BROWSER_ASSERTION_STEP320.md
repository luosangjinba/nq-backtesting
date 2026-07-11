# V6 High-Timeframe Target-History Apply-Lag Boundary Browser Assertion - Step 320

## Status

Accepted.

## Outcome

Step 320 added a focused browser milestone assertion:

`v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js`

The smoke uses the real V6 workstation route with stubbed `/v4/bars` and
`/v4/target_bars` responses, then switches the main pane to `8h` target-history
mode. It records these browser-observed milestones:

- `target-history-apply-start`;
- `viewport-projected`;
- `chart-data-applied`;
- `left-extension-loaded`;
- `diagnostics-readout-visible`.

The assertion does not use an absolute timing budget. It verifies milestone
presence and ordering only.

## Finding

The readout is already visible at the test's `LEFT_EXTENSION_LOADED` listener
observation point:

`diagnostics-readout-visible.details.observation === "left-extension-listener"`

That means the Step 317/318 `browser-visible-apply-lag` result was dominated by
the polling-style measurement boundary used by the report, not by target-history
fetch, chart-data replacement, viewport reapply, or shell readout rendering.

The current owner boundary is therefore:

- boundary: `measurement-boundary`;
- owner: `high-timeframe-target-history-real-budget-browser-phase-report`;
- next slice: `target-history-apply-lag-measurement-boundary-correction`.

## Decision

The next slice should correct the apply-lag measurement boundary before any
runtime optimization.

Reason: Step 320 proves the diagnostics readout is visible by the time a later
browser listener observes `LEFT_EXTENSION_LOADED`. Runtime optimization would
be premature until the real-budget report stops measuring the polling interval
as browser-visible apply lag.

The corrected report should derive apply-lag from event/readout milestones
rather than a coarse polling loop, while still avoiding machine-specific
absolute timing gates.

## Boundary

This step added only a browser assertion, documentation, and TODO/index updates.

It did not change chart-history runtime behavior, target-history runtime
behavior, chart viewport intent, chart-engine behavior, replay cursor movement,
no-bar gap skipping, shell behavior, journal, order-ticket, prop-firm,
indicator, or seconds behavior. Replay remains source `1m` driven.

## Verification

- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-closeout-step320-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 321 should correct the target-history apply-lag measurement boundary in
the real-budget browser report or add a replacement event-driven report before
any runtime optimization.
