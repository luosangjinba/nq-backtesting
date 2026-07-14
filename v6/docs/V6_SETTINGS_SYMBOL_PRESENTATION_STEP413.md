# V6 Settings Symbol Presentation - Step 413

Date: 2026-07-13

## Decision

Step 413 activates the `Symbol` Settings tab for candle presentation and price
precision. It uses Lightweight Charts' native candlestick series options. V6
does not create a parallel candle renderer or let the Settings UI mutate chart
series directly.

Official capability checks:

- `CandlestickStyleOptions` already owns body, border, wick visibility, and
  up/down colors;
- `PriceFormatBuiltIn` already owns decimal precision and minimum price move.

The awesome-tradingview ecosystem did not provide a smaller or more suitable
presentation layer than the native series API for this bounded slice.

## Active Fields

- up/down body colors;
- border visibility and up/down border colors;
- always-visible wicks with up/down wick colors;
- price precision: `Auto` or zero through six decimal places.

`Color bars based on previous close`, fractional tick formats, and symbol-
specific exchange metadata are not part of this step.

## Ownership And Flow

The transactional Settings owner remains the only durable preference owner:

`Settings schema v5 -> Symbol chart-surface bridge -> Chart Surface -> Chart
host manager -> Chart Engine adapter -> series.applyOptions`

Consequences:

- the modal edits only a draft until `OK`;
- `Cancel` discards the draft;
- `Reset` affects only the active tab's fields;
- every mounted pane receives the same committed symbol presentation;
- only the Chart Engine adapter writes the Lightweight Charts series;
- hard reload restores the versioned global record before applying it.

## Precision Boundary

V6 does not yet own a symbol tick-size metadata contract. `Auto` therefore
restores the chart series default price format (`2` decimals, `0.01` minimum
move) rather than guessing from observed prices. Explicit decimal choices map
to matching `precision` and `minMove` values. A future symbol-metadata step may
replace the default source without changing the Settings or Chart Engine
ownership path.

## Acceptance

Automated gates cover:

- schema-v5 validation and migration;
- pure native-option mapping;
- focused bridge delivery and multi-pane fan-out;
- draft isolation, Cancel, tab-scoped Reset, OK, and hard-reload recovery;
- adjacent Settings/browser behavior and the full chart regression pack.

Human visual acceptance verified candle body/border/wick colors, aligned color
columns, border visibility, always-visible wicks, price-axis precision, Cancel,
Reset, OK, and persistence. Step 413 is closed.

## Next

Implement Step 414 Status Line Presentation through the existing Status
Readout owner rather than adding status rendering to the Settings panel or
Chart Engine adapter.
