# V6 Session - Step 249 Drag/Scroll Display Stability Reaudit

Date: 2026-07-09

## Scope

Step 249 audited the current drag/scroll display stability coverage after the
post-Step-186 repairs and the later unified leftward-extension planner work.

This step did not change runtime behavior.

## Result

- Added `v6/docs/V6_DRAG_SCROLL_DISPLAY_STABILITY_REAUDIT_STEP249.md`.
- Added `v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`.
- Confirmed the current browser-visible gates already cover sticky hover-drag
  after release, fast right-drag jump-back, drag/wheel-triggered history
  extension, replay responsiveness during pending history, visible-range
  compensation after prepends, and manual projection suppression.
- Kept the single intended owner path: native chart interaction for immediate
  movement, chart surface for observation/compensation, leftward-history input
  and chart-history for extension orchestration, bar-data for bounded requests,
  chart-data for pane-local records, chart viewport for manual/default intent,
  and replay for cursor/reveal state.

## Runtime Changes

None.

## Residual Risk

Subjective K-line smoothness under fast human drag still benefits from manual
browser testing, especially after wheel zoom or when dragging inactive panes in
multi-pane layouts. That should remain a UX tuning follow-up only if the
deterministic gates pass.

## Verification

- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 250 should select the next bounded chart-foundation slice.
