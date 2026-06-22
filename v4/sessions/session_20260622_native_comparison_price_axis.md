# Session: Native Comparison Price Axis

Date: 2026-06-22

## Issue

The custom Comparison boundary price-axis was not good enough:

- tick density was too sparse compared with the native Lightweight Charts axis;
- moving the crosshair did not show the native live price label on that custom DOM axis;
- previous fixes had to duplicate native price-axis behavior in DOM, which kept creating edge cases.

## Decision

Replace the custom DOM boundary axis with the native Lightweight Charts right price scale.

Tradeoff accepted:

- The sliding Comparison chart now uses the visible Comparison window width instead of a full-width clipped canvas.
- This lets Lightweight Charts place its native right price scale at the Main/Comparison boundary.
- Native price labels, tick density, crosshair price labels, and price-axis interactions come from Lightweight Charts instead of V4 custom DOM.

## Changes

- Removed custom boundary price-axis DOM from `comparison-window-controller.js`.
- Removed custom boundary price-axis positioning, tick rendering, wheel/drag/double-click handlers.
- Removed boundary price-axis CSS.
- Removed manual Comparison price-range helpers and `autoscaleInfoProvider` from `comparison-chart-manager.js`.
- Removed the full-width clipped canvas CSS override:
  - Comparison canvas now matches the visible Comparison window width;
  - LWC native right price scale is visible at the Comparison/Main boundary.
- Updated browser smoke:
  - asserts no custom boundary price-axis exists;
  - asserts Comparison chart container width matches visible Comparison window width;
  - asserts Inspector layout resize keeps the native chart edge aligned to the Comparison right boundary;
  - keeps coverage for Main/Comparison viewport controls and Comparison chart rendering.

## Verification

Ran:

```bash
node --check v4/src/chart/comparison-chart-manager.js
node --check v4/src/ui/comparison-window-controller.js
node --check v4/tests/comparison-window-browser-smoke.js
node v4/tests/comparison-window-browser-smoke.js
git diff --check
```

Result:

- Browser smoke passed.
- Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warning remains unchanged.
