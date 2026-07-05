# V6 FXReplay UI Guardrails

Date: 2026-07-05

## Purpose

These guardrails capture the FXReplay UI kernel V6 should preserve while
building its own implementation. They are not pixel-copy requirements. The goal
is to keep V6 from drifting into a dashboard, debug console, or generic SaaS
layout while preserving V6 runtime ownership boundaries.

## Reference Screenshots

Primary references:

- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104015.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104030.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104111.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104130.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104146.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104208.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104228.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104336.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104354.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104407.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104427.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104517.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104602.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104731.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104743.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104757.png`
- `/home/leo/myworkspace/trading/backtesting/tmp/2026-07-05_104815.png`

## UI Kernel

V6 should preserve these interaction and information-architecture traits:

- The chart is the primary surface. Tooling surrounds it and must not become the
  main visual object.
- The top toolbar is compact and command-oriented: instrument search, symbol,
  interval, layout, Indicators, undo, redo, account/profile, instrument selector,
  editor/theme/fullscreen-style controls.
- The left toolbar is a vertical drawing/tool strip using icon buttons.
- The right toolbar is a narrow utility strip for order, go-to, news, journal,
  settings, and related shortcuts.
- The bottom transport is a compact floating control near bottom center.
- Trading/account chrome stays along the bottom edge and remains dense:
  Buy/Sell, quantity, analytics, account balance, realized/unrealized PnL.
- Chart titles and OHLC readouts live inside each pane at the top-left of that
  pane. They are compact, read-only, and close to the chart they describe.
- Multi-pane layouts use explicit pane boundaries, pane-local titles, pane-local
  OHLC, and pane-local price scales.
- Engineering diagnostics such as boundary, cache-hit latency, command counts,
  and test gates must not appear in the normal user surface.

## Timeframe Menu

The interval menu should behave like a tool dropdown:

- It opens as a narrow floating panel anchored near the top toolbar.
- It groups intervals by seconds, minutes, hours, and days.
- The selected interval is highlighted as a row, not as a large card.
- `Add custom interval...` belongs at the top of the menu.
- The menu overlays the chart and does not reflow chart layout.

## Indicators, Undo, Redo

Indicators, undo, and redo are reserved top-toolbar commands:

- `Indicators` is a compact icon-plus-label command.
- Undo and redo are icon-only commands with clear disabled states.
- Future implementation should route through explicit command/event boundaries
  or a dedicated indicator/drawing runtime. These controls must not directly own
  chart data, replay cursor, viewport intent, or adapter state.

## Settings Kernel

Settings should use a chart-settings modal, not a full page:

- The modal is centered, dark, dense, and form-oriented.
- The left rail is a tab list with icon plus text: Symbol, Status line, Scales and lines, Canvas.
- The right pane contains grouped chart controls with checkboxes, selects,
  color swatches, sliders, and numeric inputs.
- The footer is fixed with Template on the left and Cancel/Ok on the right.
- Settings text should name chart behaviors, not explain implementation details.
- Settings UI dispatches settings commands and subscribes to settings state. It
  must not directly mutate chart series, replay state, bar cache, or viewport
  intent.

## Visual Tone

The product tone is dark, compact, and professional:

- Prefer restrained borders, dense spacing, and low-contrast chrome.
- Use symbols/icons for tool commands where the meaning is familiar.
- Avoid hero sections, explanatory cards, marketing copy, oversized headings,
  and debug/status ribbons in the primary chart surface.
- Use floating panels and menus for tools; do not convert tool choices into
  large dashboard panels.

## Ownership Guardrails

UI parity work must preserve V6 boundaries:

- UI dispatches commands and subscribes to events.
- Only chart-engine writes adapter series data and logical ranges.
- Only chart-data owns pane-local bars and revisions.
- Only chart-viewport owns viewport intent and projection.
- Only replay/default-wall runtimes own replay cursor and wall progression.
- Settings, indicators, drawing tools, and account/trading UI need explicit
  state owners before they become interactive.

## Non-Goals

- Do not copy FXReplay pixels, spacing, icons, or exact labels blindly.
- Do not implement unfinished trading/account actions as decorative fake
  workflows.
- Do not expose test harness status to ordinary users.
- Do not let UI parity bypass the replay, chart-data, chart-viewport, or
  chart-engine boundaries.
