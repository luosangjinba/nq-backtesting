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
- Session Calendar resolves New York calendar semantics, then encodes the
  `00:00`/`18:00` wall-clock fields into the same naive timestamp coordinate
  used by V6 market bars before mapping them to the current bar sequence;
- a focused bridge subscribes to Settings and Chart Data and sends computed
  lines to Chart Surface;
- Chart Surface/adapter only mounts and updates the batch primitive.

Chart Engine does not import Session Calendar, and Settings does not call the
chart library.

## Rendering Rules

- intraday panes render separators; `1D`/`1W`/`1M` do not;
- a boundary between HTF bars uses a fractional logical coordinate;
- boundaries inside long market/weekend gaps are suppressed;
- New York calendar semantics are independent of the browser/system timezone;
  EDT/EST absolute UTC offsets must never be passed directly to the chart's
  naive wall-clock axis;
- every pane owns one updatable primitive, independent of separator count.

## Automated Gate

Passed:

- schema-v4 validation and v1/v2/v3 migration;
- spring/fall 2026 DST boundary fixtures;
- explicit EDT/EST chart-coordinate assertions proving both seasons render at
  `00:00` and `18:00`, never `04:00`/`05:00` or `22:00`/`23:00`;
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

The first visual pass found a four-hour offset at the ICT boundary. The cause
was an absolute New York instant being sent to V6's naive wall-clock chart
axis. Commits `1eeca731` and `26455014` correct the coordinate domain and keep
the wall-clock conversion off the chart-data latency hot path. Visual
revalidation is required.

## Next

After visual acceptance, close Step 412 and implement Step 413 Symbol
Presentation: candle body/border/wick colors and simplified price precision.
