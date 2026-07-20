# V7 First Lightweight Charts Slice

Status: R4.5 human-accepted (2026-07-20)

## Visible Scope

R4.5 is the first real chart-bearing vertical slice:

- one NQ pane with explicit `1m` and ETH labels;
- deterministic local foundation bars, clearly disclosed in the UI;
- chart entry showing 120 source minutes of historical prefix plus the selected
  Session start bar, while every later bar remains hidden;
- Manual Next through the same Workspace Transaction Runtime path;
- default wall, native drag-created manual wall, and explicit Reset View;
- loading, empty, unavailable, stale, error, and ready presentation variants;
- the accepted Session Browser remains the route and unsupported Session
  configurations retain their existing summary rather than pretending to have
  market support.

This is not a real CME provider or production Session Hours implementation.
Those remain later capability/adapter work.

## Owners And Ports

`adapter.lightweight-chart` is the only module importing Lightweight Charts or
calling series APIs. It implements the staged Chart Snapshot Application port,
uses `setData()` for one complete immutable snapshot, applies the current
Viewport Runtime logical projection, and owns chart lifecycle/native input
capture under its supplied host.

`adapter.replay-workspace-ui` owns only its DOM subtree, visible state, and UI
command dispatch. It composes Session activation, Bar Data Runtime with a
deterministic provider, Replay Runtime, Projection Domain, Workspace
Transaction Runtime, Chart Snapshot Application, Viewport Runtime, and the
real adapter strictly through public facades. It owns no alternate bars,
Replay cursor, projection, chart series, or viewport intent.

Session Browser receives the workspace surface as an optional public route
surface. When absent or unsupported, its previous opened-Session behavior is
unchanged.

## Paint Receipt

Official v5.2 documentation confirms that `subscribeDataChanged()` fires when
`setData()` or `update()` is invoked; it is not paint completion. The adapter
therefore:

1. checks exact transaction currency immediately before series mutation;
2. applies one complete candlestick dataset and current logical viewport;
3. crosses two animation-frame opportunities;
4. calls `takeScreenshot()` and requires actual up/down candle pixels;
5. rechecks transaction currency;
6. returns the exact branded adapter receipt.

Workspace/Replay acceptance still occurs only after Chart Snapshot Application
returns exact visible completion.

## Viewport Behavior

Native pointer drag and wheel completion read the engine's actual visible
logical range and promote it through Viewport Runtime. Manual offset/span are
reapplied after the next full `setData()` snapshot. A signed manual offset lets
the latest Replay bar move offscreen while browsing older history. Reset View
explicitly creates a new default intent. Programmatic data application never
fabricates a manual intent.

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
- deterministic fixture quality assertions require every OHLC value to align
  to the NQ `0.25` tick, aggregate wick length to remain below aggregate body
  length, elongated-wick frequency to stay below eight percent, and directional
  runs to remain below twelve candles;
- complete V7 suite and source/architecture checks run before commit.

Automated evidence did not grant acceptance. Human review exercised the actual
chart interaction and visual quality and accepted R4.5 on 2026-07-20 after the
immersive-layout and candle-structure corrections.
