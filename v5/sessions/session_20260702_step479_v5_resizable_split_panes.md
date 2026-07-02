# Step 479 - V5 Resizable Split Panes

## Goal

Add FXReplay-style draggable split boundaries to V5 multi-pane layouts without
storing fixed pixel dimensions or letting route UI control chart internals.

## Plan

- Step 479.1: Add layout-runtime split ratio state and a `layout.setSplitRatio`
  command.
- Step 479.2: Render split handles from the pane shell for supported
  `twice.*` and `triple.*` variants.
- Step 479.3: Drive responsive CSS grid tracks from split ratios instead of
  fixed widths/heights.
- Step 479.4: Clamp adjacent pane shares to a minimum wall so panes cannot
  collapse away.
- Step 479.5: Extend runtime and browser smoke coverage, update docs, and
  commit.

## Result

- Added `layout.setSplitRatio` and normalized split ratios to layout state.
- Added draggable split handles for two-pane and three-pane variants.
- Kept split layout responsive by rendering CSS `fr` tracks from ratios.
- Added a 15/85 minimum wall for adjacent split drags.
- Preserved composite layout defaults such as `triple.left` using a larger
  primary pane.
- Extended browser smoke coverage for split handles, clamping, resize metrics,
  and multi-pane axis/chrome visibility.

## Boundaries

- Layout runtime owns split state and clamping.
- Pane shell dispatches layout commands and renders DOM/CSS only.
- Chart runtime remains responsible for chart host resize and chart engine
  writes.
- Split ratios are not persisted as pixel widths or heights.

## Verification

- `node --check v5/src/runtime/layout-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`

## Next

Step 480 should harden split-pane synchronization after resizing: verify all
layout variants keep price/time axes, OHLC overlays, active-pane focus, and
future Settings scope stable after split drags.
