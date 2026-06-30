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
- crosshair readout enablement.

It does not implement a full FXReplay/TradingView settings panel, template
system, drawing-tool preferences, screenshot controls, or complete color/theme
editing.

## Ownership

- Presentation settings runtime owns settings state and persistence-ready
  normalization.
- UI dispatches presentation settings commands and subscribes to events.
- Chart runtime owns chart rendering and consumes presentation settings through
  commands/events.
- Replay runtime continues to own cursor, reveal state, and display bars.
- Bar data runtime continues to own `/v4/bars` requests and cache.

Feature modules must not directly mutate chart internals or replay state when a
presentation setting changes.

## Initial Settings

- `timeFormat`: `24h` or `12h`.
- `dateFormat`: initially `YYYY-MM-DD`.
- `showStatusOhlc`: whether the chart route status line shows OHLC.
- `showStatusChange`: whether the chart route status line shows bar change.
- `showCrosshairReadout`: whether chart-owned hover/readout text may be shown.
- `margins`: top and bottom percentages for chart layout.
- `rightOffsetBars`: number of bars reserved to the right of the latest visible
  bar.

Defaults should match the current V5 dark replay layout and be conservative:
OHLC/status change on, 24-hour time, visible crosshair readout, and right-side
space for replay progression.

## Rules

- Presentation setting changes must not request bars.
- Presentation setting changes must not mutate replay cursor.
- Presentation setting changes must not mutate `displayBars`.
- Presentation setting changes may rerender chart presentation text/layout.
- Time labels use the display timezone contract from
  `chart-display-timezone.md`.
- Chart margins/right offset belong to chart presentation and must not be
  encoded in replay display state.

## Verification

- Runtime smoke verifies normalization, events, and no bar/replay mutation.
- Chart runtime smoke verifies margins/right offset are consumed by chart-owned
  layout state.
- Browser smoke verifies settings changes affect visible presentation while
  cursor, display bars, and `/v4/bars` request counts remain unchanged.
