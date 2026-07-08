# V6 Crosshair OHLC Readout - Step 153

## Decision

Step 153 accepts the crosshair OHLC readout boundary.

V6 now reads OHLC values from chart-surface crosshair interaction state instead
of using the latest chart-data bar as a placeholder. When no crosshair-selected
candle is available, the chart header keeps OHLC hidden as `O -- H -- L -- C --`.

## Lightweight Charts API

The implementation uses the official Lightweight Charts 5.2
`subscribeCrosshairMove` API on `IChartApi`. Its `MouseEventParams.seriesData`
map carries the original data item for each series at the hovered time, so the
chart adapter can normalize the selected candlestick without exposing chart
series ownership to shell UI.

Reference:

- `https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi`
- `https://tradingview.github.io/lightweight-charts/docs/api/interfaces/MouseEventParams`

## Accepted Behavior

- `lightweight-chart-adapter` owns direct Lightweight Charts crosshair
  subscription and normalization.
- `chart-host-manager` and `workstation-chart-surface` keep crosshair state
  pane-local and emit `chartSurface:crosshairChanged`.
- `status-readout` renders OHLC only from `chartSurface:crosshairChanged`.
- Chart-data latest-bar updates no longer populate OHLC by themselves.
- The chart header keeps a single symbol/timeframe label and no duplicate
  placeholder label behind the real readout.
- Chart-engine remains the only owner of chart series writes.

## Coverage

- `status-readout-controller-smoke.js` proves OHLC remains hidden until a
  crosshair bar arrives and clears when crosshair has no selected bar.
- `workstation-chart-surface-smoke.js` proves pane-local crosshair events are
  exposed through the chart surface and event bus.
- `status-readout-browser-smoke.js` and
  `status-readout-chart-data-browser-smoke.js` prove replay/chart-data changes
  do not populate OHLC without crosshair selection.
- `crosshair-ohlc-readout-browser-step153-smoke.js` proves real browser
  crosshair movement updates OHLC from the selected candle and keeps the chart
  header free of duplicate symbol/timeframe labels.

## Next Direction

Step 154 should harden multi-pane crosshair readout isolation. Keep crosshair
state pane-local, define how active-pane readout is selected, and preserve
chart-engine, chart-data, replay, bar-data, and viewport ownership boundaries.
