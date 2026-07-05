# V5 Manual Anchor Wall Handoff

## Context

This handoff records the current V5 replay bugfix node before a local machine
restart. The active direction remains multi-pane / replay bug fixing.

## Latest Commits

- `6307057 fix(v5): apply replay follow range during append`
  - Removed the append-path frame delay between `series.update()` and replay
    follow range application.
  - Kept same-TF Next/Play on the incremental append path.
- `13fea7c fix(v5): resume replay follow after manual viewport`
  - Restored the right wall after manual interaction, but this proved too
    strong because it reset manual viewport placement back to the default wall.
- `0b04164 fix(v5): preserve manual replay anchor wall`
  - Corrected the semantic: after dragging or wheel-zooming away from the
    default right wall, replay Play/Next keeps the pane in manual mode and
    advances the manual visible range by the replay cursor delta.
  - The latest candle therefore uses its current screen position as a temporary
    pane-local anchor wall, and new candles push left from there.
  - Existing/default panes still use the configured default `rightOffsetBars`
    wall.

## Verified

- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/replay-chart-sync-fanout-smoke.js`
- `node v5/tests/replay-right-edge-follow-browser-smoke.js`
- `node v5/tests/replay-cadence-latency-browser-smoke.js`
- `node v5/tests/multi-pane-tf-change-next-fanout-browser-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `git diff --check`

The latest cadence smoke stayed fast: average around `6.7ms`, p95 around
`13.6ms`.

## Resume Checklist

- Restart the local V5 HTML/API service after reboot.
- Manually retest single-pane replay:
  - initial default right wall;
  - drag left/right or wheel zoom away from the wall;
  - Play/Next should preserve the current latest-candle position as a temporary
    wall, not reset to the default wall.
- Manually retest multi-pane replay:
  - two-pane and three-pane layouts;
  - mixed TF panes, especially active-pane TF changes;
  - manual pan/zoom on one pane followed by Play/Next;
  - confirm pane-local anchor walls do not bleed into other panes.
- If a wall bug remains, continue from `chart-runtime-host-sync` append
  visible-range application and `deriveManualAnchorRange`, not from a new V6 or
  primary/non-primary architecture discussion.

