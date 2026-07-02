# Step 421 - V5 Advanced Chart-Engine Settings

Date: 2026-07-01

Status: completed.

## Goal

Implement a bounded FXReplay Settings parity slice for advanced chart-engine
presentation controls that current V5 runtime ownership can support:
price/time scale visibility, scale border visibility, and text watermark.

## Step Plan

1. Inspect chart-engine adapter and vendored Lightweight Charts support.
2. Add normalized presentation settings for scale visibility/borders and
   watermark style.
3. Pass the settings through chart display context without direct route UI chart
   control.
4. Apply settings in the chart-engine adapter and expose fallback metadata for
   smokes.
5. Add Settings modal controls with existing `Ok`/`Cancel` draft semantics.
6. Update specs, TODO, session handoff, and verification harnesses.

## Implemented

- Added `scaleStyle.priceScaleVisible`, `scaleStyle.timeScaleVisible`, and
  `scaleStyle.scaleBordersVisible`.
- Added `watermarkStyle.visible`, `watermarkStyle.text`,
  `watermarkStyle.color`, and `watermarkStyle.fontSize`.
- Normalized watermark color, font size, and text length in presentation
  runtime.
- Routed new settings through chart runtime display context.
- Applied scale visibility/borders to Lightweight `timeScale` and
  `rightPriceScale` options.
- Applied text watermark through Lightweight `createTextWatermark(series, ...)`
  from inside the chart-engine adapter.
- Added Settings controls:
  - Scales and lines: Time scale, Price scale, Scale borders.
  - Canvas: Watermark, watermark text, color, and size.
- Preserved draft-only Settings edits until `Ok`.

## Deferred

- Price-scale mode and scale placement.
- Lock price-to-bar ratio.
- No-overlap label behavior.
- Countdown to bar close.
- Session break rendering.
- Template persistence.
- Split-pane and pane-specific settings.

## Verification

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Notes

- The vendored Lightweight Charts 5.2 text watermark helper wraps a series
  primitive. Passing the chart object raises `attachPrimitive is not a
  function`; the adapter must pass the candlestick series.
- Watermark and scale settings are chart presentation only. They must not
  mutate replay cursor, display bars, request ranges, or bar-data cache keys.
