# V7 Replay Four-Hour Cap And Latency — R9.1

Date: 2026-08-01
Status: implemented and executable; human acceptance pending

## Product Decision

Replay step choices stop at `4h`: `1m`, `2m`, `3m`, `4m`, `5m`, `10m`,
`15m`, `30m`, `1h`, `2h`, and `4h`. Display timeframes remain independent and
continue through fixed `8h`/`12h` plus calendar `1D`/`1W`/`1M`.

When Sync timeframe is enabled, a display timeframe with its own registered
Replay step selects that step. Any higher display timeframe selects the maximum
registered Replay step, currently `4h`. The mapping is derived from capability
registration order and does not branch on concrete timeframe ids. Changing the
Replay step still does not move the cursor or issue a Pane transaction.

This decision follows the requested FXReplay interaction model as observed by
the user. It does not claim an externally documented FXReplay contract.

## Four-Hour Bulk-Reveal Profile

A `4h` Replay step on a `1m` Pane admits up to 240 real intermediate candles in
one atomic transaction. This differs from the ordinary one-candle Manual Next
reference workload. The machine contract therefore binds a separate bulk-
reveal profile while retaining the original Chart-commit budget:

- at least 128 total samples and 100 warm-cache samples;
- warm-cache visible p95 `<250ms`, p99 `<350ms`, maximum `<500ms`;
- Chart commit p95 `<100ms`, p99 `<150ms`, maximum `<250ms`;
- at most five provider requests per 128 advances, reported outside the local
  cache-hit budget;
- every intermediate bar, one visible commit, and no-future projection remain
  mandatory.

## Runtime Corrections

Replay steps above `1h` plan a duration-derived 64-step forward buffer. The
`4h` wall is therefore 15,360 source minutes, about 10.7 calendar days, still
well inside the existing bounded 35-day foreground request ceiling. Replay
steps of `1h` and below retain the prior 500-source-minute request cadence.

Bar Data Runtime now returns the already-validated immutable batch when an
accepted coverage window has the exact requested identity. Contained or
composed coverage still follows the full reconstruction and validation path.

Projection Domain brands snapshots it produced after normalizing every new
bar. Chart application recognizes that unforgeable in-process identity and
does not normalize the complete historical prefix again; injected/unbranded
snapshots still receive the full boundary validation.

The Chart adapter reuses the unchanged projected prefix while converting only
the new tail. A multi-bar forward reveal uses one `setData()` append-replacement
and a two-frame observable series-change proof. It deliberately does not call
`series.update()` 240 times: the official Lightweight Charts API defines
`update()` as a latest-point operation, while `setData()` replaces an ordered
series ([realtime updates](https://tradingview.github.io/lightweight-charts/tutorials/demos/realtime-updates),
[ISeriesApi](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi)).

## Measured Evidence

The unchanged baseline ran 100 `4h` Next actions on a `1m` NQ Pane ending at
22,160 displayed bars. All actions used full replacement, 51 actions requested
provider data, warm-cache visible p95 was about `331ms`, and cache-miss visible
p95 was about `898ms`.

The final executable run used 128 actions and ended at 28,100 bars:

- 125 warm-cache samples and three provider requests;
- warm-cache visible p50 `125.8ms`, p95 `210.8ms`, p99 `261.6ms`, maximum
  `270.3ms`;
- Chart apply p95 `84.5ms`, p99 `94.9ms`, maximum `102.9ms`;
- every action used one `append-replace` visible mutation;
- no browser error and all intermediate bars remained present.

H080 is executable and remains pending the user's direct interaction review.

## Acceptance Gate

After a hard reload, select Replay `4h` on a `1m` Pane and rapidly click Next
for a sustained sequence. Candles should track the click sequence without the
old recurring fetch pause. Confirm the Replay selector contains no `8h`, `12h`,
or calendar choices. Then enable Sync timeframe on an `8h`, `12h`, or calendar
Pane and confirm Replay remains `4h` without moving the cursor.
