# V7 Aggregated Bucket Time Labels — R9.4

Status: implemented; human acceptance pending (2026-08-02)

## Request

Aggregated candles must identify the period they represent. A `1h` candle for
`23:00`–`23:59` must therefore show `23:00` under the Crosshair, not its
completion-slot coordinate. The same rule applies to every intraday aggregate.
Daily and larger periods show no clock: `1D` shows its trading date, while
`1W` and `1M` show the trading-period start date.

## Root Cause

V7 intentionally places an aggregate candle at its final eligible source slot.
That stable `displayEpochMs` lets a partial aggregate occupy its final Chart
position without advancing Replay or admitting future source. The Chart
formatter previously rendered that coordinate literally, conflating a safe
rendering coordinate with the bucket's semantic label.

Calendar periods add a second concern. ETH Monday begins Sunday at `18:00` New
York time, so formatting its real start instant as a date can incorrectly show
Sunday. Weekly and monthly labels need the trading-period date chosen by the
calendar owner, not a timezone-derived civil date from either Chart coordinate.

## Binding Decision

- preserve `displayEpochMs` as the only Lightweight Charts series coordinate;
- preserve `startEpochMs` as fixed bucket identity and label instant;
- add one validated `YYYY-MM-DD` `labelDate` to calendar projected bars,
  derived by Calendar Timeframe Domain from the trading-period start;
- resolve label semantics through the adapter's read-only bar index;
- use Lightweight Charts' official `localization.timeFormatter` for Crosshair
  text and `timeScale.tickMarkFormatter` for axis text;
- format fixed labels with the selected Workstation timezone/date/hour policy;
- format calendar labels as timezone-independent dates, never with time;
- fall back to ordinary instant formatting for future-axis whitespace.

This is a presentation correction only. It cannot move a candle, Replay
cursor, visible cutoff, Viewport, source request, or accepted Workspace state.

Official formatter ports were rechecked in the Lightweight Charts
[LocalizationOptions](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/LocalizationOptions)
and [TimeScaleOptions](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/TimeScaleOptions)
documentation. The
[awesome-tradingview catalogue](https://github.com/tradingview/awesome-tradingview)
did not expose a smaller ownership-compatible solution, so no plugin or new
dependency is introduced.

## Evidence

- pure Settings tests cover all date orders, optional weekday, and invalid
  calendar dates;
- fixed/calendar domain tests bind completion coordinate separately from
  bucket-start/trading-period label;
- the real Lightweight Charts browser Harness invokes installed native
  formatter callbacks for `1h`, `4h`, `1D`, `1W`, and `1M`;
- the real V4/DuckDB comparison proves fixed and calendar projected-history
  parity across DST for ETH and RTH;
- Calendar and complete Replay Workspace browser Harnesses pass;
- the 64-action 1/2/4 Pane `4h` latency gate passes with four-Pane warm p50
  `75.2ms`, p95 `123.7ms`, Chart-apply p50/p95 `50.8/87.5ms`, identical Pane
  bar counts, and no browser errors.
- all 81 V7 Harnesses are covered on the final production tree; the intentional
  visual-baseline difference is the target 4h Crosshair change from completion
  `11:59` to bucket start `08:00`.

## Human Gate

After a hard reload, hover representative `1h` and `4h` candles and confirm
their labels show bucket start. Then check `1D` in ETH and RTH, and `1W`/`1M`,
confirming date-only labels and correct trading-period dates. Acceptance remains
pending until the user confirms those visible results.
