# Session 2026-07-28 — Single-Pass Dense History Fill

Status: superseded by the screenshot-scale projected-history correction in
`session_20260728_projected_dense_history_fill.md`

## Context

The branch was explicitly reset to `5077c13e`, removing the consolidated
`77b2714a` experiment. The user then requested a fresh correction for the dense
history rebound with a stricter product requirement: one drag should fill the
current Canvas left boundary in one visible operation, not paint a sequence of
history blocks, and acquisition should be as fast as safely possible.

## Cause

Two independent behaviors produced the visible defect:

- the adapter translated every partially negative manual logical range to
  begin at `-0.5`; after prepend, that discarded the remaining whitespace and
  moved the candle previously under the pointer;
- history requested a fixed-size window. Repeated gestures or an automatic
  continuation were then needed when a dense native range exposed more space
  than that window contributed.

## Correction

The Chart Adapter now retains a partially negative manual range exactly. If
`N` candles are prepended, both endpoints advance by `N`, which preserves the
screen coordinate of every already-visible candle. Only a range wholly before
loaded data is translated back to `{-0.5, -0.5 + span}`.

A focused history-fill helper reads the adapter's immutable
`{barCount, logicalRange}` state and calculates one target:

```text
max(240, ceil(24 - logicalFrom)) display bars
```

The market planner then walks fixed-duration buckets backward under the actual
ETH/RTH eligibility policy until that target is covered, bounded at 210 days.
Workspace Execution submits one history transaction with delayed dim feedback
disabled. There is no post-commit continuation. The V4 adapter may transport
the single logical request as ordered seven-day parts, but an adapter-wide
two-transfer pool hides those parts behind one Raw Batch, one Projection, one
Workspace revision, and one chart `setData()`.

## External Capability Check

Lightweight Charts has no bulk prepend operation. `setData()` replaces the
ordered series, while `update(..., historicalUpdate)` changes one historical
point and the official API warns that historical updates are slower. The
official infinite-history example likewise combines earlier data and calls
`setData()`. The awesome-tradingview catalogue contains no preferable prepend
plugin, so the fill plan remains inside V7's existing owner boundaries.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://github.com/tradingview/lightweight-charts/discussions/1341>
- <https://github.com/tradingview/awesome-tradingview>

## Evidence

- focused gap/window tests prove exact negative-gap sizing, ETH/RTH bucket-aware
  expansion, the 210-day stop, and malformed-state rejection;
- the adapter browser gate proves a partially covered range stays exact and a
  wholly stranded range still recovers without span collapse;
- the V4 adapter gate proves the logical request uses at most two simultaneous
  internal transfers and returns one exact batch;
- real Chrome on a dense `8h` wall records exactly one Workspace revision,
  `796` final candles, logical `from=115.139`, minimum Canvas opacity `1`, only
  `ready` view states, zero observed long task, and a `208.2ms` maximum sampled
  event-loop interval;
- the same run finishes the single fill in about `2.42s` while retained
  100-step Replay evidence remains p95 `64.95ms`, p99 `76.45ms`, max `78.27ms`.

Automated evidence cannot grant interaction acceptance. Manually repeat the
dense left-history drag and judge anchor stability, absence of block flashes,
and perceived wait time before accepting R7.3j.

## Follow-up Finding

Human review exposed a larger case than this gate modeled: a `4h` wall could
contain several thousand logical slots of whitespace. The 210-day raw-source
bound eventually returned one partial fill, so the result was delayed and still
did not reach the Canvas edge. R7.3k replaces that high-timeframe path; the
original evidence above remains historical and is not the current acceptance
claim.
