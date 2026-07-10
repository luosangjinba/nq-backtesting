# V6 Monthly Projection Integration - Step 270

## Purpose

Step 270 enables `1M` display projection by connecting chart-data projection to
the Step 267 `session-calendar` monthly bucket boundary.

This step must not add seconds support and must not change replay ownership.

## Scope

- Add a monthly projection path to `chart-data-projection`.
- Consume `resolveTradingMonthBucket()` from `session-calendar`.
- Enable the `1M` display-timeframe capability after projection coverage exists.
- Keep seconds hidden.
- Keep replay source-bar driven.

## Projection Contract

Minute/hour projection remains unchanged and continues to use fixed minute
buckets.

Daily and weekly projection remain unchanged and continue to use
session-calendar trading day/week buckets.

Monthly projection is selected explicitly by display target `1M`. The monthly
path:

- requires an instrument;
- asks `session-calendar` for the trading month bucket for each source bar;
- groups source bars by trading month bucket start;
- emits OHLC bars at the trading month bucket start timestamp;
- marks the bucket complete only when source bars reach the trading month
  bucket end and the cursor is outside that bucket;
- never creates synthetic OHLC bars for missing trading months.

## Ownership

- `session-calendar` owns trading month boundaries.
- `chart-data-projection` owns OHLC aggregation.
- `display-timeframe` owns capability/menu status.
- `replay` remains source-bar driven.
- `shell` dispatches a timeframe command only; it must not compute monthly
  buckets.

## Acceptance

- Monthly projection has domain smoke coverage for month bucket starts,
  month-end rollover, cursor-capped in-progress monthly buckets, and
  unsupported instruments.
- `1M` is enabled only after the projection path is covered.
- Seconds remain hidden.
- Existing minute/hour, daily, and weekly projection tests continue to pass.
- Browser coverage proves selecting `1M` applies monthly projection through
  display-timeframe and chart-data projection.
