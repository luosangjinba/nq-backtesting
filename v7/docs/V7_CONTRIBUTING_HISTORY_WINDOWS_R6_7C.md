# V7 Session-Aware Contributing History Windows — R6.7c

Status: human-accepted (2026-07-21)

## Reproduction

In RTH, drag older candles until the left boundary reaches `09:30`. The opening
candle can jump back to the Canvas edge. About five more drags are needed before
the prior trading day appears, and the behavior repeats at each daily boundary.

## Cause

The one-minute history target was 240 source minutes, interpreted as 240
wall-clock minutes. An RTH overnight close is much longer, so a complete
request could contain no eligible display candle. Its raw coverage was valid
and advanced, but repeated non-contributing transactions were required to
reach the prior session. Each transaction also had to reapply the transient
left-edge clamp, producing the visible snap.

## Correction

The market-composition request planner now keeps a nominal timeframe-aware
window unchanged whenever it contains an eligible source minute. Only a wholly
closed nominal window expands backward until it includes up to 240 eligible
minutes or reaches the existing 35-day foreground cap.

This remains one exact raw request and one Workspace transaction. Bar Data is
still the sole requester/cache owner; Session Hours only supplies eligibility;
Projection still filters and aggregates actual provider bars; Replay and Chart
owners are unchanged. The planner never manufactures a candle or starts a
recursive continuation chain.

## Gate

- Tuesday `2026-04-28 09:30 EDT` produces one window beginning Monday
  `2026-04-27 12:15 EDT`;
- Monday `2026-05-04 09:30 EDT` produces one window beginning Friday
  `2026-05-01 12:15 EDT`;
- the exact two-Pane real-Chrome flow requires the first accepted RTH history
  transaction at the opening boundary to prepend at least 200 candles;
- rapid alternating Pane drags, two-to-one replacement, normal Viewport span,
  Session Hours controls, and ETH recovery remain regression-protected.

All 37 non-browser and five serial real-Chrome Harnesses pass. The retained
performance gate records Next p95 `66.8ms`, p99 `70.0ms`, max `103.8ms`,
ETH→RTH `60ms`, `5m` `167ms`, `12h` RTH `957ms`, and zero observed long task
during rapid history loading.
