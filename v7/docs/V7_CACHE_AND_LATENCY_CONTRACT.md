# V7 Cache, Latency, And Atomic Refresh Contract

Status: binding foundation interaction standard (2026-07-19)

## Measurement Classes

Latency is measured from accepted foreground-browser input to browser-visible
completion. Production builds use `performance.now()` and report at least 100
representative samples with p95, p99, and maximum. Machine, browser, pane count,
loaded-bar count, cache class, and provider delay are recorded with results.

Provider/network time is not hidden inside local-runtime latency. A cache miss
is measured as:

```text
feedback latency + observed provider latency + post-response visible latency
```

Provider requests also have a declared failure deadline (3,000 ms in the
foundation reference contract). The deadline ends an unavailable request; it
is not an artificial delay and does not define acceptable normal performance.

No production path introduces a synthetic delay. Simulated delay exists only
in deterministic reordering/cancellation harnesses.

The machine-readable thresholds are in `v7-cache-latency-contract.json`.
Thresholds are regression gates, not permission to intentionally wait until the
limit.

## Manual Next And Auto Replay

Warm-cache Manual Next targets imperceptible visible completion: p95 at 100 ms,
p99 at 150 ms, and no accepted foreground sample above 250 ms on the declared
reference workload. Cursor, bars, wall movement, and control completion are one
visible transaction.

Auto Replay uses exactly the same advancement transaction. It never overlaps
advances, samples one bar per step interval, skips intermediate bars, or races
to catch up. If data is unavailable, playback waits behind a bounded refresh
gate; it does not move the cursor invisibly. Active-tab scheduler drift is
measured separately from projection/application work.

## TF And ETH/RTH Refresh

On a TF or ETH/RTH intent:

1. retain the last accepted candles and viewport;
2. enter the dimmed/stale refresh state within the feedback budget;
3. acquire raw bars only when cache coverage is insufficient;
4. project the complete target snapshot;
5. atomically replace the pane/workspace once;
6. remove the refresh state only after browser-visible completion.

The chart never clears to an empty series and never exposes a partially rebuilt
target. A cache hit has an end-to-end budget. A cache miss has an immediate
feedback budget and a separate post-provider-response budget.

The accepted toolbar subtree and its visual opacity remain stable across that
refresh boundary. Transaction-conflicting inputs may be functionally locked,
but the lock must not produce a toolbar flash; intrinsically unavailable
controls retain their disabled presentation.

## Earlier-History Extension

Visible-range proximity is only an explicit request trigger. Correctness never
depends on another wheel, mouse, resize, or retry event.

Earlier history is requested in bounded contiguous chunks. Each accepted chunk
is prepended atomically while preserving the logical anchor and viewport. The
target chunk covers at least two current visible ranges when provider limits
permit, plus a one-visible-range safety buffer. If more coverage is needed, the
runtime schedules the next chunk automatically within the continuation budget.

A timeframe-aware nominal window is retained when it contains any eligible
source minute. If the whole nominal window falls inside an RTH close, the
request planner expands that same request backward until it contains up to 240
eligible source minutes or reaches the 35-day foreground cap. Overnight and
weekend closures therefore require one accepted request rather than repeated
empty requests. The provider still returns only real source bars; the planner
does not synthesize bars, start a recursive foreground chain, or move Replay.
If no earlier eligible data exists within the hard cap, the accepted Pane and
its canonical manual Viewport remain unchanged.

Bar-by-bar visible history repair is forbidden. Large datasets may appear in a
small number of fast atomic blocks when one bounded request cannot cover the
target.

History projection cost must not grow with every already accepted raw chunk.
Projection reprocesses the new chunk plus one adjacent boundary chunk and owns
the aggregate-boundary/tail merge. A large logical V4 request may use smaller
contiguous transport chunks; the adapter yields between chunks and returns one
validated Raw Batch under the original exact request identity. Transport
chunking is responsiveness policy, not new cache or Replay identity.

The official Lightweight Charts infinite-history pattern confirms that visible
logical-range subscriptions and `barsInLogicalRange` can trigger proactive
history requests. `setData` supports whole ordered snapshot replacement and
`update` supports current-tail updates. V7 owns the request, transaction,
chunking, and visibility semantics; chart callbacks do not become data owners.

## Raw Bar Cache

Only Bar Data Runtime owns raw cache entries and in-flight request coalescing.
The cache is independent of active Session state. Its complete identity contains
provider, instrument, source resolution, bounded window, and dataset revision.

Raw cache may hold bars beyond the Replay cursor for responsiveness; Projection
still enforces no-future visibility. Cache contents never advance Replay or
write Chart state. Bounded eviction affects performance only, not correctness.

The one-pane foundation quantizes foreground coverage into bounded 500-source-
minute windows. Chart entry acquires only the first bounded window, not the
Session range. Manual Next and projection replacements reuse that exact Bar
Data identity while the target remains covered; crossing a boundary acquires a
new bounded window. Future raw bars in the window remain invisible until the
exclusive Replay cursor admits them.

Replay prefetch maintains contiguous raw coverage ahead of the cursor using
high/low watermarks and provider request limits. TF and ETH/RTH reuse compatible
raw coverage and re-project it; they do not require duplicate network requests
for each display mode.
