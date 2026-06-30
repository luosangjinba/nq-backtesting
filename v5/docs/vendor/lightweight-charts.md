# Lightweight Charts Vendor Notes

Purpose: keep V5 chart work aligned with official Lightweight Charts APIs
instead of reimplementing native chart controls blindly.

Official docs:

- API reference: https://tradingview.github.io/lightweight-charts/docs/api
- Chart API: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi
- Time scale API: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi
- Scroll options: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScrollOptions
- Scale options: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/HandleScaleOptions
- Grid options: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/GridOptions
- Crosshair options: https://tradingview.github.io/lightweight-charts/docs/api/interfaces/CrosshairOptions

## V5 Usage Rules

- Prefer Lightweight Charts native interactions for wheel zoom, pressed mouse
  pan, touch drag, pinch zoom, and price-axis vertical scaling.
- V5 must not reimplement native wheel zoom or pressed-mouse pan when
  Lightweight Charts already supports it.
- V5 runtime may observe native visible-range changes and translate them into
  chart-owned interaction state.
- Native visible-range observation must not call `series.setData()` on every
  mousemove, wheel, or drag frame.
- Runtime right-edge/no-future enforcement may clamp the chart range, but only
  when the native range exceeds the replay cursor boundary.
- Crosshair readout should use `subscribeCrosshairMove` in Lightweight mode.
  Do not also attach a separate canvas `mousemove` crosshair implementation.
- High-frequency readout events should be throttled or deduped before they
  update route DOM.
- `setData()` is for replacing chart data after replay/bar state changes, not
  for every pointer interaction.
- `timeScale().setVisibleRange()` is acceptable for explicit runtime commands
  and boundary correction, not as a per-frame echo of native pan/zoom.
- Use `timeScale.tickMarkFormatter` for V5 display timezone/time-format labels
  when the default Lightweight formatter is too ambiguous for replay review.
- Do not use fallback DOM canvas padding to shape the Lightweight drawing area;
  it shrinks the engine surface. Keep Lightweight layout options and metadata
  separate from fallback-only DOM presentation.

## Step 385 Focus

Step 385 fixes the current interaction bug:

- wheel zoom and mouse drag should remain native Lightweight Charts behavior;
- price-axis vertical scaling should remain native Lightweight Charts behavior;
- chart runtime observes native range changes without rerendering chart data;
- grid and crosshair styling is explicit so bright default white lines do not
  dominate the chart;
- browser smoke coverage proves native pan/zoom does not cause a `setData`
  storm.

## Step 386 Focus

Step 386 fixes chart display usability after native interaction is stable:

- intraday time-axis ticks use V5 display timestamp formatting and show
  distinguishable labels such as `09:30` instead of repeated day-only labels;
- midnight/day-boundary ticks may show compact date labels such as `06-01`;
- Lightweight chart surfaces keep a stable usable height;
- fallback-only presentation padding is not applied to the Lightweight engine
  surface.
