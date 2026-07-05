# V6 Step 13 - Manual Wall Replay

Date: 2026-07-04

## Scope

Step 13 completed the first manual-wall replay gate. Manual wall remains owned
by chart-viewport intent; replay advancement consumes the same in-memory forward
buffer but returns the active chart-viewport projection after chart-data updates.

## Completed Commits

- `0b3ee42 feat(v6): preserve manual wall projection in replay`
- `fc6a3ad test(v6): keep manual wall through display windows`
- `10718ab test(v6): gate manual wall replay visibility`
- `83daf7e test(v6): cover manual wall range measurement`

## Implementation Notes

- Default-wall runtime now returns `activeProjection` and `viewportRecord` after
  load/Next/no-op Next, so callers can apply whichever chart-viewport intent is
  active.
- Runtime smoke verifies that after `chartViewport.setManualIntent`, later Next
  preserves manual `latestOffsetBars`, `spanBars`, origin, and revision.
- Display-window smoke verifies chart-data replace/append cannot reset manual
  viewport intent.
- Browser smoke uses a real V6 page and Lightweight Charts adapter. It measures
  the final logical range from the adapter, creates manual intent from that
  measurement, then advances replay and asserts latest candle offset/span stay
  fixed at the manual wall.
- Viewport projection smoke now covers drag-style measurement and wheel/zoom
  measurement from logical range.

## Verification

- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/manual-wall-display-window-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The manual-wall browser smoke required local browser-test permissions because
it starts a temporary HTTP server and headless Chrome.

## Next Step

Step 14 should add FXReplay-like replay transport controls. The controls should
dispatch commands only and must not take ownership of replay cursor, chart data,
viewport intent, or chart engine state.
