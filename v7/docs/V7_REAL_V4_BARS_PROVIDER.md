# V7 Real V4 Bars Provider

Status: R5.6 implemented, awaiting human chart review (2026-07-20)

## Outcome

The visible V7 workspace now reads real local NQ one-minute OHLCV through the
existing V4 `/v4/bars` service backed by `v4/data/trading_data.duckdb`.
Production no longer generates sine-wave prices, pseudo-random candles, or
artificial wicks, and it has no silent synthetic fallback.

## Time Boundary

Session records contain real browser-local instants. V4 accepts timezone-naive
New York exchange-wall strings and returns those wall fields encoded as
UTC-like epoch seconds. The concrete adapter therefore owns both conversions:

1. real request instants become `America/New_York` wall-minute strings;
2. returned UTC-like wall fields become real instants before entering the V7
   provider-neutral Raw Bar contract.

Session Hours continues to evaluate real bar instants through its existing
exchange-wall adapter. No core owner knows the V4 wire encoding, and no second
timezone conversion is applied to V4's wall fields themselves.

The chart adapter presents those real instants in `America/New_York`. This is a
presentation-only conversion: it restores the accepted V6 exchange-wall labels
such as RTH `09:30–16:14` without changing Raw Bar identity, Session request
instants, Projection provenance, or Replay's exclusive cursor.

## Request And Failure Semantics

- raw requests remain half-open and Session-independent;
- the V4 API's automatic 19-bar padding is removed at the adapter boundary;
- the provider policy limits one request to 45 days, 65,000 bars, two concurrent
  attempts, a three-second attempt deadline, and one bounded retry;
- HTTP/network failures become stable provider failures;
- initial service failure shows Chart unavailable and never substitutes fake
  candles;
- Bar Data Runtime remains the only requester/cache owner, and the
  Lightweight Charts adapter remains the only chart-series writer.

## Verification

- the independent adapter harness proves DST-aware request conversion,
  response conversion, padding removal, exact identity, coverage, and failure;
- a live local probe returned exactly the requested 121 NQ bars for the V6
  entry baseline;
- the real-Chrome workspace harness proves entry, Next bar, TF/ETH-RTH atomic
  replacement, manual/reset wall, and repeated left history against real data;
- fixed visual fixtures now contain actual DuckDB NQ candles.

Human comparison with V6/TradingView remains required before this visual gate
is accepted.
