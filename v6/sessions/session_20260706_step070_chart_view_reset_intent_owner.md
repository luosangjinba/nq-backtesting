# V6 Step 70 - Chart View Reset Intent Owner

Date: 2026-07-06

## Summary

Step 70 backfilled the missing Reset View behavior.

Reset View now belongs to chart viewport ownership:

- `chartViewport.resetView` resets the current pane intent from manual wall back
  to default wall;
- reset uses the pane's remembered default right-side wall offset, not a global
  fallback and not the current manual offset;
- reset can immediately re-project when called with chart-data revision and
  latest logical index;
- the UI button is connected through a thin reset-view bridge that dispatches
  the viewport command and does not call chart adapter APIs directly.

## Important Correction

The chart-entry path uses a default wall offset of 12 bars, while older generic
viewport fallback defaults to 8. Reset View must return to the pane's initial
default wall, so the viewport store now records `defaultLatestOffsetBars` when
the pane intent is first created.

This avoids a subtle bug where reset view would appear to work but move the
latest candle to a different wall than the initial chart-entry wall.

## Browser Gate

`chart-reset-view-browser-smoke.js` creates a session through the current
chart-entry path, uses native wheel input to create a manual wall, clicks the
Reset View button, and verifies:

- intent returns from `manual` to `default`;
- latest candle placement returns to the initial default wall offset;
- chart bars are unchanged;
- replay cursor is unchanged;
- projection reaches the chart surface through the existing viewport bridge.

## Commits

- `fe38552c docs(v6): scope step seventy reset view`
- `440c8138 feat(v6): add chart viewport reset owner`
- `ed415bd8 feat(v6): wire reset view control`
- `3dbd3025 fix(v6): reset view to pane default wall`
- `edf197d0 test(v6): verify chart reset view browser flow`
- `5f47a775 test(v6): include reset view in runtime inventory`

## Verification

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 71 should return to playback period sync policy. The transport period menu
and sync toggle need an owner so playback period state does not remain shell DOM
state.
