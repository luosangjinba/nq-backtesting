# V6 Replay/Transport Chain Regression Pack - Step 245

Date: 2026-07-09

## Boundary

Step 245 adds a compact replay/transport foundation regression pack after the
Manual Previous chain closure.

No production replay, chart-data, chart-viewport, bar-data, chart-history,
layout, pane, indicator, trading, order-ticket, prop-firm, or journal behavior
changed.

## Pack

New command:

- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`

The pack runs:

- `replay-runtime-smoke.js`
- `replay-transport-controller-smoke.js`
- `replay-transport-visual-state-browser-smoke.js`
- `manual-previous-chain-closure-step244-smoke.js`
- `manual-previous-transport-readiness-step241-smoke.js`
- `manual-previous-transport-button-step242-smoke.js`
- `manual-previous-transport-multi-pane-step243-smoke.js`
- `leftward-extension-planner-smoke.js`
- `display-timeframe-leftward-auto-chain-browser-smoke.js`
- `replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `layout-pane-data-bootstrap-browser-step162-smoke.js`
- `pane-local-reset-controls-browser-step163-smoke.js`
- `reset-view-htf-browser-step200-smoke.js`
- `display-timeframe-target-pane-browser-step206-smoke.js`

The runner executes each smoke as a child Node process, prints start/pass/fail
lines with duration, stops at the first failure, and exits with the failing
process code.

## Purpose

This pack is intentionally narrower than the full chart browser pack. It gates
the foundation paths most likely to regress together:

- replay runtime and transport visual state;
- Manual Previous readiness, button dispatch, and multi-pane rewind;
- unified leftward extension planner and display-timeframe auto-chain;
- replay latency while leftward history is pending;
- newly visible pane bootstrap;
- pane-local reset view for both base and higher display timeframes;
- pane-targeted display timeframe switching.

## Flake Policy

If one case fails only because of browser timing, rerun that single smoke once
and then rerun the pack. If the single smoke and pack both pass on rerun, record
the transient in session notes rather than changing product behavior.

If the same case fails twice, fix the owner module or log a bounded next step.
Do not widen Step 245 into a feature step.

## Verification

- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 246 should select the next bounded chart foundation slice from current
evidence. It should not reopen Manual Previous unless this pack exposes a
specific regression.
