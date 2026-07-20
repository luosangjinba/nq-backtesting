# V7 Fixed-Timeframe Domain

Status: R5.3 pure fixed-duration projection complete (2026-07-20)

## Ownership

`core.fixed-timeframe-domain` is a pure policy implementation owned by the
Projection Domain boundary. It resolves canonical fixed-duration bucket starts
and aggregates already-eligible, ordered source bars into immutable OHLCV
display bars.

It performs no provider I/O, cache mutation, Replay mutation, workspace
coordination, chart write, viewport change, persistence, DOM work, or UI
selection. It contains no concrete timeframe-id branches.

## Ecosystem Decision

Lightweight Charts does not aggregate source bars. Its `setData` contract takes
an ordered array and replaces the old series, while its time model processes
timestamps as UTC. V7 must therefore provide ordered, already-projected bars at
the adapter boundary and retain source wall-clock interpretation in its domain
owners. See the official [ISeriesApi documentation](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi)
and [time-zone documentation](https://tradingview.github.io/lightweight-charts/docs/time-zones).

The [awesome-tradingview catalogue](https://github.com/tradingview/awesome-tradingview)
lists chart libraries, plugins, wrappers, and indicator projects but no official
Replay-safe source-to-display OHLC aggregation owner. No third-party runtime is
introduced for this boundary.

## Fixed Alignment Contract

Every policy declares:

- an opaque aggregation-policy id and exact revision;
- target `durationMs`;
- source `sourceDurationMs`;
- canonical `offsetMs`, smaller than the target duration and aligned to the
  source duration.

The bucket formula is:

```text
floor((sourceStart - offset) / duration) * duration + offset
```

The origin is never a Session start, Replay start, request-window start, or
cursor value. This prevents old and newly projected history from acquiring
different grids. Ordinary fixed periods use offset zero. The inherited V6
target-history convention for a four-hour policy is represented by a configured
two-hour offset; no production code branches on a `4h` id.

Examples locked by the Harness:

- a `09:30` source bar belongs to the zero-offset one-hour `09:00` bucket;
- a `19:00` source bar belongs to the two-hour-offset four-hour `18:00`
  bucket.

Calendar periods such as day/week/month do not use this policy. They require a
separate registered calendar-alignment policy.

## Aggregation Contract

- input must be non-empty, strictly ordered, unique, source-grid aligned, and
  valid OHLCV;
- source gaps stay gaps and never generate synthetic bars;
- each supplied eligible source bar contributes to exactly one bucket;
- output open is the first source open, high/low are the extrema, close is the
  last source close;
- volume is summed only when every contributing source volume is known;
  otherwise output volume is `null`;
- an incomplete current bucket is valid because Projection Domain first removes
  every source bar at or beyond the exclusive Replay cursor;
- output bars and arrays are immutable and strictly ordered.

`createFixedDurationAggregationPolicy` returns the exact frozen deterministic
port expected by Projection Domain and verifies the selected
`TimeframeDefinition`, policy revision, duration, and source resolution on each
call. Interleaved policy instances share no mutable state. An old policy id
cannot satisfy a newly selected timeframe definition, while the existing
workspace transaction currency gate remains responsible for rejecting late
completed work.

## Gate

`tests/fixed-timeframe-domain-harness.js` proves direct OHLCV aggregation,
partial active buckets, null-volume propagation, canonical one-hour/four-hour
alignment, Projection integration, Session Hours eligibility before
aggregation, exclusive no-future filtering, immutable interleaved policy
isolation, absence of concrete capability-id branches, and 19 negative
controls.
