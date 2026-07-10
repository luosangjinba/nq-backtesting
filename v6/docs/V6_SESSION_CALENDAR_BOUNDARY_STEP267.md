# V6 Session Calendar Boundary - Step 267

## Purpose

Step 267 adds a pure `session-calendar` domain boundary for futures
trading-session bucket semantics.

This step must not enable `1D`, `1W`, or `1M`, and must not connect daily,
weekly, or monthly projection to chart-data runtime behavior.

## Supported Scope

The first version targets the V6 futures instruments currently in product scope:

- `NQ`;
- `ES`.

Both use the same chart-axis trading-session rule for this step:

- trading sessions roll at `18:00` on the chart/data UTC axis;
- `2026-05-31T18:00:00Z` belongs to trading day `2026-06-01`;
- `2026-06-01T17:59:00Z` still belongs to trading day `2026-06-01`;
- `2026-06-01T18:00:00Z` belongs to trading day `2026-06-02`.

Unsupported instruments should fail explicitly instead of falling back to
calendar-day behavior. Silent fallback would make later projection bugs look
valid.

## Public Domain Helpers

`v6/src/session-calendar/session-calendar-domain.js` should expose pure helpers:

- `getTradingDayKey(timestamp, { instrument })`;
- `resolveTradingDayBucket(timestamp, { instrument })`;
- `resolveTradingWeekBucket(timestamp, { instrument })`;
- `resolveTradingMonthBucket(timestamp, { instrument })`.

Each bucket resolver returns stable metadata:

- `instrument`;
- `key`;
- `startTimestamp`;
- `endTimestamp`;
- `unit`.

## Ownership

- `session-calendar` owns trading day/week/month keys and bucket boundaries.
- `chart-data-projection` will later consume session-calendar buckets, but does
  not own their rules.
- `display-timeframe` keeps `1D`, `1W`, and `1M` planned/disabled.
- `replay` remains source-bar driven.
- `shell` must not compute trading session boundaries.

## Acceptance

- Session-calendar helpers are pure and covered by domain smoke tests.
- Monday prior Globex open behavior is covered.
- The `17:59 -> 18:00` trading-day boundary is covered.
- Week and month bucket keys/starts are covered.
- Unsupported instruments fail explicitly.
- `1D`, `1W`, and `1M` remain planned/disabled.
- Runtime behavior is unchanged.
