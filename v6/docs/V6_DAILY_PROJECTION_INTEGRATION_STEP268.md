# V6 Daily Projection Integration - Step 268

## Purpose

Step 268 enables `1D` display projection by connecting chart-data projection to
the Step 267 `session-calendar` daily bucket boundary.

This step must not enable `1W` or `1M`, must not add seconds support, and must
not change replay ownership.

## Scope

- Add a daily projection path to `chart-data-projection`.
- Consume `resolveTradingDayBucket()` from `session-calendar`.
- Enable the `1D` display-timeframe capability after projection coverage exists.
- Keep `1W` and `1M` planned/disabled.
- Keep replay source-bar driven.

## Projection Contract

Minute/hour projection remains unchanged and continues to use fixed minute
buckets.

Daily projection is selected explicitly by display target `1D` or equivalent
session-calendar projection metadata. The daily path:

- requires an instrument;
- asks `session-calendar` for the trading day bucket for each source bar;
- groups source bars by trading day bucket start;
- emits OHLC bars at the trading day bucket start timestamp;
- marks the bucket complete only when source bars reach the trading day bucket
  end and the cursor is outside that bucket;
- never creates synthetic OHLC bars for missing trading days.

## Ownership

- `session-calendar` owns trading day boundaries.
- `chart-data-projection` owns OHLC aggregation.
- `display-timeframe` owns capability/menu status.
- `replay` remains source-bar driven.
- `shell` dispatches a timeframe command only; it must not compute daily
  buckets.

## Acceptance

- Daily projection has domain smoke coverage for the prior Globex open,
  `17:59 -> 18:00` day rollover, cursor-capped in-progress daily buckets, and
  unsupported instruments.
- `1D` is enabled only after the projection path is covered.
- `1W` and `1M` remain planned/disabled.
- Existing minute/hour projection tests continue to pass.
- Browser coverage proves selecting `1D` applies daily projection through
  display-timeframe and chart-data projection.
