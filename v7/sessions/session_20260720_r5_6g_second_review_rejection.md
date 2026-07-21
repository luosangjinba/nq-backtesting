# Session — R5.6g Second Human Review Rejection

Date: 2026-07-20
Status: rejected; corrective implementation required

## Human Evidence

The combined R5.6 corrective gate did not pass its second human review:

1. Higher-timeframe aggregation and chart dragging can stall for approximately
   20 seconds, worsening with timeframe duration until dragging is effectively
   unavailable. This is the highest-priority failure.
2. In RTH, `4m` completion slots appear at `:01/:05/:09/...`; `1h`, `2h`,
   `4h`, `8h`, and `12h` appear at `:29`. The accepted product expectation is
   one shared exchange-clock completion grid rather than an RTH-open-anchored
   grid.
3. Entering Session start `12:40` produced a last initial New York chart candle
   at `15:40`. The creation field must represent New York exchange wall time,
   not the browser's Pacific wall time.
4. Switching from a low timeframe to a high timeframe compresses candles and
   leaves missing context against the left chart boundary until another mouse
   action triggers history loading.
5. ETH→RTH replacement remains perceptibly slow.

## Ownership Constraints

- Bar Data Runtime remains the only raw requester/cache owner.
- Projection Domain remains the only eligibility/aggregation owner.
- Chart Adapter remains the only series writer.
- Viewport Runtime remains the canonical wall-intent owner.
- Session creation time-zone interpretation belongs to the Calendar Surface
  value boundary configured by Session Browser, not the provider adapter.
- R6 remains blocked until this gate is corrected and explicitly accepted.

## Required Evidence Before Re-Review

- real-browser phase timings for high-TF switch, ETH→RTH, and high-TF left
  history extension;
- no recursive pointer-independent history request loop after a replacement;
- automatic left-context fill without a second pointer action;
- RTH and ETH completion-slot fixtures for minute and hour families;
- browser-timezone-independent New York Session input round-trip;
- complete V7 Harness suite and `git diff --check`.
