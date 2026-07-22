# V7 Future Time-Axis Continuity — R6.9e1

Status: human accepted (2026-07-22)

## Product Result

Every fixed-duration Pane now keeps time labels visible to the right of the
latest real candle. A `1m` Pane advances in one-minute slots, a `4h` Pane in
four-hour slots, and so on. The initial/reset right margin therefore displays
real future clock labels instead of an unlabeled logical void.

## Ownership And No-Future Boundary

Projection provenance carries the selected fixed timeframe duration as a
scalar capability fact. The Lightweight Charts adapter remains the only
series writer and creates one separate, bounded series containing 256
whitespace points after the latest candle display time.

Whitespace points contain only `time`. They contain no open, high, low, close,
volume, source bar, or provider result; they do not change the projected candle
array, Replay cursor, visible-through value, Pane bar count, history boundary,
or Viewport's latest-real-candle index. Crosshair movement over future
whitespace continues to publish the latest real candle OHLC. Replay truncation
cannot select whitespace.

The auxiliary series participates in the same staged visible mutation and
rollback boundary as candles. A stale or failed application restores both the
accepted candle series and the accepted future time-axis points before scale
state is restored.

Calendar-aligned timeframes remain intentionally unsupported until their
registered alignment policy can supply future presentation slots; current V7
production timeframes are fixed-duration.

## Evidence

- Projection Domain binds the fixed duration into immutable provenance and
  history-extension compatibility;
- the Lightweight Chart Adapter browser Harness binds 256 time-only points,
  native time-axis coordinates to the right of the latest candle, latest-OHLC
  Crosshair behavior over whitespace, empty transitions, and stale rollback;
- the Replay Pane Workspace real-Chrome Harness binds single/multi Pane Replay,
  Autoplay/Pause, GoTo, truncation, Sync timeframe, and the changed fixed visual
  baseline;
- the visual baseline shows `12:50` and `13:00` labels to the right of a latest
  `12:42` `1m` candle without adding a future candle.

## Human Acceptance

Review future labels in low and high timeframes, drag into and back from the
future area, and confirm Replay/OHLC remain unchanged. Exact GoTo R6.9h remains
the next product slice after this focused visual gate.

The user accepted the future time-axis interaction and visual result on
2026-07-22 after confirming that no-data future time remains labeled.
