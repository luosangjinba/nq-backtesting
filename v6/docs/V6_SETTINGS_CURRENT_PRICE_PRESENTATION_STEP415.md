# V6 Settings Current Price Presentation - Step 415

Date: 2026-07-13

## Decision

Step 415 uses Lightweight Charts 5.2 native `title`, `lastValueVisible`, and
`priceLineVisible` series options. No custom price label or line is rendered.
The awesome-tradingview catalog did not provide a smaller relevant layer.

Official reference:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/SeriesOptionsCommon
- https://github.com/tradingview/awesome-tradingview

## Active Fields

- current-price symbol name;
- current-price value label;
- current-price horizontal line.

Settings schema v7 owns the durable workspace preferences. A focused bridge
combines them with each Pane's symbol and calls a Pane-scoped Chart Surface API;
only the Chart Engine adapter mutates the series. Multi-pane labels therefore
retain NQ/ES/YM identity instead of sharing one global title.

Checkbox changes publish a draft-preview event and update every Pane
immediately. OK remains the only persistence action; Cancel, close, Escape, and
backdrop restore the committed presentation, while Reset previews tab defaults.

## Acceptance

Automated gates cover v7 migration, native-option mapping, draft/Cancel/Reset/
OK, Pane symbol changes, multi-pane application, and hard-reload persistence.
Human visual acceptance is required before Step 415 closes.

## Next

After visual acceptance, implement Step 416 Global Time Presentation:
timezone, 12/24-hour format, one shared formatter, and controlled time inputs.
