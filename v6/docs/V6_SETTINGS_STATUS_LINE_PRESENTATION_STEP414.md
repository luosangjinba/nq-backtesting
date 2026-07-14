# V6 Settings Status Line Presentation - Step 414

Date: 2026-07-13

## Decision

Step 414 activates Status line settings through the existing Pane Status
Readout owner. Lightweight Charts 5.2 has no built-in legend; its official
guide uses application-owned HTML updated from `subscribeCrosshairMove`. V6
already follows that pattern, so no chart plugin or duplicate legend was added.

Official reference:

- https://tradingview.github.io/lightweight-charts/tutorials/how_to/legends
- https://github.com/tradingview/awesome-tradingview

## Active Fields

- title: Ticker or Hidden;
- OHLC visibility;
- bar-change visibility;
- background color and opacity.

The first title slice deliberately omits Description/Both because V6 does not
yet own reliable symbol-description metadata. Hard-coded NQ descriptions would
violate the symbol owner boundary.

Market state remains deferred until exchange-calendar truth exists. Volume
remains deferred until its source provenance and replay semantics are verified.

## Ownership And Semantics

`Settings schema v6 -> Settings Status Readout bridge -> Pane Status Readout`

Settings owns validation, transaction, and persistence. The bridge only
forwards committed fields. Pane Status Readout alone owns status DOM and applies
the same workspace-chart preferences to every pane.

Bar change means selected-bar close versus the previous bar close, matching the
reference product's absolute and percent values. It shares the selected
candle's up/down/flat color with OHLC. Chart Surface enriches its
existing crosshair event from the bounded pane-bar window; it does not request
data or move replay state.

## Acceptance

Automated gates cover schema-v6 migration, draft/Cancel/tab-scoped Reset/OK,
multi-pane application, previous-close change math, background opacity, and
hard-reload restoration. Human visual acceptance verified title/OHLC/change
visibility, background opacity, persistence, and Bar Change sharing OHLC
up/down/flat colors. Step 414 is closed.

## Next

Implement Step 415 Scales And Current Price Presentation through native series
options and the established Chart Surface path.
