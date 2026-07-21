# Session — R6.7c Session-Aware Contributing History Windows

Date: 2026-07-21
Status: human-accepted

## Review Input

The user found that an RTH `09:30` candle snapped back to the Canvas left edge
and the prior trading day appeared only after roughly five additional drags.
The same behavior repeated at every daily boundary.

## Delivered

- identified the 240-wall-minute request as shorter than the overnight RTH
  closure;
- retained every nominal history window that already contributes an eligible
  minute;
- expanded only a wholly closed window, in the same bounded request, until it
  includes up to 240 eligible minutes or reaches the existing 35-day cap;
- added exact overnight/weekend planner fixtures and the two-Pane browser
  invariant that one accepted boundary transaction prepends at least 200 bars;
- preserved real-provider-only bars, incremental Projection, Replay position,
  manual Viewport span, and all owner boundaries.

## Evidence

- all 37 non-browser Harnesses pass;
- all five browser Harnesses pass serially, including exact request-planner
  assertions and the one-accepted-transaction RTH browser invariant;
- the single-Pane gate records 100 Next samples at p95 `66.8ms`, p99 `70.0ms`,
  and max `103.8ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `60ms`, `167ms`, and `957ms`;
- rapid history completes in about `2251ms`, with zero observed long task;
- architecture, source-quality, visual fixtures, and `git diff --check` pass.

## Next Review Boundary

In RTH, drag to a `09:30` left boundary and continue once. The previous trading
session should load in that transaction without repeated empty loads, boundary
snap-back, oversized candles, or wheel repair. Repeat across a weekend, then
verify two-to-one Pane replacement and ETH recovery.

The user confirmed this defect fixed on 2026-07-21. A separate, non-blocking
toolbar-opacity flash observed during candle refresh is owned by R6.7d.
