# Step 435 - Blank-Area Time Axis

Date: 2026-07-14

## Outcome

The chart now shows timeframe-aware time labels in the blank area to the right
of the latest candle. The implementation uses official Lightweight Charts
whitespace data: points contain only `time`, never OHLC values.

## Ownership Decision

- `time-axis-scaffold.js` calculates a bounded 32-point scaffold for fixed,
  daily, weekly, and monthly display timeframes.
- The Lightweight Charts adapter appends that scaffold only when writing the
  rendered series.
- Chart-data runtime remains the sole owner of real bars; Replay runtime remains
  the sole owner of cursor and reveal state.
- Display-timeframe changes reach the chart surface through the pane event and
  its explicit API. UI code does not write the series.
- Because trailing whitespace makes a later real candle older than the current
  series tail, adapter updates rebuild the rendered series with `setData` rather
  than calling `series.update`.

## Commits

- `5403e25d feat(v6): define time axis whitespace scaffold`
- `72d7993a feat(v6): render time labels across blank chart area`

## Verification

- scaffold domain smoke covers 1m, 4h, 1D, 1W, and 1M progression;
- adapter, host-manager, chart-surface, event-bridge, and boundary smokes pass;
- browser smoke proves adapter count is real bars plus 32 whitespace points,
  while chart runtime retains only OHLC bars and latest timestamp does not pass
  the Replay cursor;
- display-timeframe, Go-to/fixed-timeframe alignment, manual-next Replay, and
  reset-view browser regressions pass;
- product baseline screenshot visibly shows `09:35` and `09:40` labels after
  the latest `09:30` candle without drawing future candles;
- `git diff --check` passes.

## References

- Lightweight Charts series types document Candlestick data as accepting
  `CandlestickData` or `WhitespaceData`.
- Lightweight Charts `WhitespaceData` API defines the point as time-only.

## Human Acceptance Target

Check 1m, intraday high timeframes, 1D, 1W, and 1M on Windows; confirm blank
area labels remain aligned after timeframe switch, drag, Go-to, Replay step,
and reset view, and confirm crosshair over blank space does not display a fake
OHLC bar.
