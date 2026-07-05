# Replay Visible Latency

## Purpose

V6 must not repeat the V5 K-line appearance delay problem.

Replay performance is measured by user-visible candle appearance, not only by
runtime command completion, cursor state mutation, or event emission.

## V5 Lesson

V5 found that data loading was not always the bottleneck. A replay `Next` could
advance runtime state quickly while the user still perceived delayed candle
appearance because chart host synchronization, replacement paths, observer
timing, or pane fan-out delayed the visible update.

V6 must build a latency harness before broad feature work, so regressions are
caught at the product boundary: input -> candle visible.

## Metric

Primary metric:

```text
latencyMs = timestamp(candle visible on chart) - timestamp(user replay input)
```

Replay input means:

- Next button click;
- keyboard Next;
- Play timer tick;
- coalesced rapid Next batch input.

Candle visible means the chart engine has rendered or exposed metadata proving
the latest replay candle reached the target cursor on screen. Runtime
`cursorTimestamp` alone is insufficient.

## Data Latency Separation

Database/API speed can affect replay only when the next replay bar is not
already available in memory. It must not be allowed to explain delayed display
for already-buffered bars.

V6 must measure these phases separately:

```text
input -> replay command received
replay command received -> bar available
bar available -> chart data append/update requested
chart data append/update requested -> candle visible
```

Additional data-path metrics:

- bar cache hit/miss;
- API request start/end;
- database query start/end when available;
- returned bar count;
- forward buffer size before and after Next/Play.

Rules:

- Normal Play/Next should consume an in-memory forward buffer.
- If the forward buffer is low, bar data runtime should prefetch asynchronously
  ahead of the visible replay path.
- A cache miss may be slower, but it must be reported as data latency, not
  hidden as chart/render latency.
- Once `bar available` is true, visible candle latency must still meet the V6
  threshold.
- Browser latency tests must include a no-fetch path and fail if visible
  updates are delayed while `forwardRequestDelta` is zero.

## Gates

Initial V6 single-pane gates:

- p95 visible latency for single Next should stay under `100ms`;
- automation guard threshold is `120ms`;
- cadence test uses `click -> candle visible -> 50ms gap -> next click`;
- no forward fetch should be caused solely by viewport follow/wall projection;
- append/update fast path is preferred, but correctness of viewport intent is
  not allowed to depend on append path.
- cache-hit visible latency and cache-miss data latency are reported
  separately.

Multi-pane gates are deferred until after the single-pane manual wall gate
passes, but the same measurement rule applies: use visible candle timing, not
only runtime update timing.

## Required Harness Shape

The browser smoke must:

- start a real V6 chart page;
- create a replay session with deterministic bars;
- click Next repeatedly;
- observe chart metadata or pixels until the target candle is visible;
- record latency samples and summary stats;
- fail when any sample exceeds the automation threshold;
- assert the forward request count does not increase on the visible update
  path unless the next bar was genuinely missing from cache.
- emit enough phase timings to identify whether a failure came from data fetch,
  replay state, chart data application, viewport projection, or actual paint.

## Forbidden

- Treating `replay.next` command resolution as candle visibility.
- Treating `cursorTimestamp` text update as candle visibility.
- Hiding delayed chart replacement behind optimistic UI state.
- Adding viewport-intent correctness by forcing full `setData()` replacement on
  every Next.
- Deferring visible latency tests until after multi-pane or Settings work.
- Blaming database speed for delayed display when the target bar was already
  cached or included in the forward buffer.

## Acceptance Before V6 Feature Expansion

Before V6 proceeds beyond the single-pane replay milestone:

- default wall Next latency browser smoke passes;
- manual wall Next latency browser smoke passes;
- rapid Next cadence browser smoke passes;
- Play cadence uses the same visible-candle observation path.
