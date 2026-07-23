# V7 Workstation Settings Symbol — R6.9j

## Decision

R6.9j activates only the previously cataloged Symbol candle controls and shared
price precision. It does not activate Status-line visibility, current-price
Name/Value/Line controls, Canvas colors, time formatting, or margins.

The global value now contains independent Body, Border, and Wick visibility plus
up/down colors, and `pricePrecision` as `auto` or an integer from 0 through 15.
The prior R6.9i version-1 wire is migrated deterministically: its Grid choice is
preserved and the new Symbol fields receive accepted defaults.

## Native Mapping And Ownership

Lightweight Charts 5.2 exposes candlestick up/down body, border, and wick colors,
Border/Wick visibility, series `applyOptions`, and built-in/custom price formats.
It does not expose Body visibility. V7 therefore maps hidden bodies to transparent
body colors, keeps Border/Wick intent independent, and supplies a neutral visible
current-price line color while bodies are hidden.

Only the chart adapter calls native chart/series APIs. A Settings change calls
`chart.applyOptions` and `series.applyOptions`; it never calls `setData` or
`update`, never opens a Workspace transaction, and never changes Replay, bars,
Pane intent, or Viewport intent.

## Precision

Auto precision counts the significant decimal places in the exact instrument
`priceIncrement`. Manual precision changes display only. When manual digits are
compatible with native precision, V7 uses the built-in price format. When they
are fewer than the instrument increment's decimal places, V7 uses a custom
formatter while retaining the original numeric `minMove`.

The same pure presentation formats the price axis/current value and the Pane
OHLC/absolute-change readout. Percentage change retains two decimal places and
stored bars are never rounded.

## Transaction And Lifecycle

The Pane-set Settings consumer stages one branded value, applies it to every
mounted child, persists it, then commits its revision. A native-option or durable
write failure restores every already-applied child. Future Panes receive the
latest value before first data paint. A Pane instrument change applies the new
Auto formatter inside the existing chart transaction and restores the prior
instrument formatter if the transaction becomes stale or fails.

## Evidence

- strict value, v1 migration, precision, and rollback assertions;
- real Lightweight Charts proof for native colors/visibility/custom precision
  and unchanged series-data/chart-visible revisions;
- real Replay Workspace proof for current/future Pane fan-out, hard reload,
  cross-Session persistence, shared OHLC precision, and unchanged Replay and
  Workspace revisions;
- fixed Symbol-dialog visual fixture.
