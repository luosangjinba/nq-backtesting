# V7 First Lightweight Charts Slice

Status: R4.5 human-accepted; R6.5 multi-host extension awaiting review (2026-07-21)

## Visible Scope

R4.5 is the first real chart-bearing vertical slice:

- one NQ pane with explicit `1m` and ETH labels;
- real local V4/DuckDB bars after the R5.6 provider correction;
- chart entry showing 120 source minutes of historical prefix plus the selected
  Session start bar, while every later bar remains hidden;
- Manual Next through the same Workspace Transaction Runtime path;
- default wall, native drag-created manual wall, and explicit Reset View;
- loading, empty, unavailable, stale, error, and ready presentation variants;
- the accepted Session Browser remains the route and unsupported Session
  configurations retain their existing summary rather than pretending to have
  market support.

R4.5 originally used a disclosed deterministic fixture. R5.6 replaced that
production fixture with the existing local V4/DuckDB provider; production
Session Hours still remains bounded by the currently verified calendar set.

## Owners And Ports

`adapter.lightweight-chart` is the only module importing Lightweight Charts or
calling series APIs. It implements the staged Chart Snapshot Application port,
uses `setData()` for one complete immutable snapshot, applies the current
Viewport Runtime logical projection, and owns chart lifecycle/native input
capture under its supplied host.

Projection bars carry separate canonical bucket `startEpochMs` and chart-only
`displayEpochMs`. The adapter uses only `displayEpochMs` as the Lightweight
Charts time coordinate. Replay/no-future, Session Hours, aggregation identity,
and provenance continue to use the bucket/source fields.

`adapter.replay-workspace-ui` owns only its DOM subtree, visible state, and UI
command dispatch. It composes Session activation, Bar Data Runtime with the
real provider port, Replay Runtime, Projection Domain, Workspace
Transaction Runtime, Chart Snapshot Application, Viewport Runtime, and the
real adapter strictly through public facades. It owns no alternate bars,
Replay cursor, projection, chart series, or viewport intent.

Session Browser receives the workspace surface as an optional public route
surface. When absent or unsupported, its previous opened-Session behavior is
unchanged.

## R6.5 Product Pane Mapping

Lightweight Charts 5.2 has a native Pane API (`addPane`, `moveToPane`,
`panes`, `removePane`) and it was evaluated before implementation. Native
Panes intentionally share one chart time scale. They fit future same-symbol,
same-time-axis main/sub-pane indicators, but they cannot represent V7 product
Panes that may use independent instruments, fixed TFs, and viewport walls.

R6.5 therefore uses one Lightweight chart instance per product Pane host. One
complete Pane-set adapter owns those child adapters behind the sole Chart
Snapshot Application writer. It stages every Pane result, applies all ready
children inside one visible-application call, then publishes Pane membership,
focus, and empty states together. A newly added hidden host is sized and
painted before the two-Pane layout becomes accepted. Each host is geometrically
bounded by its own Pane so native drag/wheel input cannot leak into its sibling.

Official references checked for this decision:

- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://github.com/tradingview/awesome-tradingview>

## Paint Receipt

Official v5.2 documentation confirms that `subscribeDataChanged()` fires when
`setData()` or `update()` is invoked; it is not paint completion. The adapter
therefore uses a tiered visible receipt:

1. check exact transaction currency immediately before series mutation;
2. use `setData()` for entry, TF/Session-Hours replacement, history prepend, or
   any non-tail difference;
3. use `update()` only when every prior candle is byte-equivalent and the
   latest candle is replaced or one later candle is appended;
4. full replacements cross two rendering opportunities and require actual
   up/down pixels from `takeScreenshot()`;
5. tail updates require the exact series data-change notification and cross
   two rendering opportunities, avoiding a full-canvas screenshot on every
   Replay step;
6. recheck transaction currency and return the exact branded receipt.

Browser phase evidence selected this tiered path: full-canvas capture, not the
series mutation, dominated repeated higher-TF Next latency.

Workspace/Replay acceptance still occurs only after Chart Snapshot Application
returns exact visible completion.

## Viewport Behavior

Native pointer drag and wheel completion read the engine's actual visible
logical range and promote it through Viewport Runtime. Manual offset/span are
reapplied after the next full `setData()` snapshot. A signed manual offset lets
the latest Replay bar move offscreen while browsing older history. Reset View
explicitly creates a new default intent. Programmatic data application never
fabricates a manual intent.

Wheel input is region-specific. Over the plot it retains Lightweight Charts'
horizontal time zoom. Over the visible right price axis, the adapter intercepts
the wheel in the capture phase and uses the public `IPriceScaleApi` visible-
range methods to zoom vertically around the pointer price without changing the
logical time range. Reset View re-enables price autoscale as well as restoring
the default horizontal wall.

For a manual wall whose projected `from` precedes the first loaded logical
slot, R6.7b shifts the complete transient range to begin at `-0.5`; it does not
retain the old `to` and collapse candle spacing. This repair is adapter-only,
preserves canonical span, and prevents a rapid history interaction from
turning a temporary left clamp into oversized candles or a stranded one-Pane
wall.

## Dependency And License

`lightweight-charts` is pinned exactly to `5.2.0` in `v7/package.json` and its
lockfile. The official package is Apache-2.0 licensed. No V6 adapter/runtime or
vendored V6 bundle was copied.

References checked immediately before implementation:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://github.com/tradingview/awesome-tradingview>

## Automated Gate

- independent real-Chrome adapter harness proves v5.2.0 canvas paint and exact
  application revision;
- full real-Chrome workspace harness proves prefix-plus-start entry, one-bar Next,
  one visible/Replay/workspace revision per action, default/manual/reset wall,
  fixed `1440x900` visual regression, and the 250 ms cache-hit maximum;
- six negative controls bind early completion, sampling, wall reset,
  unsupported capability, blank refresh, and latency regressions;
- the R5.6 provider harness verifies actual source normalization and the browser
  fixture displays real DuckDB OHLC rather than synthetic shape heuristics;
- complete V7 suite and source/architecture checks run before commit.

The R6.5 browser gate additionally proves real NQ/`1m` plus ES/`4h` hosts,
active-focus isolation, Pane-local native viewport input, all-Pane Next,
one-step Autoplay, Previous, Restart, Session-wide ETH/RTH, quick New York
GoTo, exact New York GoTo, one/two-Pane transitions, and a fixed `1440x900`
mixed-Pane visual fixture.

Automated evidence did not grant acceptance. Human review exercised the actual
chart interaction and visual quality and accepted R4.5 on 2026-07-20 after the
immersive-layout and candle-structure corrections.
