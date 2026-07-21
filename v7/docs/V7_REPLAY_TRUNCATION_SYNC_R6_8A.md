# V7 Replay Truncation And Sync Timeframe — R6.8a

Status: implemented; awaiting human interaction and visual review (2026-07-21)

## Product Behavior

The fixed Replay transport now includes a truncation/time-machine action. When
armed, every chart uses a blue vertical-only crosshair and a crosshair cursor.
Clicking a revealed candle inside the Session moves the one shared Replay
cursor to that candle's real aggregation-bucket start. Because the cursor is
an exclusive cutoff, the selected candle and every later candle disappear from
all Panes in one existing `goto-exact` Workspace transaction.

Clicks outside available chart data, before the Session start, at/after the
Session end, or at/after the accepted cursor are rejected visibly. The last
accepted cursor, Workspace, and Pane set remain unchanged, and selection mode
stays armed so the user can choose again or cancel it from the transport.

The right side of the transport now exposes the named `Sync timeframe` switch.
It is a one-way preference: when enabled, the Replay step follows the active
Pane TF immediately and after active-Pane focus or TF changes. The step selector
becomes read-only while synchronized. Turning the switch off restores an
independent Replay step. The complete supported fixed-TF set is available:
`1m`, `2m`, `3m`, `4m`, `5m`, `10m`, `15m`, `30m`, `1h`, `2h`, `4h`, `8h`,
and `12h`.

## Ownership

- Chart Adapter alone subscribes to Lightweight Charts `subscribeClick`, owns
  crosshair options, and maps `MouseEventParams.time` back to a projected bar's
  real `startEpochMs` rather than its completion-display timestamp.
- Workspace UI owns only selection presentation and intent dispatch.
- Replay Runtime remains the sole cursor, step, and playback owner.
- Existing Workspace Execution remains the sole all-Pane transaction path;
  truncation does not add another command coordinator or chart writer.
- `Sync timeframe` changes only Replay step selection. It requests no bars,
  issues no Pane transaction, and moves no cursor or Replay revision.

## Existing-Capability Check

Lightweight Charts officially supplies `subscribeClick` and defines
`MouseEventParams.time` as unavailable outside chart data. Those native APIs
are used behind the Chart Adapter. No replay/time-machine implementation in
the maintained awesome-tradingview catalog satisfied the existing owner and
atomic-transaction boundaries, so the visible control remains ordinary DOM in
the Workspace UI.

References:

- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi#subscribeclick
- https://tradingview.github.io/lightweight-charts/docs/api/interfaces/MouseEventParams#time
- https://github.com/tradingview/awesome-tradingview

## Gate

- a pure Harness binds bucket-start targeting plus outside-data, outside-
  Session, and not-yet-revealed rejection;
- the Chart Adapter browser Harness proves a completion-slot click maps back
  to a different real bucket start;
- the mixed-Pane browser Harness proves `Sync timeframe` follows active `1m`
  and `4h` Panes without cursor/Workspace revision changes;
- one real Canvas truncation click increments Replay once and visibly applies
  every Pane, while removing the selected and later bars;
- fixed single/multi-Pane `1440×900` fixtures bind the revised TradingView-like
  icon treatment and named switch without covering either Canvas.

All 38 non-browser and five serial real-Chrome Harnesses pass. The retained
single-Pane performance gate records Next p95 `50.9ms`, p99 `58.1ms`, max
`58.7ms`; ETH→RTH `65ms`, `5m` `138ms`, and `12h` RTH `826ms`; rapid history
loading records zero observed long task.

## R6.8b Visual Follow-Up

The Autoplay speed and Replay-step controls now use the reviewed TradingView-
like text treatment: native dropdown arrows and their reserved space are
removed, and the visible order is speed then step. Both remain native select
controls, so click selection and keyboard access are unchanged. The browser
gate binds computed `appearance: none`, DOM order, and the updated fixed visual
fixtures.
