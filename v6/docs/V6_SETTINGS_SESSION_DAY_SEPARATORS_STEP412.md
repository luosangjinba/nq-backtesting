# V6 Settings Session And ICT Day Separators - Step 412

Date: 2026-07-13

## Decision

V6 supports four Canvas separator modes:

- hidden;
- trading day at `18:00 America/New_York`;
- ICT day at `00:00 America/New_York`;
- both.

Trading-day and ICT lines each have a color and `solid`/`dashed`/`dotted`
style. These are workspace-chart preferences committed through the existing
Settings transaction.

## Existing Capability Check

Lightweight Charts provides Series Primitives and an official Vertical Line
plugin example. V6 reuses that lifecycle and coordinate pattern, but uses one
batch primitive per pane rather than creating one primitive per day. The
awesome-tradingview ecosystem does not provide V6's Settings owner or an
ICT-aware, DST-aware separator policy.

Official references:

- https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives
- https://tradingview.github.io/lightweight-charts/plugin-examples/plugins/vertical-line/example/
- https://github.com/tradingview/lightweight-charts/tree/master/plugin-examples
- https://github.com/tradingview/awesome-tradingview

## Ownership

- Settings v4 validates, migrates, and persists presentation choices.
- the shared New York wall-clock module is the sole ET/DST conversion helper;
  existing Go-to now uses the same helper;
- Session Calendar produces absolute separator instants and maps them to the
  current bar sequence;
- a focused bridge subscribes to Settings and Chart Data and sends computed
  lines to Chart Surface;
- Chart Surface/adapter only mounts and updates the batch primitive.

Chart Engine does not import Session Calendar, and Settings does not call the
chart library.

## Rendering Rules

- intraday panes render separators; `1D`/`1W`/`1M` do not;
- a boundary between HTF bars uses a fractional logical coordinate;
- boundaries inside long market/weekend gaps are suppressed;
- DST is evaluated per New York calendar date, never as a fixed UTC offset;
- every pane owns one updatable primitive, independent of separator count.

## Automated Gate

Passed:

- schema-v4 validation and v1/v2/v3 migration;
- spring/fall 2026 DST boundary fixtures;
- overlay mapping, fractional HTF position, weekend-gap suppression, and
  daily-TF suppression;
- primitive renderer and lifecycle smoke;
- Settings/Chart Data/Session Calendar bridge smoke;
- real Lightweight Charts adapter/browser smoke;
- Settings draft/OK/persistence/hard-reload browser smoke;
- adjacent Settings browser tests, full chart regression pack, boundary smoke,
  and `git diff --check`.

## Human Gate

Step 412 remains open until visual acceptance confirms hidden, trading, ICT,
and both modes; distinct colors/styles; correct `18:00` and `00:00` placement;
HTF positioning; pan/zoom stability; and hard reload.

## Next

After visual acceptance, close Step 412 and implement Step 413 Symbol
Presentation: candle body/border/wick colors and simplified price precision.
