# Session: Sliding Comparison Boundary Axis/Header Fix

Date: 2026-06-22

Superseded note: the custom DOM boundary price-axis described in this session was later replaced by the native Lightweight Charts price scale in `v4/sessions/session_20260622_native_comparison_price_axis.md`. The header/Close, Main OHLC offset, transparent resize handle, and layout-resize learnings remain relevant; the custom boundary-axis rendering and manual price-range interaction no longer apply.

## Issue

User reported from a real browser screenshot:

- Comparison Window boundary price-axis labels displayed as repeated `0.00`.
- The right boundary/price-axis area visually covered the `Close` button.
- The boundary price-axis could not be used to scale the Comparison Window price range.
- Opening the left-side Comparison Window made the Main chart OHLC legend appear to disappear.
- The Main/Comparison divider showed two adjacent lines: a thick cyan resize-handle line and a thin boundary price-axis line.
- Opening Inspector resizes the chart workspace correctly, but the custom Comparison boundary price-axis could remain at its pre-resize x position.

## Root Cause

- `renderComparisonBoundaryPriceAxis()` positioned the boundary price-axis from the comparison root top, so it covered the header area.
- The axis tick loop passed root-level y coordinates into `comparisonSeries.coordinateToPrice()`, while Lightweight Charts expects chart-pane local y coordinates.
- The resize handle had a higher z-index than the header, so it could sit above header controls near the right boundary.
- In narrow comparison widths, header actions could overflow beyond the clipped window and become unclickable.
- The visible boundary price-axis was a custom read-only DOM overlay. The native Lightweight Charts right price scale lives at the far right edge of the full-width comparison canvas, which is clipped away by the sliding window, so dragging the visible boundary axis did not reach native price-scale interactions.
- The Main OHLC legend stayed anchored to the full-width primary chart's original top-left corner. In sliding mode that point is behind the left-side Comparison overlay, so the legend was covered rather than cleared.
- The resize hit target drew its own visible `::after` line while the boundary price-axis also drew a border line. The resize hit target is still useful, but its visible line is redundant.
- Lightweight Charts canvases resize through their own observer, but the custom DOM boundary axis was only refreshed on comparison state changes/window resize. Inspector open/close changes flex layout without changing comparison state.

## Changes

- Boundary price-axis now uses `#comparison-chart-canvas` geometry:
  - top is the canvas top relative to the comparison root;
  - height is the canvas height;
  - tick y values are canvas-local.
- Added a data-range plausibility check around `coordinateToPrice()`:
  - if Lightweight Charts returns a non-finite or implausible price compared with loaded comparison bars, labels fall back to a simple high/low interpolation;
  - this prevents repeated `0.00` labels while the chart is still settling.
- Added manual comparison price-range support in `comparison-chart-manager.js`:
  - the comparison series uses `autoscaleInfoProvider` when a manual range is active;
  - the range starts from a plausible chart range, falling back to loaded comparison bar highs/lows when `coordinateToPrice()` returns an implausible range;
  - reset clears the manual range and returns to autoscale.
- Made the boundary price-axis interactive:
  - wheel zooms around the pointer y position;
  - vertical drag zooms the price range;
  - double-click resets price autoscale.
- Raised `.comparison-window-header` above the resize handle.
- Added a container query for narrow sliding windows:
  - hides compact field labels;
  - tightens action gaps/button padding;
  - keeps `Close` inside the comparison window instead of overflowing into the canvas.
- Added a `--primary-legend-left-offset` CSS variable on `#chart-stack`:
  - when sliding Comparison is open, Main OHLC shifts to the right of the Comparison boundary;
  - when Comparison closes, the offset resets to `0px`.
- Removed the visible resize-handle pseudo-line:
  - the 10px transparent resize hit target remains;
  - the visible divider is now the thin boundary price-axis line only.
- Added a `ResizeObserver` on `#chart-stack`:
  - layout-only refresh updates `--comparison-root-width`, Comparison window geometry, boundary price-axis position, and Main OHLC legend offset;
  - it does not reload comparison bars or rebuild controls.
- Extended `comparison-window-browser-smoke.js` to assert:
  - boundary price-axis starts below the header;
  - loaded boundary labels are not all `0.00`;
  - `Close` button center is hit-testable and not covered by boundary layers.
  - boundary price-axis wheel changes the comparison price range;
  - boundary price-axis double-click resets autoscale.
  - Main OHLC legend shifts outside the left-side Comparison overlay and resets after close.
  - resize handle remains hittable but does not draw a second thick divider.
  - Inspector open/resized chart workspace keeps the boundary price-axis aligned to the Comparison right edge.

## Verification

Ran:

```bash
node --check v4/src/ui/comparison-window-controller.js
node --check v4/src/chart/comparison-chart-manager.js
node --check v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result:

- All checks passed.
- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.
