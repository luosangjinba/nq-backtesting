# Chart Presentation Settings

V5 keeps chart presentation settings separate from replay identity and bar data.
The goal is to establish a small settings foundation before order, journal,
annotation, and chart-axis workflows depend on ad hoc display choices.

## Scope

The initial presentation settings foundation covers:

- display timezone reference from the existing display timezone runtime;
- time label format preferences used by status, candle titles, tooltips, and
  future axis labels;
- status line field visibility;
- chart margins and right offset;
- crosshair readout enablement;
- candle body, border, and wick colors for up/down candles;
- grid line visibility and colors;
- crosshair line visibility, line colors, and label background color;
- chart background color;
- price/time scale text color, line color, and text size;
- chart-owned crosshair readout visibility and formatting;
- shared price, OHLC, change, candle-title, and inspection formatting.

It does not implement a full FXReplay/TradingView settings panel, template
system, drawing-tool preferences, screenshot controls, or complete color/theme
editing.

## Ownership

- Presentation settings runtime owns settings state and persistence-ready
  normalization.
- UI dispatches presentation settings commands and subscribes to events.
- Chart runtime owns chart rendering and consumes presentation settings through
  commands/events.
- Chart runtime owns crosshair inspection state and emits readout events.
- Replay runtime continues to own cursor, reveal state, and display bars.
- Bar data runtime continues to own `/v4/bars` requests and cache.

Feature modules must not directly mutate chart internals or replay state when a
presentation setting changes.

## Initial Settings

- `timeFormat`: `24h` or `12h`.
- `dateFormat`: initially `YYYY-MM-DD`.
- `showStatusOhlc`: whether the chart route status line shows OHLC.
- `showStatusChange`: whether the chart route status line shows bar change.
- `showStatusTitle`: whether the chart canvas OHLC overlay shows
  instrument/timeframe title text.
- `showOpenMarketStatus`: whether the chart canvas OHLC overlay shows the market
  status dot.
- `showCrosshairReadout`: whether chart-owned hover/readout text may be shown.
- `margins`: top and bottom percentages for chart layout.
- `rightOffsetBars`: number of bars reserved to the right of the latest visible
  bar.
- `candleStyle`: up/down colors for candle body, border, and wick, normalized
  as `#rrggbb`.
- `gridStyle`: vertical/horizontal grid visibility plus colors, normalized as
  `#rrggbb`.
- `crosshairStyle`: vertical/horizontal crosshair visibility, line colors, and
  label background color, normalized as `#rrggbb`.
- `backgroundStyle`: chart background color, normalized as `#rrggbb`.
- `scaleStyle`: price/time scale text color, line color, and font size. Colors
  normalize to `#rrggbb`; font size is bounded presentation state.

Defaults should match the current V5 dark replay layout and be conservative:
OHLC/status change on, 24-hour time, visible crosshair readout, and right-side
space for replay progression.

## Rules

- Presentation setting changes must not request bars.
- Presentation setting changes must not mutate replay cursor.
- Presentation setting changes must not mutate `displayBars`.
- Presentation setting changes may rerender chart presentation text/layout.
- Crosshair movement may update chart-owned inspection/readout state.
- Crosshair movement must not request bars, mutate replay cursor, mutate
  `displayBars`, or change visible range/follow state.
- Price, OHLC, change, candle-title, and inspection formatting must be pure
  presentation behavior.
- Formatting changes must not alter canonical timestamps, request ranges, bar
  cache keys, replay cursor, or display-bar identity.
- UI may display crosshair readout by subscribing to chart events or reading
  chart commands, but it must not call chart-engine APIs directly.
- Time labels use the display timezone contract from
  `chart-display-timezone.md`.
- Chart margins/right offset belong to chart presentation and must not be
  encoded in replay display state.
- Candle style belongs to chart presentation and flows through chart display
  context into the chart-engine adapter. UI must not call Lightweight series
  APIs directly to change candle colors.
- Grid and crosshair style belong to chart presentation and flow through chart
  display context into the chart-engine adapter. UI must not call Lightweight
  chart APIs directly to mutate grid or crosshair options.
- Background and scale style belong to chart presentation and flow through chart
  display context into the chart-engine adapter. UI must not call Lightweight
  chart APIs directly to mutate layout, time scale, or price scale options.
- Settings modal edits remain route-local draft state until `Ok`; cancel, close,
  or backdrop dismiss must not mutate presentation, replay, chart data, or
  bar-data state.

## Verification

- Runtime smoke verifies normalization, events, and no bar/replay mutation.
- Chart runtime smoke verifies margins/right offset are consumed by chart-owned
  layout state.
- Adapter smoke verifies candle, grid, and crosshair style reach Lightweight
  series/chart options.
- Adapter smoke verifies background and scale style reach Lightweight
  layout/time-scale/price-scale options.
- Browser smoke verifies settings changes affect visible presentation while
  cursor, display bars, and `/v4/bars` request counts remain unchanged.
