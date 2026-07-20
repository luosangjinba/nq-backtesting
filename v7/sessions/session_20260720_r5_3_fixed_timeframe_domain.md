# V7 R5.3 Fixed-Timeframe Domain — 2026-07-20

## Outcome

Completed generic fixed-duration alignment and OHLCV aggregation behind the
existing Projection Domain policy port. Fixed grids cannot drift with Session,
Replay, cursor, or request-window origins.

## Boundary

Added dependency-free `core.fixed-timeframe-domain`. It contains no concrete
timeframe ids and adds no UI, runtime selection, Replay/Bar Data/chart mutation,
provider I/O, persistence, multi-pane, or calendar-period behavior.

## Ecosystem Review

Official Lightweight Charts documentation confirms `setData` consumes ordered
prepared series data and the library does not own exchange timezone processing.
The awesome-tradingview catalogue provides no official Replay-safe OHLC
aggregation owner suitable for this boundary. The pure V7 policy remains the
appropriate owner.

## Evidence

- independent fixed-timeframe Harness with 19 negative controls;
- Projection integration proving eligibility before aggregation and exclusive
  partial-bucket behavior;
- canonical `1h` whole-hour and configured `4h` two-hour-offset fixtures;
- immutable interleaved policy isolation and stale policy-id rejection;
- full V7 Harness suite, architecture/source-quality gates, and
  `git diff --check`.

This headless step changes no browser interaction or visuals, so automated
acceptance applies. Exact next step is R5.4 headless atomic
timeframe/Session-Hours replacement.
