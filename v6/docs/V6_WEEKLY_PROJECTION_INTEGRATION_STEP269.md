# V6 Weekly Projection Integration - Step 269

## Purpose

Step 269 enables `1W` display projection by connecting chart-data projection to
the Step 267 `session-calendar` weekly bucket boundary.

This step must not enable `1M`, must not add seconds support, and must not
change replay ownership.

## Scope

- Add a weekly projection path to `chart-data-projection`.
- Consume `resolveTradingWeekBucket()` from `session-calendar`.
- Enable the `1W` display-timeframe capability after projection coverage exists.
- Keep `1M` planned/disabled.
- Keep seconds hidden.
- Keep replay source-bar driven.

## Projection Contract

Minute/hour projection remains unchanged and continues to use fixed minute
buckets.

Daily projection remains unchanged and continues to use trading day buckets.

Weekly projection is selected explicitly by display target `1W`. The weekly
path:

- requires an instrument;
- asks `session-calendar` for the trading week bucket for each source bar;
- groups source bars by trading week bucket start;
- emits OHLC bars at the trading week bucket start timestamp;
- marks the bucket complete only when source bars reach the trading week bucket
  end and the cursor is outside that bucket;
- never creates synthetic OHLC bars for missing trading weeks.

## Ownership

- `session-calendar` owns trading week boundaries.
- `chart-data-projection` owns OHLC aggregation.
- `display-timeframe` owns capability/menu status.
- `replay` remains source-bar driven.
- `shell` dispatches a timeframe command only; it must not compute weekly
  buckets.

## Acceptance

- Weekly projection has domain smoke coverage for the Sunday prior Globex open,
  Monday trading week key, cursor-capped in-progress weekly buckets, and
  unsupported instruments.
- `1W` is enabled only after the projection path is covered.
- `1M` remains planned/disabled.
- Existing minute/hour and daily projection tests continue to pass.
- Browser coverage proves selecting `1W` applies weekly projection through
  display-timeframe and chart-data projection.
