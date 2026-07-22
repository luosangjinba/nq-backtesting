# V7 Workstation Settings Product Refinement — R6.9g

Status: completed headlessly with user-reviewed product detail and automated
documentation evidence (2026-07-22)

## Trigger

After R6.9f selected the Settings owner and scope, the user re-audited all four
FXReplay Settings tabs with screenshots and explained which controls carry
real trading value. This refinement changes the catalog before any production
Settings module or UI exists.

R6.9g does not silently reuse or amend the delivered R6.9f id. The R6.9f
document remains the base ownership decision and now presents the combined
catalog; this document records the explicit product delta.

## Accepted Product Delta

### Symbol

- retain Body, Border, and Wick visibility plus independent up/down colors;
- activate price precision instead of deferring it;
- offer Auto, Integer, and 1-15 decimal places;
- derive Auto from the Instrument Definition's exact `priceIncrement`;
- apply one selected precision to the price axis, current-price value, OHLC,
  and absolute change while preserving stored values and the real tick size;
- use a tested custom formatter when a manual precision is incompatible with
  the native built-in `minMove`/precision constraint;
- reject previous-close candle coloring and fractional quote formats until an
  actual supported instrument needs them.

### Status line

- retain compact symbol and TF without a Description/Ticker mode selector;
- implement OHLC and bar-change visibility, default on;
- implement Volume visibility, default off;
- show `Vol —` when the accepted bar has explicit unknown `null` volume;
- reject market-open status and a separate status background in the current
  Canvas-integrated readout.

### Scales and lines

- implement independent current-price Name, Value, and Line controls;
- require all eight Name/Value/Line combinations to pass against the real
  library; native limitations may not be hidden by coupling stored fields;
- reject percentage mode, scale-mode visibility, price/bar ratio lock, axis
  placement, plus button, bar countdown, and left-edge interval preservation;
- keep non-overlapping labels as an invariant rather than a user control;
- defer previous-day close and high/low to future overlay/business owners.

### Canvas

- support one solid background color only;
- simplify Grid to one horizontal-and-vertical visibility switch;
- expand Crosshair from color-only to shared color, opacity, native width, and
  solid/dashed/dotted style for both lines;
- compose the selected Crosshair opacity into the color applied to both native
  lines rather than inventing a separate chart option;
- implement scale text color and font size;
- reject Session-break backgrounds, Watermark, and user-editable Canvas/axis
  boundary color;
- implement hover/always/hidden visibility for the existing lower-right Pane
  control dock;
- implement top/bottom margins directly and right margin through Viewport
  default/reset intent without overwriting manual walls.

### Time presentation

- keep current New York display as the default and preserve DST through
  `America/New_York`;
- add only New York, UTC, and browser-local display choices;
- add four practical date formats with truthful examples;
- add a weekday toggle for detailed labels;
- require 12-hour and 24-hour display;
- change presentation only: Replay cursor, Session range, Quick GoTo anchors,
  bar instants, and New York session semantics remain unchanged.

## Existing V7 Facts

- `InstrumentDefinition.priceIncrement` is already an exact decimal string;
  foundation NQ/ES currently use `0.25`.
- `RawBar.volume` and projected Volume are finite non-negative numbers or
  explicit `null`.
- fixed-timeframe aggregation sums complete Volume and propagates `null` when
  any contributing source Volume is unavailable.
- chart labels currently format with `America/New_York` without changing bar
  instants.

The refinement therefore needs no new provider field and no Replay data
mutation. It changes future Settings mapping and presentation only.

The official Lightweight Charts 5.2 check confirms native width/style/color,
built-in and custom price formatters, series title/value/line primitives, and
bar-based right offset. No reviewed awesome-tradingview/plugin example replaces
V7's Settings owner, all-Pane transaction, or Viewport intent. R6.9j/R6.9k must
still prove body-hidden mapping and all eight current-price combinations before
those controls become active.

## UI Shape

Retain the reviewed four-tab shell:

1. Symbol;
2. Status line;
3. Scales and lines;
4. Canvas.

The left tab rail and fixed header/footer follow the FXReplay information
architecture, not its entire field list. The footer contains Reset, Cancel, and
OK. Template and Apply to all are omitted because one committed global value
already targets every current and future Pane.

## Delivery Renumbering

R6.9g is the next delivered repository step, so unimplemented planned ids move
forward without reusing a delivered id:

- R6.9h: separate Exact GoTo Calendar surface after R6.9e acceptance;
- R6.9i: Workstation Settings owner, persistence, transactional shell, and one
  honest Grid consumer;
- R6.9j: Symbol candles and precision;
- R6.9k: Status readout and current-price controls;
- R6.9l: Canvas/Crosshair/control visibility/margins;
- R6.9m: global time presentation;
- R6.10: remaining layout synchronization families.

## Non-Goals

This step adds no module, record, modal, style, chart option, readout, Volume
text, timezone selector, or visible behavior. Production fields remain blocked
until their owner and focused evidence arrive in the corresponding bounded
slice.
